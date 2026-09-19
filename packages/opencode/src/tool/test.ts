import z from "zod"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import { $ } from "bun"
import path from "path"
import fs from "fs/promises"

export const TestTool = Tool.define("test", {
  description:
    "Run repository test suites or a specific test file using an auto-detected test runner " +
    "(Bun test, npm/yarn/pnpm test, vitest, jest, pytest, cargo test, go test) or a custom command. " +
    "Returns test output, exit code, and pass/fail summary.",
  parameters: z.object({
    target: z
      .string()
      .optional()
      .describe("Optional path to a specific test file, test directory, or test filter pattern"),
    command: z
      .string()
      .optional()
      .describe("Optional explicit command override to run tests (e.g. 'pytest -k test_auth')"),
  }),
  async execute(params, ctx) {
    const cwd = Instance.worktree || Instance.directory

    await ctx.ask({
      permission: "test",
      patterns: [params.command || params.target || "default"],
      always: ["*"],
      metadata: {
        target: params.target,
        command: params.command,
      },
    })

    const startTime = Date.now()
    let displayCommand = params.command || ""

    const result = await (async () => {
      if (params.command) {
        return $`sh -c ${params.command}`.cwd(cwd).nothrow().quiet()
      }

      // Auto-detect project test runner
      const hasBunLock = await Bun.file(path.join(cwd, "bun.lock")).exists()
      const hasBunfig = await Bun.file(path.join(cwd, "bunfig.toml")).exists()
      const hasPackageJson = await Bun.file(path.join(cwd, "package.json")).exists()
      const hasPytest =
        (await Bun.file(path.join(cwd, "pytest.ini")).exists()) ||
        (await Bun.file(path.join(cwd, "pyproject.toml")).exists()) ||
        (await Bun.file(path.join(cwd, "setup.py")).exists())
      const hasCargo = await Bun.file(path.join(cwd, "Cargo.toml")).exists()
      const hasGoMod = await Bun.file(path.join(cwd, "go.mod")).exists()

      let cmdParts: string[]
      if (hasBunLock || hasBunfig) {
        cmdParts = ["bun", "test", ...(params.target ? [params.target] : [])]
      } else if (hasPackageJson) {
        cmdParts = params.target ? ["npm", "test", "--", params.target] : ["npm", "test"]
      } else if (hasPytest) {
        cmdParts = ["pytest", ...(params.target ? [params.target] : [])]
      } else if (hasCargo) {
        cmdParts = ["cargo", "test", ...(params.target ? [params.target] : [])]
      } else if (hasGoMod) {
        cmdParts = ["go", "test", ...(params.target ? [params.target] : ["./..."])]
      } else {
        cmdParts = ["bun", "test", ...(params.target ? [params.target] : [])]
      }

      displayCommand = cmdParts.join(" ")
      return $`${cmdParts}`.cwd(cwd).nothrow().quiet()
    })()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    const stdout = result.stdout.toString()
    const stderr = result.stderr.toString()
    const combined = [stdout, stderr].filter(Boolean).join("\n").trim()

    const passed = result.exitCode === 0
    const summary = passed ? `Tests PASSED (${duration}s)` : `Tests FAILED (exit code ${result.exitCode}, ${duration}s)`

    return {
      title: summary,
      metadata: {
        passed,
        exitCode: result.exitCode,
        durationSeconds: parseFloat(duration),
        command: displayCommand,
      },
      output: `${summary}\nCommand: ${displayCommand}\n\n${combined || "No test output generated."}`,
    }
  },
})
