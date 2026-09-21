import { afterAll, beforeAll, expect, test } from "bun:test"
import { Instance } from "../../src/project/instance"
import { Agent } from "../../src/agent/agent"
import { filterSubagents } from "../../src/tool/task"
import { PermissionNext } from "../../src/permission/next"
import path from "path"

// Stock opencode expectations: force Arena mode off even when another
// test file leaks ARENA=1 into this process.
const originalArena = process.env.ARENA

beforeAll(() => {
  delete process.env.ARENA
})

afterAll(() => {
  if (originalArena !== undefined) process.env.ARENA = originalArena
})

const projectRoot = path.join(__dirname, "../..")

test("Arena provides specialized subagents for planning, coding, reviewing, and testing", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const review = await Agent.get("review")
      expect(review).toBeDefined()
      expect(review?.mode).toBe("subagent")
      expect(review?.description).toContain("code review")

      const testAgent = await Agent.get("test")
      expect(testAgent).toBeDefined()
      expect(testAgent?.mode).toBe("subagent")
      expect(testAgent?.description).toContain("test")

      const codeAgent = await Agent.get("code")
      expect(codeAgent).toBeDefined()
      expect(codeAgent?.mode).toBe("all")

      const planAgent = await Agent.get("plan")
      expect(planAgent).toBeDefined()
      expect(planAgent?.mode).toBe("all")
    },
  })
})

test("task tool can filter and discover review and test subagents", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const agents = await Agent.list().then((x) => x.filter((a) => a.mode !== "primary"))
      const ruleset = PermissionNext.fromConfig({ "*": "allow" })
      const filtered = filterSubagents(agents, ruleset)
      const names = filtered.map((a) => a.name)

      expect(names).toContain("review")
      expect(names).toContain("test")
      expect(names).toContain("code")
      expect(names).toContain("plan")
      expect(names).toContain("general")
      expect(names).toContain("explore")
    },
  })
})
