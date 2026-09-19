import { describe, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { GitTool } from "../../src/tool/git"
import { TestTool } from "../../src/tool/test"
import { ToolRegistry } from "../../src/tool/registry"
import path from "path"

const projectRoot = path.join(__dirname, "../..")

const ctx = {
  sessionID: "arena-test-session",
  messageID: "msg-1",
  callID: "call-1",
  agent: "build",
  abort: AbortSignal.any([]),
  metadata: () => {},
  ask: async () => {},
}

describe("GitTool", () => {
  test("runs status in git repository", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const git = await GitTool.init()
        const result = await git.execute({ command: "status" }, ctx)
        expect(result.title).toContain("git status")
        expect(result.output).toBeDefined()
        expect(typeof result.output).toBe("string")
      },
    })
  })

  test("runs log to inspect commit history", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const git = await GitTool.init()
        const result = await git.execute({ command: "log", args: ["-n", "3"] }, ctx)
        expect(result.title).toContain("git log")
        expect(result.output.length).toBeGreaterThan(0)
      },
    })
  })

  test("runs diff to inspect working tree changes", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const git = await GitTool.init()
        const result = await git.execute({ command: "diff" }, ctx)
        expect(result.title).toContain("git diff")
        expect(typeof result.output).toBe("string")
      },
    })
  })

  test("blocks forbidden destructive or mutating operations", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const git = await GitTool.init()
        expect(git.execute({ command: "status", args: ["commit", "-m", "foo"] }, ctx)).rejects.toThrow(
          "The git tool is strictly read-only",
        )
        expect(git.execute({ command: "status", args: ["push", "origin", "main"] }, ctx)).rejects.toThrow(
          "The git tool is strictly read-only",
        )
        expect(git.execute({ command: "status", args: ["clean", "-fd"] }, ctx)).rejects.toThrow(
          "The git tool is strictly read-only",
        )
        expect(git.execute({ command: "status", args: ["reset", "--hard"] }, ctx)).rejects.toThrow(
          "The git tool is strictly read-only",
        )
      },
    })
  })
})

describe("TestTool", () => {
  test("executes custom test command override", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const testTool = await TestTool.init()
        const result = await testTool.execute({ command: "echo test-suite-passed" }, ctx)
        expect(result.metadata.passed).toBe(true)
        expect(result.metadata.exitCode).toBe(0)
        expect(result.output).toContain("test-suite-passed")
      },
    })
  })

  test("detects failure and reports non-zero exit code", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const testTool = await TestTool.init()
        const result = await testTool.execute({ command: "false" }, ctx)
        expect(result.metadata.passed).toBe(false)
        expect(result.metadata.exitCode).toBe(1)
        expect(result.title).toContain("Tests FAILED")
      },
    })
  })
})

describe("ToolRegistry with Arena tools", () => {
  test("registers git and test tools", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const ids = await ToolRegistry.ids()
        expect(ids).toContain("git")
        expect(ids).toContain("test")
      },
    })
  })
})
