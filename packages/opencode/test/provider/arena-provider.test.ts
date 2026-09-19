import { afterAll, beforeAll, expect, test } from "bun:test"
import path from "path"

const originalArena = process.env.ARENA

beforeAll(() => {
  process.env.ARENA = "1"
})

afterAll(() => {
  if (originalArena !== undefined) {
    process.env.ARENA = originalArena
  } else {
    delete process.env.ARENA
  }
})

const { Instance } = await import("../../src/project/instance")
const { Provider } = await import("../../src/provider/provider")
const { Global } = await import("../../src/global")
const { Flag } = await import("../../src/flag/flag")

const projectRoot = path.join(__dirname, "../..")

test("Global.Path dynamically resolves to arena paths when ARENA=1", () => {
  expect(Flag.ARENA).toBe(true)
  expect(Global.Path.data).toContain("arena")
  expect(Global.Path.cache).toContain("arena")
  expect(Global.Path.config).toContain("arena")
  expect(Global.Path.state).toContain("arena")
  expect(Global.Path.log).toContain("arena")
  expect(Global.Path.bin).toContain("arena")
})

test("Flag supports ARENA_* environment variables", () => {
  process.env.ARENA_CONFIG = "/custom/arena/config.json"
  process.env.ARENA_PERMISSION = JSON.stringify({ "*": "allow" })

  const { Flag: DynamicFlag } = require("../../src/flag/flag")
  expect(DynamicFlag.OPENCODE_CONFIG).toBe("/custom/arena/config.json")
  expect(DynamicFlag.OPENCODE_PERMISSION).toBe(JSON.stringify({ "*": "allow" }))

  delete process.env.ARENA_CONFIG
  delete process.env.ARENA_PERMISSION
})

test("Provider registers the arena provider with models", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const providers = await Provider.list()
      expect(providers["arena"]).toBeDefined()
      expect(providers["arena"].name).toBe("Arena")
      expect(providers["arena"].id).toBe("arena")
      expect(Object.keys(providers["arena"].models).length).toBeGreaterThan(0)

      // Test small model / nano model resolution
      const smallModel = await Provider.getSmallModel("arena")
      if (providers["arena"].models["gpt-5-nano"]) {
        expect(smallModel).toBeDefined()
      }
    },
  })
})
