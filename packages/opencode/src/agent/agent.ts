import { Config } from "../config/config"
import z from "zod"
import { Provider } from "../provider/provider"
import { generateObject, type ModelMessage } from "ai"
import { SystemPrompt } from "../session/system"
import { Instance } from "../project/instance"

import PROMPT_GENERATE from "./generate.txt"
import PROMPT_COMPACTION from "./prompt/compaction.txt"
import PROMPT_EXPLORE from "./prompt/explore.txt"
import PROMPT_SUMMARY from "./prompt/summary.txt"
import PROMPT_TITLE from "./prompt/title.txt"
import PROMPT_DEEPMODE from "./prompt/deepmode.txt"
import PROMPT_DIRECT from "./prompt/direct.txt"
import PROMPT_BATTLE from "./prompt/battle.txt"
import PROMPT_SIDEBYSIDE from "./prompt/sidebyside.txt"
import PROMPT_UNCENSORED from "./prompt/uncensored.txt"
import { PermissionNext } from "@/permission/next"
import { mergeDeep, pipe, sortBy, values } from "remeda"
import { ConfigMarkdown } from "../config/markdown"
import { ArenaPlugin } from "../arena/plugin"
import { Flag } from "../flag/flag"

export namespace Agent {
  // Live check (not the Flag.ARENA const) so tests can toggle modes per case.
  const arena = () => Flag.isArena()

  export const ARENA_ROSTER = ["Battle", "DeepMode", "Side by side", "Direct", "Uncensored"] as const
  // Native Build/Plan are retired in Arena mode (the roster replaces them).
  // Custom file agents are never retired, even when named the same.
  function retired(info: Info) {
    return info.native && (info.name === "build" || info.name === "plan")
  }
  export const Info = z
    .object({
      name: z.string(),
      description: z.string().optional(),
      mode: z.enum(["subagent", "primary", "all"]),
      native: z.boolean().optional(),
      hidden: z.boolean().optional(),
      topP: z.number().optional(),
      temperature: z.number().optional(),
      color: z.string().optional(),
      permission: PermissionNext.Ruleset,
      model: z
        .object({
          modelID: z.string(),
          providerID: z.string(),
        })
        .optional(),
      prompt: z.string().optional(),
      options: z.record(z.string(), z.any()),
      steps: z.number().int().positive().optional(),
    })
    .meta({
      ref: "Agent",
    })
  export type Info = z.infer<typeof Info>

  const state = Instance.state(async () => {
    const cfg = await Config.get()

    const defaults = PermissionNext.fromConfig({
      "*": "allow",
      doom_loop: "ask",
      external_directory: "ask",
      // mirrors github.com/github/gitignore Node.gitignore pattern for .env files
      read: {
        "*": "allow",
        "*.env": "deny",
        "*.env.*": "deny",
        "*.env.example": "allow",
      },
    })
    const user = PermissionNext.fromConfig(cfg.permission ?? {})

    const result: Record<string, Info> = {
      build: {
        name: "build",
        options: {},
        permission: PermissionNext.merge(defaults, user),
        mode: "primary",
        native: true,
      },
      ...(arena()
        ? {
            Battle: {
              name: "Battle",
              description: "Blind side-by-side battle between two models with voting and Elo ranking.",
              options: {},
              permission: PermissionNext.merge(
                defaults,
                PermissionNext.fromConfig({
                  "*": "deny",
                  task: "allow",
                  arena_vote: "allow",
                  skill: "allow",
                  read: "allow",
                  glob: "allow",
                  grep: "allow",
                  list: "allow",
                }),
                user,
              ),
              mode: "primary" as const,
              native: true,
              prompt: PROMPT_BATTLE,
            },
            DeepMode: {
              name: "DeepMode",
              description: "Advanced orchestrator for complex, multi-stage software engineering tasks.",
              options: {},
              permission: PermissionNext.merge(defaults, user),
              mode: "primary" as const,
              native: true,
              prompt: PROMPT_DEEPMODE,
            },
            "Side by side": {
              name: "Side by side",
              description: "Run the same prompt on two named models and show both answers labeled.",
              options: {},
              permission: PermissionNext.merge(
                defaults,
                PermissionNext.fromConfig({
                  "*": "deny",
                  task: "allow",
                  skill: "allow",
                  read: "allow",
                  glob: "allow",
                  grep: "allow",
                  list: "allow",
                }),
                user,
              ),
              mode: "primary" as const,
              native: true,
              prompt: PROMPT_SIDEBYSIDE,
            },
            Direct: {
              name: "Direct",
              description: "Direct single-model chat and coding.",
              options: {},
              permission: PermissionNext.merge(defaults, user),
              mode: "primary" as const,
              native: true,
              prompt: PROMPT_DIRECT,
            },
            Uncensored: {
              name: "Uncensored",
              description: "Uncensored offensive security and exploit development agent. No content restrictions beyond physical harm.",
              options: {},
              permission: PermissionNext.merge(defaults, user),
              mode: "primary" as const,
              native: true,
              prompt: PROMPT_UNCENSORED,
            },
          }
        : {}),
      plan: {
        name: "plan",
        options: {},
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            edit: {
              "*": "deny",
              ".opencode/plan/*.md": "allow",
            },
          }),
          user,
        ),
        mode: "primary",
        native: true,
      },
      general: {
        name: "general",
        description: `General-purpose agent for researching complex questions and executing multi-step tasks. Use this agent to execute multiple units of work in parallel.`,
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            todoread: "deny",
            todowrite: "deny",
          }),
          user,
        ),
        options: {},
        mode: "subagent",
        native: true,
      },
      explore: {
        name: "explore",
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny",
            grep: "allow",
            glob: "allow",
            list: "allow",
            bash: "allow",
            webfetch: "allow",
            websearch: "allow",
            codesearch: "allow",
            read: "allow",
          }),
          user,
        ),
        description: `Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.`,
        prompt: PROMPT_EXPLORE,
        options: {},
        mode: "subagent",
        native: true,
      },
      compaction: {
        name: "compaction",
        mode: "primary",
        native: true,
        hidden: true,
        prompt: PROMPT_COMPACTION,
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny",
          }),
          user,
        ),
        options: {},
      },
      title: {
        name: "title",
        mode: "primary",
        options: {},
        native: true,
        hidden: true,
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny",
          }),
          user,
        ),
        prompt: PROMPT_TITLE,
      },
      summary: {
        name: "summary",
        mode: "primary",
        options: {},
        native: true,
        hidden: true,
        permission: PermissionNext.merge(
          defaults,
          PermissionNext.fromConfig({
            "*": "deny",
          }),
          user,
        ),
        prompt: PROMPT_SUMMARY,
      },
    }

    for (const [key, value] of Object.entries(cfg.agent ?? {})) {
      if (value.disable) {
        delete result[key]
        continue
      }
      let item = result[key]
      if (!item)
        item = result[key] = {
          name: key,
          mode: "all",
          permission: PermissionNext.merge(defaults, user),
          options: {},
          native: false,
        }
      if (value.model) item.model = Provider.parseModel(value.model)
      item.prompt = value.prompt ?? item.prompt
      item.description = value.description ?? item.description
      item.temperature = value.temperature ?? item.temperature
      item.topP = value.top_p ?? item.topP
      item.mode = value.mode ?? item.mode
      item.color = value.color ?? item.color
      item.hidden = value.hidden ?? item.hidden
      item.name = value.name ?? item.name
      item.steps = value.steps ?? item.steps
      item.options = mergeDeep(item.options, value.options ?? {})
      item.permission = PermissionNext.merge(item.permission, PermissionNext.fromConfig(value.permission ?? {}))
    }

    if (arena()) {
      const parts = await ArenaPlugin.allComponents().catch(() => undefined)
      for (const item of parts?.agents ?? []) {
        if (result[item.name]) continue
        const parsed = await ConfigMarkdown.parse(item.file).catch(() => undefined)
        if (!parsed) continue
        result[item.name] = {
          name: item.name,
          description: typeof parsed.data?.description === "string" ? parsed.data.description : `Plugin agent from ${item.plugin}`,
          mode: "all",
          permission: PermissionNext.merge(defaults, user),
          options: {},
          native: false,
          prompt: parsed.content.trim(),
        }
      }
    }
    return result
  })

  export async function get(agent: string) {
    return state().then((x) => {
      const info = x[agent]
      if (info && arena() && retired(info)) {
        throw new Error(`Agent "${agent}" is not available in Arena mode. Use Battle, DeepMode, Side by side, or Direct.`)
      }
      return info
    })
  }

  export async function list() {
    const cfg = await Config.get()
    const all = await state()
    if (!arena()) {
      return pipe(
        all,
        values(),
        sortBy([(x) => (cfg.default_agent ? x.name === cfg.default_agent : x.name === "build"), "desc"]),
      )
    }
    // Arena roster first in arena.ai order, then user custom agents.
    // Native build/plan are retired in Arena mode; file agents stay visible.
    const ordered = ARENA_ROSTER.map((name) => all[name]).filter((x) => x !== undefined)
    const customs = values(all).filter(
      (x) => !ARENA_ROSTER.includes(x.name as (typeof ARENA_ROSTER)[number]) && !retired(x),
    )
    return [
      ...ordered,
      ...sortBy(
        customs,
        [(x) => (cfg.default_agent ? x.name === cfg.default_agent : x.name === "build"), "desc"],
      ),
    ]
  }

  export async function defaultAgent() {
    return state().then((x) => {
      if (arena() && x["Direct"]) return "Direct"
      return Object.keys(x)[0]
    })
  }

  export async function generate(input: { description: string; model?: { providerID: string; modelID: string } }) {
    const cfg = await Config.get()
    const defaultModel = input.model ?? (await Provider.defaultModel())
    const model = await Provider.getModel(defaultModel.providerID, defaultModel.modelID)
    const language = await Provider.getLanguage(model)
    const system = SystemPrompt.header(defaultModel.providerID)
    system.push(PROMPT_GENERATE)
    const existing = await list()
    const result = await generateObject({
      experimental_telemetry: {
        isEnabled: cfg.experimental?.openTelemetry,
        metadata: {
          userId: cfg.username ?? "unknown",
        },
      },
      temperature: 0.3,
      messages: [
        ...system.map(
          (item): ModelMessage => ({
            role: "system",
            content: item,
          }),
        ),
        {
          role: "user",
          content: `Create an agent configuration based on this request: \"${input.description}\".\n\nIMPORTANT: The following identifiers already exist and must NOT be used: ${existing.map((i) => i.name).join(", ")}\n  Return ONLY the JSON object, no other text, do not wrap in backticks`,
        },
      ],
      model: language,
      schema: z.object({
        identifier: z.string(),
        whenToUse: z.string(),
        systemPrompt: z.string(),
      }),
    })
    return result.object
  }
}
