import { expect, test } from "bun:test"
import { tmpdir } from "../fixture/fixture"

process.env.ARENA = "1"
const { ArenaBattle } = await import("../../src/arena/battle")
const { ArenaVoteTool } = await import("../../src/tool/arena-vote")
const { TaskTool } = await import("../../src/tool/task")
const { ToolRegistry } = await import("../../src/tool/registry")
const { Instance } = await import("../../src/project/instance")

test("arena_vote is registered in Arena mode", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      expect(await ToolRegistry.ids().then((x) => x.includes("arena_vote"))).toBe(true)
    },
  })
})

test("task tool accepts an optional model override", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const defined = await (TaskTool as any).init({})
      expect(defined.parameters.shape.subagent_type).toBeDefined()
      expect(defined.parameters.shape.model).toBeDefined()
    },
  })
})

test("arena_vote records the battle and reveals Elo", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const defined = await (ArenaVoteTool as any).init({})
      const params = {
        prompt: "Write a haiku about the sea",
        modelA: "anthropic/test-alpha",
        modelB: "openai/test-beta",
        responseA: "Waves fold into night",
        responseB: "Salt wind on an empty shore",
        vote: "a" as const,
      }
      expect(() => defined.parameters.parse(params)).not.toThrow()
      const result = await defined.execute(params, {})
      expect(result.output).toContain("Arena Battle Revealed")
      expect(result.output).toContain("anthropic/test-alpha")
      expect(result.output).toContain("openai/test-beta")
      const elos = await ArenaBattle.loadEloRatings()
      expect(elos["anthropic/test-alpha"]?.elo).toBe(1216)
      expect(elos["openai/test-beta"]?.elo).toBe(1184)
    },
  })
})
