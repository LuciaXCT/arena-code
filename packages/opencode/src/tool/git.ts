import z from "zod"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import { $ } from "bun"

const FORBIDDEN_WORDS = [
  "commit",
  "push",
  "clean",
  "reset",
  "rebase",
  "merge",
  "checkout",
  "restore",
  "branch",
  "tag",
  "rm",
  "mv",
  "remote",
]

export const GitTool = Tool.define("git", {
  description:
    "Inspect Git repository state: check status, view diffs, or review commit log history. " +
    "This tool is strictly read-only and will reject any commit, push, or destructive operation.",
  parameters: z.object({
    command: z
      .enum(["status", "diff", "log"])
      .describe("Git inspection command to run: 'status' (changed/untracked files), 'diff' (code diffs), or 'log' (recent commits)"),
    args: z
      .string()
      .array()
      .optional()
      .describe("Optional arguments for the git command, e.g. ['--staged'], ['-n', '10'], or ['src/file.ts']"),
  }),
  async execute(params, ctx) {
    const rawArgs = params.args ?? []

    // Security check: reject any mutating or destructive arguments
    for (const arg of rawArgs) {
      const lower = arg.toLowerCase()
      for (const word of FORBIDDEN_WORDS) {
        if (lower === word || lower.startsWith(`${word} `) || lower.includes(` ${word}`)) {
          throw new Error(`The git tool is strictly read-only. The argument '${arg}' is not permitted.`)
        }
      }
    }

    const cwd = Instance.worktree || Instance.directory

    await ctx.ask({
      permission: "git",
      patterns: [params.command, ...rawArgs],
      always: ["*"],
      metadata: {
        command: params.command,
        args: rawArgs,
      },
    })

    let cmd: string[]
    if (params.command === "status") {
      cmd = ["git", "status", ...(rawArgs.length > 0 ? rawArgs : ["--short"])]
    } else if (params.command === "diff") {
      cmd = ["git", "-c", "core.autocrlf=false", "diff", "--no-color", ...rawArgs]
    } else {
      cmd = ["git", "log", "--oneline", ...(rawArgs.length > 0 ? rawArgs : ["-n", "15"])]
    }

    const result = await $`${cmd}`.cwd(cwd).nothrow().quiet()

    const stdout = result.stdout.toString()
    const stderr = result.stderr.toString()

    if (result.exitCode !== 0) {
      return {
        title: `git ${params.command} (exit code ${result.exitCode})`,
        metadata: { exitCode: result.exitCode, command: params.command },
        output: stderr || stdout || `Git command failed with exit code ${result.exitCode}`,
      }
    }

    const output = stdout.trim() || (params.command === "status" ? "Working tree clean" : "No output")
    return {
      title: `git ${params.command}`,
      metadata: { exitCode: 0, command: params.command },
      output,
    }
  },
})
