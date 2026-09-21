import path from "path"
import z from "zod"
import { Config } from "../config/config"
import { Instance } from "../project/instance"
import { NamedError } from "@opencode-ai/util/error"
import { ConfigMarkdown } from "../config/markdown"
import { Log } from "../util/log"
import { Global } from "@/global"
import { Filesystem } from "@/util/filesystem"
import { exists } from "fs/promises"

export namespace Skill {
  const log = Log.create({ service: "skill" })

  const StringList = z.union([z.string(), z.array(z.string())]).optional()

  export const Frontmatter = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    when_to_use: z.string().optional(),
    ["argument-hint"]: z.string().optional(),
    arguments: StringList,
    ["disable-model-invocation"]: z.boolean().optional(),
    ["user-invocable"]: z.boolean().optional(),
    ["allowed-tools"]: StringList,
    ["disallowed-tools"]: StringList,
    model: z.string().optional(),
    effort: z.string().optional(),
    context: z.string().optional(),
    agent: z.string().optional(),
    background: z.boolean().optional(),
    hooks: z.any().optional(),
    paths: StringList,
    shell: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    license: z.string().optional(),
    compatibility: z.string().optional(),
    version: z.string().optional(),
  })
  export type Frontmatter = z.infer<typeof Frontmatter>

  export const Info = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    description: z.string(),
    location: z.string(),
    source: z.enum(["project", "global", "plugin"]).optional(),
    plugin: z.string().optional(),
    userInvocable: z.boolean().optional(),
    modelInvocationDisabled: z.boolean().optional(),
    argumentHint: z.string().optional(),
    args: z.array(z.string()).optional(),
    allowedTools: z.array(z.string()).optional(),
    disallowedTools: z.array(z.string()).optional(),
    model: z.string().optional(),
    skillContext: z.string().optional(),
    skillAgent: z.string().optional(),
    whenToUse: z.string().optional(),
  })
  export type Info = z.infer<typeof Info>

  export const InvalidError = NamedError.create(
    "SkillInvalidError",
    z.object({
      path: z.string(),
      message: z.string().optional(),
      issues: z.custom<z.core.$ZodIssue[]>().optional(),
    }),
  )

  export const NameMismatchError = NamedError.create(
    "SkillNameMismatchError",
    z.object({
      path: z.string(),
      expected: z.string(),
      actual: z.string(),
    }),
  )

  const OPENCODE_SKILL_GLOB = new Bun.Glob("{skill,skills}/**/SKILL.md")
  const CLAUDE_SKILL_GLOB = new Bun.Glob("skills/**/SKILL.md")
  const PLUGIN_SKILL_GLOB = new Bun.Glob("plugins/*/skills/*/SKILL.md")

  function normalizeList(value: string | string[] | undefined): string[] | undefined {
    if (value === undefined) return undefined
    const items = Array.isArray(value) ? value : value.split(/[\s,]+/)
    const out = items.map((x) => x.trim()).filter(Boolean)
    return out.length ? out : undefined
  }

  function firstParagraph(content: string): string {
    const blocks = content.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)
    for (const block of blocks) {
      if (block.startsWith("#")) continue
      if (block.startsWith("---")) continue
      return block.replace(/\n+/g, " ").trim()
    }
    return ""
  }

  export function combinedDescription(skill: Info): string {
    const base = skill.description ?? ""
    const extra = skill.whenToUse ?? ""
    return `${base}${extra ? ` ${extra}` : ""}`.trim().slice(0, 1536)
  }

  export const state = Instance.state(async () => {
    const skills: Record<string, Info> = {}

    const addSkill = async (match: string, source: Info["source"], pluginName?: string) => {
      const md = await ConfigMarkdown.parse(match).catch(() => undefined)
      if (!md) return
      const data = (md.data ?? {}) as Record<string, unknown>
      if (Object.keys(data).length === 0) return

      const parsed = Frontmatter.safeParse(data)
      if (!parsed.success) return
      const front = parsed.data

      const dirName = path.basename(path.dirname(match))
      const frontName = typeof front.name === "string" && front.name.trim() ? front.name.trim() : undefined

      const command = pluginName ? `${pluginName}:${frontName ?? dirName}` : dirName
      const display = frontName ?? dirName

      let description = typeof front.description === "string" ? front.description.trim() : ""
      if (!description) description = firstParagraph(md.content ?? "")
      if (!description) return

      if (skills[command] && skills[command].location !== match) {
        log.warn("duplicate skill name", {
          name: command,
          existing: skills[command].location,
          duplicate: match,
        })
      }

      skills[command] = {
        name: command,
        displayName: display,
        description,
        location: match,
        source,
        ...(pluginName ? { plugin: pluginName } : {}),
        ...(front["user-invocable"] === false ? { userInvocable: false } : {}),
        ...(front["disable-model-invocation"] === true ? { modelInvocationDisabled: true } : {}),
        ...(front["argument-hint"] ? { argumentHint: front["argument-hint"] } : {}),
        ...(normalizeList(front.arguments as string | string[] | undefined)
          ? { args: normalizeList(front.arguments as string | string[] | undefined) }
          : {}),
        ...(normalizeList(front["allowed-tools"] as string | string[] | undefined)
          ? { allowedTools: normalizeList(front["allowed-tools"] as string | string[] | undefined) }
          : {}),
        ...(normalizeList(front["disallowed-tools"] as string | string[] | undefined)
          ? { disallowedTools: normalizeList(front["disallowed-tools"] as string | string[] | undefined) }
          : {}),
        ...(front.model ? { model: front.model } : {}),
        ...(front.context ? { skillContext: front.context } : {}),
        ...(front.agent ? { skillAgent: front.agent } : {}),
        ...(front.when_to_use ? { whenToUse: front.when_to_use } : {}),
      }
    }

    const scanGlob = async (cwd: string, glob: Bun.Glob, source: Info["source"], pluginName?: string) => {
      if (!(await exists(cwd).catch(() => false))) return
      const matches = await Array.fromAsync(
        glob.scan({ cwd, absolute: true, onlyFiles: true, followSymlinks: true, dot: true }),
      ).catch((error) => {
        log.error("failed skill directory scan", { cwd, error })
        return [] as string[]
      })
      for (const match of matches) await addSkill(match, source, pluginName)
    }

    const pluginNameFromMatch = (match: string, root: string) => {
      const rel = path.relative(root, match)
      const parts = rel.split(path.sep)
      const idx = parts.indexOf("plugins")
      if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1]
      return undefined
    }

    // Global first (default), project overrides on duplicate.
    const globalArenaConfig = path.join(Global.Path.config, "skills")
    const globalArenaHome = path.join(Global.Path.home, ".config", "arena", "skills")
    const globalClaude = path.join(Global.Path.home, ".claude", "skills")
    const globalAgents = path.join(Global.Path.home, ".agents", "skills")
    await scanGlob(path.dirname(globalArenaConfig), CLAUDE_SKILL_GLOB, "global")
    if (globalArenaHome !== globalArenaConfig) await scanGlob(path.dirname(globalArenaHome), CLAUDE_SKILL_GLOB, "global")
    await scanGlob(path.dirname(globalClaude), CLAUDE_SKILL_GLOB, "global")
    await scanGlob(path.dirname(globalAgents), CLAUDE_SKILL_GLOB, "global")

    // Project up-tree, flag-independent for backward compat.
    for (const target of [".arena", ".opencode", ".claude", ".agents"]) {
      const dirs = await Array.fromAsync(
        Filesystem.up({ targets: [target], start: Instance.directory, stop: Instance.worktree }),
      )
      for (const dir of dirs) {
        await scanGlob(dir, CLAUDE_SKILL_GLOB, "project")
        await scanGlob(dir, OPENCODE_SKILL_GLOB, "project")
      }
    }

    // Config directories plus plugin reservation.
    for (const dir of await Config.directories()) {
      if (!(await exists(dir).catch(() => false))) continue
      const legacy = await Array.fromAsync(
        OPENCODE_SKILL_GLOB.scan({ cwd: dir, absolute: true, onlyFiles: true, followSymlinks: true, dot: true }),
      ).catch(() => [] as string[])
      for (const match of legacy) {
        if (match.includes(`${path.sep}plugins${path.sep}`)) continue
        await addSkill(match, "project")
      }
      const pluginMatches = await Array.fromAsync(
        PLUGIN_SKILL_GLOB.scan({ cwd: dir, absolute: true, onlyFiles: true, followSymlinks: true, dot: true }),
      ).catch(() => [] as string[])
      for (const match of pluginMatches) {
        const plugin = pluginNameFromMatch(match, dir) ?? "plugin"
        await addSkill(match, "plugin", plugin)
      }
    }

    return skills
  })

  export async function get(name: string) {
    const all = await state()
    if (all[name]) return all[name]
    if (!name.includes(":")) {
      const suffixed = Object.values(all).find((x) => x.name.endsWith(`:${name}`))
      if (suffixed) return suffixed
    }
    return undefined
  }

  export async function all() {
    return state().then((x) => Object.values(x))
  }

  export async function allForModel() {
    return all().then((x) => x.filter((s) => s.modelInvocationDisabled !== true))
  }

  export async function allForMenu() {
    return all().then((x) => x.filter((s) => s.userInvocable !== false))
  }
}
