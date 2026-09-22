import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { toOpenCodeConfig, kiloProviderConfig, KILO_BASE_URL, KILO_DEFAULT_MODEL } from "./config.ts"

describe("built-in arena.ai provider", () => {
  it("builds a complete anonymous provider definition", () => {
    const kilo = kiloProviderConfig() as Record<string, any>
    assert.equal(kilo.name, "arena.ai")
    assert.equal(kilo.api, KILO_BASE_URL)
    assert.equal(kilo.npm, "@ai-sdk/openai-compatible")
    assert.equal(kilo.options.baseURL, KILO_BASE_URL)
    assert.deepEqual(kilo.env, ["ARENA_API_KEY", "KILO_API_KEY"])
    assert.ok(Object.keys(kilo.models).length > 10)
    assert.equal(kilo.models[KILO_DEFAULT_MODEL].id, KILO_DEFAULT_MODEL)
  })

  it("injects the provider on top-level selection with pretty names and limits", () => {
    const out = toOpenCodeConfig({ provider: "arena", model: "qwen/qwen3.8-27b:free" }) as any
    assert.equal(out.model, "arena/qwen/qwen3.8-27b:free")
    const entry = out.provider.arena.models["qwen/qwen3.8-27b:free"]
    assert.equal(entry.name, "Qwen 3.8 27B (free)")
    assert.equal(entry.limit.context, 262144)
    assert.equal(out.provider.kilo, undefined)
  })

  it("accepts kilo as an alias for the same provider", () => {
    const out = toOpenCodeConfig({ provider: "kilo", model: "qwen/qwen3.8-27b:free" }) as any
    assert.equal(out.model, "arena/qwen/qwen3.8-27b:free")
    assert.ok(out.provider.arena)
    assert.equal(out.provider.kilo, undefined)
  })

  it("lets user config override api key, base URL, and models", () => {
    const out = toOpenCodeConfig({
      providers: { arena: { apiKeyEnv: "MY_KEY", models: { "custom/model": "Custom" } } },
    }) as any
    assert.deepEqual(out.provider.arena.env, ["MY_KEY"])
    assert.equal(out.provider.arena.models["custom/model"].name, "Custom")
    assert.ok(out.provider.arena.models[KILO_DEFAULT_MODEL])
  })

  it("does not inject the provider for other providers", () => {
    const out = toOpenCodeConfig({ provider: "openrouter", model: "x/y" }) as any
    assert.equal(out.provider.arena, undefined)
    assert.equal(out.provider.kilo, undefined)
  })

  it("defaults empty config to free built-in models", () => {
    const out = toOpenCodeConfig({}) as any
    assert.equal(out.model, `arena/${KILO_DEFAULT_MODEL}`)
    assert.equal(out.provider.arena.name, "arena.ai")
    assert.ok(out.provider.arena.models[KILO_DEFAULT_MODEL])
  })

  it("leaves non-empty provider maps without a built-in default", () => {
    const out = toOpenCodeConfig({ providers: { openrouter: { apiKeyEnv: "OPENROUTER_API_KEY" } } }) as any
    assert.equal(out.model, undefined)
    assert.equal(out.provider.arena, undefined)
  })
})
