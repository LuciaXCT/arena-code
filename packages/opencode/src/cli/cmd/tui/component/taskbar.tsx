import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useDirectory } from "@tui/context/directory"
import { useLocal } from "@tui/context/local"
import { useRoute } from "@tui/context/route"

const CFG = path.join(os.homedir(), ".config", "opencode")
const STATE_PATH = path.join(CFG, "free-rotate-state.json")
const CATALOG_PATH = path.join(CFG, "arena-models.json")

function readJSON<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T
  } catch {
    return fallback
  }
}

// One quiet line at the bottom: where you are, what model is live, how the
// free rotation is doing. No borders, no labels.
export function Taskbar() {
  const { theme } = useTheme()
  const sync = useSync()
  const local = useLocal()
  const route = useRoute()
  const directory = useDirectory()

  const [tick, setTick] = createSignal(0)
  onMount(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 15_000)
    onCleanup(() => clearInterval(timer))
  })

  const model = createMemo(() => local.model.current())

  const free = createMemo(() => {
    tick()
    const catalog = readJSON<{ providers?: Record<string, Record<string, unknown>> }>(CATALOG_PATH, {})
    return Object.values(catalog.providers ?? {}).reduce((sum, models) => sum + Object.keys(models).length, 0)
  })

  const rotation = createMemo(() => {
    tick()
    const state = readJSON<{ cursor?: number; blacklisted?: Record<string, { until: number }>; providers?: Record<string, { until: number }> }>(
      STATE_PATH,
      {},
    )
    const now = Date.now()
    const cooled = Object.values(state.blacklisted ?? {}).filter((v) => (v?.until ?? 0) > now).length
    return { cursor: state.cursor ?? 0, cooled }
  })

  // A model is "free" when it came from the generated free catalog.
  const isFree = createMemo(() => {
    const current = model()
    if (!current) return false
    const catalog = readJSON<{ providers?: Record<string, Record<string, unknown>> }>(CATALOG_PATH, {})
    return Boolean(catalog.providers?.[current.providerID]?.[current.modelID])
  })

  const lsp = createMemo(() => Object.keys(sync.data.lsp).length)
  const mcp = createMemo(() => Object.values(sync.data.mcp).filter((x) => x.status === "connected").length)
  const mcpError = createMemo(() => Object.values(sync.data.mcp).some((x) => x.status === "failed"))
  const permissions = createMemo(() => {
    if (route.data.type !== "session") return 0
    return (sync.data.permission[route.data.sessionID] ?? []).length
  })

  return (
    <box flexDirection="row" justifyContent="space-between" gap={1} flexShrink={0} height={1}>
      <text fg={theme.textMuted} attributes={TextAttributes.DIM}>
        {directory().replace(os.homedir(), "~")}
      </text>
      <box flexDirection="row" gap={2} flexShrink={0}>
        <Show when={permissions() > 0}>
          <text fg={theme.warning}>
            △ {permissions()} permission{permissions() > 1 ? "s" : ""}
          </text>
        </Show>
        <Show when={isFree()}>
          <text fg={theme.textMuted} attributes={TextAttributes.DIM}>
            <span style={{ fg: rotation().cooled > 0 ? theme.warning : theme.success }}>•</span> {free()} free
            <Show when={rotation().cooled > 0}> · {rotation().cooled} cooling</Show>
          </text>
        </Show>
        <Show when={model()}>
          <text fg={theme.textMuted} attributes={TextAttributes.DIM}>
            {local.model.parsed().model}
          </text>
        </Show>
        <Show when={lsp() > 0}>
          <text fg={theme.textMuted} attributes={TextAttributes.DIM}>
            lsp {lsp()}
          </text>
        </Show>
        <Show when={mcp() > 0}>
          <text fg={theme.textMuted} attributes={TextAttributes.DIM}>
            <span style={{ fg: mcpError() ? theme.error : theme.success }}>⊙</span> mcp {mcp()}
          </text>
        </Show>
      </box>
    </box>
  )
}
