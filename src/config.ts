import fs from "node:fs"
import path from "node:path"
import os from "node:os"

export interface ArenaConfig {
  provider?: string
  model?: string
  apiKeyEnv?: string
  providers?: Record<string, ArenaProviderConfig>
  [key: string]: unknown
}

export interface ArenaProviderConfig {
  apiKeyEnv?: string
  baseURL?: string
  models?: Record<string, string | { model?: string; name?: string; limit?: { context?: number; output?: number } }>
}

type OpenCodeProvider = Record<string, unknown>

// Kilo AI gateway (OpenAI-compatible). Free :free models work anonymously
// (no key, 200 req/hour/IP); KILO_API_KEY unlocks paid models.
// Catalog verified live against GET /models on 2026-09-22.
export const KILO_BASE_URL = "https://api.kilo.ai/api/gateway"
export const KILO_API_KEY_ENV = "KILO_API_KEY"
export const KILO_DEFAULT_MODEL = "qwen/qwen3.8-27b:free"

interface KiloFreeModel {
  id: string
  name: string
  context: number
}

const KILO_FREE_CATALOG: KiloFreeModel[] = [
  { id: "qwen/qwen3.8-27b:free", name: "Qwen 3.8 27B (free)", context: 262144 },
  { id: "cohere/north-mini-code:free", name: "North Mini Code (free)", context: 256000 },
  { id: "z-ai/glm-5.2:free", name: "GLM 5.2 (free)", context: 32768 },
  { id: "liquid/lfm-2.5-2.6b:free", name: "LFM 2.5 2.6B (free)", context: 65536 },
  { id: "stepfun/step-3.7-flash:free", name: "Step 3.7 Flash (free)", context: 262144 },
  { id: "poolside/laguna-s-2.1:free", name: "Laguna S 2.1 (free)", context: 262144 },
  { id: "poolside/laguna-xs-2.1:free", name: "Laguna XS 2.1 (free)", context: 262144 },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra (free)", context: 1000000 },
  { id: "nvidia/nemotron-3.5-lightning:free", name: "Nemotron 3.5 Lightning (free)", context: 1000000 },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super (free)", context: 262144 },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron 3 Nano Reasoning (free)",
    context: 256000,
  },
  { id: "thinkingmachines/inkling-small:free", name: "Inkling Small (free)", context: 1048576 },
  { id: "dots-studio/dots-3-note-preview:free", name: "Dots 3 Note Preview (free)", context: 512000 },
  { id: "nex-agi/nex-n2.5-pro:free", name: "Nex N2.5 Pro (free)", context: 262144 },
  { id: "nex-agi/nex-n2.5-mini:free", name: "Nex N2.5 Mini (free)", context: 262144 },
  { id: "inclusionai/ling-3.0-flash-vl:free", name: "Ling 3.0 Flash VL (free)", context: 262144 },
  { id: "inclusionai/ling-3.0-flash-sante:free", name: "Ling 3.0 Flash Sante (free)", context: 262144 },
  { id: "inclusionai/ling-3.0-flash-fin:free", name: "Ling 3.0 Flash Fin (free)", context: 262144 },
]

function kiloModels(): Record<string, OpenCodeProvider> {
  return Object.fromEntries(
    KILO_FREE_CATALOG.map((item) => [
      item.id,
      { id: item.id, name: item.name, limit: { context: item.context, output: 8192 } },
    ]),
  )
}

export function kiloProviderConfig(
  top?: { apiKeyEnv?: string; model?: string },
  custom?: ArenaProviderConfig,
): OpenCodeProvider {
  const customModels = Object.fromEntries(
    Object.entries(custom?.models ?? {}).map(([modelID, model]) => {
      if (typeof model === "string") return [modelID, { id: modelID, name: model }]
      return [modelID, { id: model.model ?? modelID, name: model.name, ...(model.limit ? { limit: model.limit } : {}) }]
    }),
  )
  const catalog = kiloModels()
  const models = { ...catalog, ...customModels }
  if (top?.model && !models[top.model]) models[top.model] = { id: top.model, name: top.model }
  // ARENA_API_KEY is primary; KILO_API_KEY stays as fallback for existing keys.
  // The engine uses the first set variable; unset entries simply don't match.
  const env = custom?.apiKeyEnv ?? top?.apiKeyEnv ?? "ARENA_API_KEY,KILO_API_KEY"
  return {
    // Displayed in the TUI as the built-in Arena provider. The backend is
    // the Kilo AI gateway (see KILO_BASE_URL); only this label is branded.
    name: "arena.ai",
    api: custom?.baseURL ?? KILO_BASE_URL,
    npm: "@ai-sdk/openai-compatible",
    options: { baseURL: custom?.baseURL ?? KILO_BASE_URL },
    env: env.split(","),
    models,
  }
}

// The built-in provider answers to "arena"; "kilo" stays accepted as an alias.
export function isBuiltInProvider(id: string | undefined): boolean {
  return id !== undefined && (id.toLowerCase() === "arena" || id.toLowerCase() === "kilo")
}

const CONFIG_PATH = path.join(os.homedir(), ".config", "arena", "config.yaml")
const CONFIG_PATH_ALT = path.join(os.homedir(), ".config", "arena", "config.yml")

function parseYaml(content: string): ArenaConfig {
  const result: ArenaConfig = {}
  const lines = content.split("\n")
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const colon = line.indexOf(":")
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && value) result[key] = value
  }
  return result
}

export async function loadConfig(): Promise<{ config: ArenaConfig; path: string | null }> {
  const candidates = [CONFIG_PATH, CONFIG_PATH_ALT]
  // Allow override via env
  if (process.env.ARENA_CONFIG) candidates.unshift(process.env.ARENA_CONFIG)

  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue
      const content = await fs.promises.readFile(p, "utf8")
      if (p.endsWith(".yaml") || p.endsWith(".yml")) {
        try {
          const yaml = await import("yaml")
          const parsed = yaml.parse(content) as ArenaConfig
          return { config: parsed ?? {}, path: p }
        } catch {
          return { config: parseYaml(content), path: p }
        }
      }
      return { config: JSON.parse(content), path: p }
    } catch {
      continue
    }
  }
  return { config: {}, path: null }
}

export function toOpenCodeConfig(config: ArenaConfig): Record<string, unknown> {
  const providers: Record<string, OpenCodeProvider> = {}
  const selected: Record<string, OpenCodeProvider> = config.provider
    ? {
        [config.provider]: {
          ...(config.apiKeyEnv ? { env: [config.apiKeyEnv] } : {}),
          ...(config.model ? { models: { [config.model]: { id: config.model, name: config.model } } } : {}),
        },
      }
    : {}
  for (const [id, value] of Object.entries(config.providers ?? {})) {
    const provider = value as ArenaProviderConfig
    const models = Object.fromEntries(
      Object.entries(provider.models ?? {}).map(([modelID, model]) => {
        if (typeof model === "string") return [modelID, { id: modelID, name: model }]
        return [
          modelID,
          { id: model.model ?? modelID, name: model.name, ...(model.limit ? { limit: model.limit } : {}) },
        ]
      }),
    )
    providers[id] = {
      ...(provider.apiKeyEnv ? { env: [provider.apiKeyEnv] } : {}),
      ...(provider.baseURL ? { api: provider.baseURL, options: { baseURL: provider.baseURL } } : {}),
      ...(Object.keys(models).length ? { models } : {}),
    }
  }

  const result: Record<string, unknown> = { provider: { ...selected, ...providers } }
  const builtinSelected = isBuiltInProvider(config.provider)
  if (config.provider && config.model) result.model = `${builtinSelected ? "arena" : config.provider}/${config.model}`
  if (builtinSelected || (config.providers && ("arena" in config.providers || "kilo" in config.providers))) {
    const merged = result.provider as Record<string, OpenCodeProvider>
    merged.arena = kiloProviderConfig(
      builtinSelected ? { apiKeyEnv: config.apiKeyEnv, model: config.model } : undefined,
      (config.providers?.arena ?? config.providers?.kilo) as ArenaProviderConfig | undefined,
    )
    delete merged.kilo
  }
  // Zero-config default: no provider selected anywhere → free built-in models.
  // Explicit config files and --model flags always win over this default.
  if (!config.provider && !(config.providers && Object.keys(config.providers).length > 0)) {
    const merged = result.provider as Record<string, OpenCodeProvider>
    merged.arena = kiloProviderConfig()
    result.model = `arena/${KILO_DEFAULT_MODEL}`
  }
  return result
}

export function resolveApiKey(config: ArenaConfig): string | undefined {
  if (config.apiKeyEnv) return process.env[config.apiKeyEnv]
  if (config.provider) {
    const envMap: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      gemini: "GEMINI_API_KEY",
      google: "GEMINI_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      arena: "ARENA_API_KEY",
      kilo: "KILO_API_KEY",
      ollama: "",
      "lm-studio": "",
      lmstudio: "",
    }
    const envKey = envMap[config.provider.toLowerCase()]
    if (envKey) return process.env[envKey]
  }
  // Fallback: try common keys
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY
  )
}

export function getConfigSearchPaths(): string[] {
  return [CONFIG_PATH, CONFIG_PATH_ALT]
}
