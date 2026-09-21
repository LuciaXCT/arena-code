import fs from "node:fs"
import path from "node:path"
import os from "node:os"

export interface ArenaConfig {
  provider?: string
  model?: string
  apiKeyEnv?: string
  providers?: Record<string, { apiKeyEnv?: string; baseURL?: string; model?: string }>
  [key: string]: unknown
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
  if (process.env.OPENCODE_CONFIG) candidates.unshift(process.env.OPENCODE_CONFIG)

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

export function resolveApiKey(config: ArenaConfig): string | undefined {
  if (config.apiKeyEnv) return process.env[config.apiKeyEnv]
  if (config.provider) {
    const envMap: Record<string, string> = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      gemini: "GEMINI_API_KEY",
      google: "GEMINI_API_KEY",
      openrouter: "OPENROUTER_API_KEY",
      ollama: "",
      "lm-studio": "",
      lmstudio: "",
    }
    const envKey = envMap[config.provider.toLowerCase()]
    if (envKey) return process.env[envKey]
  }
  // Fallback: try common keys
  return process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY
}

export function getConfigSearchPaths(): string[] {
  return [CONFIG_PATH, CONFIG_PATH_ALT]
}
