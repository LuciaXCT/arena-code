import { expect, test } from "bun:test"
import { Arena } from "../../src/arena"
import { ArenaRuntime } from "../../src/arena/runtime"
import { Agent, MCP, PermissionNext, Provider, Session, ToolRegistry } from "../../src/arena/core"

test("Arena runtime identifies shared core boundary", () => {
  expect(Arena.name).toBe("arena")
  expect(Arena.runtime).toBe("opencode-core")
  expect(ArenaRuntime.core).toBe(Arena.runtime)
  expect(Object.values(ArenaRuntime.capabilities).every(Boolean)).toBe(true)
  expect(Agent).toBeDefined()
  expect(MCP).toBeDefined()
  expect(PermissionNext).toBeDefined()
  expect(Provider).toBeDefined()
  expect(Session).toBeDefined()
  expect(ToolRegistry).toBeDefined()
})
