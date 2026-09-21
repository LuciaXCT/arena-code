import { expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"
import type { Agent } from "../../src/agent/agent"

process.env.ARENA = "1"
const { Agent: ArenaAgent } = await import("../../src/agent/agent")
const { Instance } = await import("../../src/project/instance")
const { PermissionNext } = await import("../../src/permission/next")

function evalPerm(agent: Agent.Info | undefined, permission: string) {
  if (!agent) return undefined
  return PermissionNext.evaluate(permission, "*", agent.permission).action
}

test("Arena roster lists the four native modes in arena.ai order", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const names = await ArenaAgent.list().then((x) => x.map((a) => a.name))
      expect(names.slice(0, 4)).toEqual(["Battle", "DeepMode", "Side by side", "Direct"])
    },
  })
})

test("Arena roster hides native build and plan", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const names = await ArenaAgent.list().then((x) => x.map((a) => a.name))
      expect(names).not.toContain("build")
      expect(names).not.toContain("plan")
      await expect(ArenaAgent.get("build")).rejects.toThrow("not available in Arena mode")
      await expect(ArenaAgent.get("plan")).rejects.toThrow("not available in Arena mode")
    },
  })
})

test("Direct is the default Arena agent", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      expect(await ArenaAgent.defaultAgent()).toBe("Direct")
    },
  })
})

test("DeepMode keeps its orchestrator behavior", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const mode = await ArenaAgent.get("DeepMode")
      expect(mode).toBeDefined()
      expect(mode?.mode).toBe("primary")
      expect(mode?.native).toBe(true)
      expect(mode?.prompt).toContain("never invent")
      expect(mode?.prompt).toContain("5 targeted")
      expect(mode?.prompt).toContain("worktrees")
      expect(mode?.prompt).toContain("Never claim verification")
    },
  })
})

test("Battle orchestrates blind comparisons and records votes", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const battle = await ArenaAgent.get("Battle")
      expect(battle).toBeDefined()
      expect(battle?.mode).toBe("primary")
      expect(battle?.native).toBe(true)
      expect(battle?.prompt).toContain("arena_vote")
      expect(evalPerm(battle, "task")).toBe("allow")
      expect(evalPerm(battle, "arena_vote")).toBe("allow")
      expect(evalPerm(battle, "edit")).toBe("deny")
      expect(evalPerm(battle, "write")).toBe("deny")
    },
  })
})

test("Side by side compares without voting", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const side = await ArenaAgent.get("Side by side")
      expect(side).toBeDefined()
      expect(side?.mode).toBe("primary")
      expect(side?.native).toBe(true)
      expect(side?.prompt).toContain("never call arena_vote")
      expect(evalPerm(side, "task")).toBe("allow")
      expect(evalPerm(side, "arena_vote")).toBe("deny")
    },
  })
})

test("Direct codes with full permissions", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const direct = await ArenaAgent.get("Direct")
      expect(direct).toBeDefined()
      expect(direct?.mode).toBe("primary")
      expect(direct?.native).toBe(true)
      expect(evalPerm(direct, "edit")).toBe("allow")
      expect(evalPerm(direct, "bash")).toBe("allow")
    },
  })
})

test("Custom .arena agents still appear after the roster", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const agentDir = path.join(dir, ".arena", "agent")
      await fs.mkdir(agentDir, { recursive: true })
      await Bun.write(
        path.join(agentDir, "helper.md"),
        `---\ndescription: Project helper.\nmode: primary\n---\n\n# Helper\n\nHelp out.\n`,
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const names = await ArenaAgent.list().then((x) => x.map((a) => a.name))
      expect(names.slice(0, 4)).toEqual(["Battle", "DeepMode", "Side by side", "Direct"])
      expect(names).toContain("helper")
      expect(names).not.toContain("build")
    },
  })
})
