import path from "path"
import { BusEvent } from "@/bus/bus-event"
import z from "zod"
import { Config } from "../config/config"
import { Instance } from "../project/instance"
import { Identifier } from "../id/id"
import PROMPT_INITIALIZE from "./template/initialize.txt"
import PROMPT_REVIEW from "./template/review.txt"
import { MCP } from "../mcp"
import { Skill } from "../skill"
import { ConfigMarkdown } from "../config/markdown"
import { ArenaPlugin } from "../arena/plugin"
import { Flag } from "../flag/flag"

export namespace Command {
  export const Event = {
    Executed: BusEvent.define(
      "command.executed",
      z.object({
        name: z.string(),
        sessionID: Identifier.schema("session"),
        arguments: z.string(),
        messageID: Identifier.schema("message"),
      }),
    ),
  }

  export const Info = z
    .object({
      name: z.string(),
      description: z.string().optional(),
      agent: z.string().optional(),
      model: z.string().optional(),
      mcp: z.boolean().optional(),
      argumentHint: z.string().optional(),
      // workaround for zod not supporting async functions natively so we use getters
      // https://zod.dev/v4/changelog?id=zfunction
      template: z.promise(z.string()).or(z.string()),
      subtask: z.boolean().optional(),
      hints: z.array(z.string()),
    })
    .meta({
      ref: "Command",
    })

  // for some reason zod is inferring `string` for z.promise(z.string()).or(z.string()) so we have to manually override it
  export type Info = Omit<z.infer<typeof Info>, "template"> & { template: Promise<string> | string }

  export function hints(template: string): string[] {
    const result: string[] = []
    const numbered = template.match(/\$\d+/g)
    if (numbered) {
      for (const match of [...new Set(numbered)].sort()) result.push(match)
    }
    if (template.includes("$ARGUMENTS")) result.push("$ARGUMENTS")
    return result
  }

  function skillTemplate(skill: Skill.Info, body: string): string {
    const dir = path.dirname(skill.location)
    let out = body
      .replaceAll("${CLAUDE_SKILL_DIR}", dir)
      .replaceAll("${ARENA_SKILL_DIR}", dir)
      .replaceAll("$SKILL_DIR", dir)
    const names = skill.args ?? []
    names.forEach((item, index) => {
      out = out.replaceAll(`$${item}`, `$${index + 1}`)
    })
    return out
  }

  export const Default = {
    INIT: "init",
    REVIEW: "review",
  } as const

  const state = Instance.state(async () => {
    const cfg = await Config.get()

    const result: Record<string, Info> = {
      [Default.INIT]: {
        name: Default.INIT,
        description: "create/update AGENTS.md",
        get template() {
          return PROMPT_INITIALIZE.replace("${path}", Instance.worktree)
        },
        hints: hints(PROMPT_INITIALIZE),
      },
      [Default.REVIEW]: {
        name: Default.REVIEW,
        description: "review changes [commit|branch|pr], defaults to uncommitted",
        get template() {
          return PROMPT_REVIEW.replace("${path}", Instance.worktree)
        },
        subtask: true,
        hints: hints(PROMPT_REVIEW),
      },
    }

    for (const [name, command] of Object.entries(cfg.command ?? {})) {
      result[name] = {
        name,
        agent: command.agent,
        model: command.model,
        description: command.description,
        get template() {
          return command.template
        },
        subtask: command.subtask,
        hints: hints(command.template),
      }
    }
    for (const [name, prompt] of Object.entries(await MCP.prompts())) {
      result[name] = {
        name,
        mcp: true,
        description: prompt.description,
        get template() {
          // since a getter can't be async we need to manually return a promise here
          return new Promise<string>(async (resolve, reject) => {
            const template = await MCP.getPrompt(
              prompt.client,
              prompt.name,
              prompt.arguments
                ? // substitute each argument with $1, $2, etc.
                  Object.fromEntries(prompt.arguments?.map((argument, i) => [argument.name, `$${i + 1}`]))
                : {},
            ).catch(reject)
            resolve(
              template?.messages
                .map((message) => (message.content.type === "text" ? message.content.text : ""))
                .join("\n") || "",
            )
          })
        },
        hints: prompt.arguments?.map((_, i) => `$${i + 1}`) ?? [],
      }
    }

    for (const skill of await Skill.allForMenu()) {
      if (result[skill.name]) continue
      const location = skill.location
      const meta = { skill, location }
      result[skill.name] = {
        name: skill.name,
        description: Skill.combinedDescription(skill),
        ...(skill.argumentHint ? { argumentHint: skill.argumentHint } : {}),
        ...(skill.model ? { model: skill.model } : {}),
        ...(skill.skillContext === "fork" ? { subtask: true } : {}),
        get template() {
          return new Promise<string>(async (resolve) => {
            const parsed = await ConfigMarkdown.parse(meta.location).catch(() => undefined)
            const body = parsed?.content?.trim() ?? ""
            resolve(skillTemplate(meta.skill, body))
          })
        },
        hints: (skill.args ?? []).map((_, i) => `$${i + 1}`),
      }
    }

    if (Flag.isArena()) {
      const parts = await ArenaPlugin.allComponents().catch(() => undefined)
      for (const item of parts?.commands ?? []) {
        if (result[item.name]) continue
        const parsed = await ConfigMarkdown.parse(item.file).catch(() => undefined)
        const dir = path.dirname(item.file)
        const body = (parsed?.content?.trim() ?? "")
          .replaceAll("${CLAUDE_SKILL_DIR}", dir)
          .replaceAll("${ARENA_SKILL_DIR}", dir)
        const front = (parsed?.data ?? {}) as Record<string, unknown>
        const description =
          typeof front.description === "string" && front.description.trim()
            ? front.description.trim()
            : `Plugin command from ${item.plugin}`
        result[item.name] = {
          name: item.name,
          description,
          ...(typeof front["argument-hint"] === "string" && front["argument-hint"].trim()
            ? { argumentHint: front["argument-hint"].trim() }
            : {}),
          template: body,
          hints: hints(body),
        }
      }
    }

    return result
  })

  export async function get(name: string) {
    return state().then((x) => x[name])
  }

  export async function list() {
    return state().then((x) => Object.values(x))
  }
}
