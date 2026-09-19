import { describe, expect, test, beforeAll, afterAll } from "bun:test"
import path from "path"
import fs from "fs/promises"
import os from "os"

const originalArena = process.env.ARENA
const originalTestHome = process.env.OPENCODE_TEST_HOME

beforeAll(() => {
  process.env.ARENA = "1"
})

afterAll(() => {
  if (originalArena !== undefined) {
    process.env.ARENA = originalArena
  } else {
    delete process.env.ARENA
  }
  if (originalTestHome !== undefined) {
    process.env.OPENCODE_TEST_HOME = originalTestHome
  } else {
    delete process.env.OPENCODE_TEST_HOME
  }
})

describe("Arena.ai Standalone Configuration", () => {
  test("Arena does not load .opencode or opencode.json configuration files", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "arena-config-test-"))
    const opencodeDir = path.join(tmpDir, ".opencode")
    const arenaDir = path.join(tmpDir, ".arena")

    await fs.mkdir(opencodeDir, { recursive: true })
    await fs.mkdir(arenaDir, { recursive: true })

    // Create an opencode.json with a conflicting model
    await fs.writeFile(
      path.join(opencodeDir, "opencode.json"),
      JSON.stringify({ model: "opencode/conflicting-model" }),
    )

    // Create an arena.json with the arena standalone model
    await fs.writeFile(
      path.join(arenaDir, "arena.json"),
      JSON.stringify({ model: "thirty/kimi-k2.7" }),
    )

    const { Instance } = await import("../../src/project/instance")
    const { Config } = await import("../../src/config/config")

    await Instance.provide({
      directory: tmpDir,
      fn: async () => {
        const config = await Config.get()
        // Must load from .arena/arena.json, never from .opencode/opencode.json
        expect(config.model).toBe("thirty/kimi-k2.7")

        const dirs = await Config.directories()
        // Directories must contain .arena, not .opencode
        expect(dirs.some((d) => d.includes(".arena"))).toBe(true)
        expect(dirs.some((d) => d.includes(".opencode"))).toBe(false)
      },
    })

    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test("TIPS transform replaces all OpenCode references with arena.ai", async () => {
    const { TIPS } = await import("../../src/cli/cmd/tui/component/tips")
    for (const tip of TIPS) {
      expect(tip.includes("OpenCode")).toBe(false)
      expect(tip.includes(".opencode")).toBe(false)
      expect(tip.includes("opencode.json")).toBe(false)
      expect(tip.includes("~/.config/opencode")).toBe(false)
    }
  })
})
