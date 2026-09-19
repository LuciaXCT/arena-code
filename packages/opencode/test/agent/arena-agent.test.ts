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
const { Agent } = await import("../../src/agent/agent")
const { SystemPrompt } = await import("../../src/session/system")

const projectRoot = path.join(__dirname, "../..")

test("Arena has its own flagship native primary AI agent", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const arenaAgent = await Agent.get("arena")
      expect(arenaAgent).toBeDefined()
      expect(arenaAgent?.name).toBe("arena")
      expect(arenaAgent?.mode).toBe("primary")
      expect(arenaAgent?.native).toBe(true)
      expect(arenaAgent?.description).toContain("Arena's flagship autonomous AI coding agent")
    },
  })
})

test("Arena AI agent is the default primary agent when ARENA=1", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const def = await Agent.defaultAgent()
      expect(def).toBe("arena")

      const list = await Agent.list()
      expect(list.length).toBeGreaterThan(0)
      expect(list[0].name).toBe("arena")
    },
  })
})

test("SystemPrompt provider brands the prompt for Arena", async () => {
  const model = {
    id: "test-model",
    providerID: "anthropic",
    api: {
      id: "claude-3-7-sonnet",
      url: "https://api.anthropic.com",
      npm: "@ai-sdk/anthropic",
    },
    name: "Claude 3.7 Sonnet",
  } as unknown as Parameters<typeof SystemPrompt.provider>[0]

  const prompts = SystemPrompt.provider(model)
  expect(prompts.length).toBeGreaterThan(0)
  const fullText = prompts.join("\n")
  expect(fullText).toContain("Arena")
  expect(fullText).not.toContain("You are OpenCode")
})
