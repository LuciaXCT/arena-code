import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "@/project/instance"
import { Provider } from "@/provider/provider"
import { Flag } from "@/flag/flag"
import { Agent } from "@/agent/agent"

const projectRoot = path.join(__dirname, "../..")

describe("ThirtyStore & Arena Provider", () => {
  test(
    "registers thirty provider in default mode",
    async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const providers = await Provider.list()
          expect(providers["thirty"]).toBeDefined()
          expect(providers["thirty"].name).toBe("ThirtyStore")
          expect(providers["thirty"].options.baseURL).toBe("https://api.thirtystore.com/v1")
        },
      })
    },
    30000,
  )

  test(
    "contains all five requested models",
    async () => {
      await Instance.provide({
        directory: projectRoot,
        fn: async () => {
          const providers = await Provider.list()
          const thirty = providers["thirty"]
          expect(thirty).toBeDefined()

          const expectedModels = [
            "deepseek-v4-flash",
            "deepseek-v4-pro",
            "glm-5.3-flash",
            "qwen3.7-max",
            "kimi-k2.7",
          ]

          for (const id of expectedModels) {
            expect(thirty.models[id]).toBeDefined()
            expect(thirty.models[id].capabilities.toolcall).toBe(true)
            expect(thirty.models[id].api.url).toBe("https://api.thirtystore.com/v1")
          }
        },
      })
    },
    30000,
  )

  test(
    "masks ThirtyStore under arena provider when ARENA is true",
    async () => {
      const origEnv = process.env.ARENA
      process.env.ARENA = "true"

      try {
        expect(Flag.ARENA).toBe(true)
        await Instance.provide({
          directory: projectRoot,
          fn: async () => {
            const providers = await Provider.list()
            // ThirtyStore must NOT be visible to user
            expect(providers["thirty"]).toBeUndefined()

            // Arena provider must be present and named "Arena"
            const arena = providers["arena"]
            expect(arena).toBeDefined()
            expect(arena.name).toBe("Arena")

            // All 5 models are present under arena
            const expectedModels = [
              "deepseek-v4-flash",
              "deepseek-v4-pro",
              "glm-5.3-flash",
              "qwen3.7-max",
              "kimi-k2.7",
            ]

            for (const id of expectedModels) {
              expect(arena.models[id]).toBeDefined()
              expect(arena.models[id].providerID).toBe("arena")
              expect(arena.models[id].api.url).toBe("https://api.thirtystore.com/v1")
              expect(arena.models[id].api.id).toBe(`thirty/${id}`)
            }

            // Default model must resolve to arena/kimi-k2.7
            const defaultModel = await Provider.defaultModel()
            expect(defaultModel.providerID).toBe("arena")
            expect(defaultModel.modelID).toBe("kimi-k2.7")

            // Language resolution works for arena model
            const arenaModel = await Provider.getModel("arena", "kimi-k2.7")
            const language = await Provider.getLanguage(arenaModel)
            expect(language).toBeDefined()
            expect(language.modelId).toBe("thirty/kimi-k2.7")

            // Requesting thirty/* directly transparently maps to arena
            const mappedModel = await Provider.getModel("thirty", "kimi-k2.7")
            expect(mappedModel.providerID).toBe("arena")

            // Agent configuration aligns with arena.ai
            const agents = await Agent.list()
            const agentNames = agents.map((a) => a.name)
            expect(agentNames).toContain("arena")
            expect(agentNames).toContain("chat")
            expect(agentNames).toContain("battle")
            expect(agentNames).toContain("code")
            expect(agentNames).toContain("plan")
            expect(agentNames).toContain("review")

            // Flagship agent is "arena"
            expect(agents[0].name).toBe("arena")
          },
        })
      } finally {
        if (origEnv === undefined) {
          delete process.env.ARENA
        } else {
          process.env.ARENA = origEnv
        }
      }
    },
    30000,
  )
})
