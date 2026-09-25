import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import z from "zod"
import { Provider } from "@/provider/provider"
import { Log } from "@/util/log"

/**
 * Keeps a turn alive when a free lane dies mid-stream.
 *
 * The retry path in `SessionProcessor` re-sends the request to the *same*
 * model, so a 504 idle timeout or an upstream reset from a free provider ended
 * the turn outright - the exact failure mode that made the free routers feel
 * unusable. This resolves the next free model from the generated catalog and
 * lets the processor replay the request there instead.
 *
 * Free-only is enforced twice: the catalog generator only emits free models,
 * and every candidate is re-checked against the provider's own cost data
 * before it is used, so a paid model can never be reached by accident.
 *
 * Cooldowns are shared with the TUI through `free-rotate-state.json`, so the
 * hint in the taskbar agrees with what the server is actually doing.
 */
export namespace SessionModelRotate {
  const log = Log.create({ service: "session.model-rotate" })

  const CFG = path.join(os.homedir(), ".config", "opencode")
  const CATALOG_PATH = path.join(CFG, "arena-models.json")
  const STATE_PATH = path.join(CFG, "free-rotate-state.json")

  const MODEL_COOLDOWN_MS = 5 * 60 * 1000
  const PROVIDER_COOLDOWN_MS = 20 * 60 * 1000
  const MAX_SWAPS = 3
  const MAX_CANDIDATES = 64

  // Combo routers first (they self-route), then the single-model lanes.
  const PROVIDER_RANK: Record<string, number> = { "9router": 0, kilo: 1, opencode: 2, openrouter: 3 }

  // Not chat models, not useful to an agent, or entries that are not free at
  // all (`/auto` routers bill against whatever they pick).
  const DENY = [
    /\/auto$/i,
    /cooldown/i,
    /content-safety/i,
    /-safety$/i,
    /moderation/i,
    /embed/i,
    /rerank/i,
    /whisper/i,
    /tts/i,
  ]

  // A lane is broken, not merely refusing us.
  const ROTATE_PATTERN =
    /(?:\b(?:429|500|502|503|504|529)\b)|rate.?limit|too.?many.?requests|overload|capacity|quota|exhausted|upstream|idle.?timeout|timed?.?out|timeout|econn|enotfound|fetch.?failed|network.?error|socket|stream.?error|provider.?request.?failed|bad.?gateway|service.?unavailable|internal.?server.?error|connection.?reset|premature|broken.?pipe/i

  // Only an unreachable host cools the whole lane. A 504 is the upstream being
  // slow, and cooling both providers over it removed the whole rotation.
  const PROVIDER_DEAD_PATTERN = /econnrefused|enotfound|econnreset|fetch.?failed|connection.?refused|dns|name.?resolution/i

  const State = z.object({
    cursor: z.number().default(0),
    blacklisted: z.record(z.string(), z.object({ until: z.number(), reason: z.string() })).default({}),
    providers: z.record(z.string(), z.object({ until: z.number(), reason: z.string() })).default({}),
  })
  type State = z.infer<typeof State>

  function readJSON(file: string) {
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"))
    } catch {
      return undefined
    }
  }

  function readState(): State {
    const parsed = State.safeParse(readJSON(STATE_PATH))
    return parsed.success ? parsed.data : State.parse({})
  }

  function writeState(state: State) {
    try {
      fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true })
      fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
    } catch (e) {
      log.warn("state write failed", { error: String(e) })
    }
  }

  /** Human-readable reason a turn should move lanes, or undefined to retry in place. */
  export function reason(problem: { name?: string; message?: string; data?: { message?: string } }) {
    const text = [problem.name, problem.message, problem.data?.message].filter(Boolean).join(" ")
    if (!text) return undefined
    return ROTATE_PATTERN.test(text) ? text : undefined
  }

  function isFree(model: Provider.Model) {
    if (model.cost.input !== 0 || model.cost.output !== 0) return false
    if (model.status === "deprecated") return false
    if (model.capabilities.toolcall === false) return false
    return !DENY.some((re) => re.test(model.id))
  }

  /** Ordered [providerID, modelID] pairs. Catalog first, provider registry as fallback. */
  function catalog(): Array<{ providerID: string; modelID: string }> {
    const data = readJSON(CATALOG_PATH) as
      | { providers?: Record<string, Record<string, unknown>> }
      | undefined
    const providers = data?.providers
    if (!providers) return []
    return Object.keys(providers)
      .sort((a, b) => (PROVIDER_RANK[a] ?? 99) - (PROVIDER_RANK[b] ?? 99))
      .flatMap((providerID) => Object.keys(providers[providerID] ?? {}).map((modelID) => ({ providerID, modelID })))
  }

  function expired(entry: { until: number } | undefined) {
    return !entry || entry.until < Date.now()
  }

  function live(state: State, key: string) {
    if (expired(state.blacklisted[key])) delete state.blacklisted[key]
    else return false
    if (expired(state.providers[key.split("/")[0]])) delete state.providers[key.split("/")[0]]
    else return false
    return true
  }

  /**
   * Next free model to try, or undefined when the rotation is spent. The failed
   * model is put on cooldown so a flapping lane is not picked again immediately.
   */
  export async function next(current: Provider.Model, problem: string) {
    const state = readState()
    const entries = catalog()
    const keys = entries.length
      ? entries
      : Object.entries(await Provider.list()).flatMap(([providerID, info]) =>
          Object.keys(info.models).map((modelID) => ({ providerID, modelID })),
        )

    const ordered = keys
      .sort((a, b) => (PROVIDER_RANK[a.providerID] ?? 99) - (PROVIDER_RANK[b.providerID] ?? 99))
      .slice(0, MAX_CANDIDATES)

    state.blacklisted[`${current.providerID}/${current.id}`] = {
      until: Date.now() + MODEL_COOLDOWN_MS,
      reason: problem.slice(0, 160),
    }
    if (PROVIDER_DEAD_PATTERN.test(problem)) {
      state.providers[current.providerID] = {
        until: Date.now() + PROVIDER_COOLDOWN_MS,
        reason: "provider unreachable",
      }
    }

    const start = state.cursor
    const tried: string[] = []
    for (let i = 1; i <= ordered.length && tried.length < MAX_SWAPS; i++) {
      const entry = ordered[(start + i) % ordered.length]
      const key = `${entry.providerID}/${entry.modelID}`
      if (key === `${current.providerID}/${current.id}`) continue
      if (tried.includes(key)) continue
      tried.push(key)
      if (!live(state, key)) continue

      const model = await Provider.getModel(entry.providerID, entry.modelID).catch(() => undefined)
      if (!model || !isFree(model)) continue

      state.cursor = (start + i) % ordered.length
      writeState(state)
      log.info("rotating", {
        from: `${current.providerID}/${current.id}`,
        to: key,
        reason: problem.slice(0, 120),
      })
      return model
    }

    // Everything is cooling down. Clear the board and take the first lane that
    // is not the one that just died, rather than stranding the turn.
    log.warn("rotation exhausted, resetting cooldowns", { reason: problem.slice(0, 120) })
    state.blacklisted = {}
    state.providers = {}
    state.cursor = 0
    writeState(state)
    for (const entry of ordered) {
      if (entry.providerID === current.providerID && entry.modelID === current.id) continue
      const model = await Provider.getModel(entry.providerID, entry.modelID).catch(() => undefined)
      if (model && isFree(model)) return model
    }
    return undefined
  }
}
