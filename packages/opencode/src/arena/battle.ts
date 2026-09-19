import path from "path"
import fs from "fs/promises"
import { Global } from "@/global"

export namespace ArenaBattle {
  export type Vote = "a" | "b" | "tie" | "both_bad"

  export interface BattleParticipant {
    model: string
    provider: string
    name: string
  }

  export interface BattleResult {
    id: string
    timestamp: number
    prompt: string
    modelA: BattleParticipant
    modelB: BattleParticipant
    responseA: string
    responseB: string
    vote: Vote
    winner: "a" | "b" | "tie" | "none"
    eloBeforeA: number
    eloBeforeB: number
    eloAfterA: number
    eloAfterB: number
    latencyMsA?: number
    latencyMsB?: number
  }

  export interface EloRecord {
    model: string
    provider: string
    elo: number
    battles: number
    wins: number
    losses: number
    ties: number
    updatedAt: number
  }

  export const DEFAULT_ELO = 1200
  export const K_FACTOR = 32

  export function calculateElo(
    ratingA: number,
    ratingB: number,
    vote: Vote,
  ): { newA: number; newB: number; deltaA: number; deltaB: number } {
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400))

    let scoreA = 0.5
    let scoreB = 0.5

    if (vote === "a") {
      scoreA = 1
      scoreB = 0
    } else if (vote === "b") {
      scoreA = 0
      scoreB = 1
    } else if (vote === "tie") {
      scoreA = 0.5
      scoreB = 0.5
    } else if (vote === "both_bad") {
      scoreA = 0
      scoreB = 0
    }

    const deltaA = Math.round(K_FACTOR * (scoreA - expectedA))
    const deltaB = Math.round(K_FACTOR * (scoreB - expectedB))

    return {
      newA: ratingA + deltaA,
      newB: ratingB + deltaB,
      deltaA,
      deltaB,
    }
  }

  export function getBattleFiles() {
    return {
      battles: path.join(Global.Path.data, "arena-battles.json"),
      elo: path.join(Global.Path.data, "arena-elo.json"),
    }
  }

  export async function loadEloRatings(): Promise<Record<string, EloRecord>> {
    try {
      const file = getBattleFiles().elo
      const content = await fs.readFile(file, "utf8")
      return JSON.parse(content)
    } catch {
      return {}
    }
  }

  export async function saveEloRatings(records: Record<string, EloRecord>): Promise<void> {
    const file = getBattleFiles().elo
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, JSON.stringify(records, null, 2), "utf8")
  }

  export async function getModelElo(provider: string, model: string): Promise<number> {
    const elos = await loadEloRatings()
    const key = `${provider}/${model}`
    return elos[key]?.elo ?? DEFAULT_ELO
  }

  export async function recordBattle(result: BattleResult): Promise<void> {
    const { battles: battlesFile } = getBattleFiles()
    let battles: BattleResult[] = []
    try {
      const content = await fs.readFile(battlesFile, "utf8")
      battles = JSON.parse(content)
    } catch {
      battles = []
    }
    battles.push(result)
    await fs.mkdir(path.dirname(battlesFile), { recursive: true })
    await fs.writeFile(battlesFile, JSON.stringify(battles, null, 2), "utf8")

    // Update Elo ratings
    const elos = await loadEloRatings()
    const modelKeyA = `${result.modelA.provider}/${result.modelA.model}`
    const modelKeyB = `${result.modelB.provider}/${result.modelB.model}`

    const recA: EloRecord = elos[modelKeyA] ?? {
      model: result.modelA.model,
      provider: result.modelA.provider,
      elo: DEFAULT_ELO,
      battles: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      updatedAt: Date.now(),
    }

    const recB: EloRecord = elos[modelKeyB] ?? {
      model: result.modelB.model,
      provider: result.modelB.provider,
      elo: DEFAULT_ELO,
      battles: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      updatedAt: Date.now(),
    }

    recA.elo = result.eloAfterA
    recB.elo = result.eloAfterB
    recA.battles++
    recB.battles++
    recA.updatedAt = Date.now()
    recB.updatedAt = Date.now()

    if (result.vote === "a") {
      recA.wins++
      recB.losses++
    } else if (result.vote === "b") {
      recB.wins++
      recA.losses++
    } else if (result.vote === "tie") {
      recA.ties++
      recB.ties++
    }

    elos[modelKeyA] = recA
    elos[modelKeyB] = recB
    await saveEloRatings(elos)
  }

  export const DEFAULT_MODELS: BattleParticipant[] = [
    { provider: "arena", model: "kimi-k2.7", name: "arena/kimi-k2.7" },
    { provider: "arena", model: "deepseek-v4-flash", name: "arena/deepseek-v4-flash" },
    { provider: "arena", model: "deepseek-v4-pro", name: "arena/deepseek-v4-pro" },
    { provider: "arena", model: "glm-5.3-flash", name: "arena/glm-5.3-flash" },
    { provider: "arena", model: "qwen3.7-max", name: "arena/qwen3.7-max" },
  ]

  const ARENA_MODELS = new Set([
    "deepseek-v4-flash",
    "deepseek-v4-pro",
    "glm-5.3-flash",
    "qwen3.7-max",
    "kimi-k2.7",
  ])

  export function parseModelSpec(spec: string): BattleParticipant {
    if (spec.startsWith("thirty/")) {
      const bare = spec.replace(/^thirty\//, "")
      return { provider: "arena", model: bare, name: `arena/${bare}` }
    }
    if (spec.startsWith("arena/")) {
      const bare = spec.replace(/^arena\//, "")
      return { provider: "arena", model: bare, name: `arena/${bare}` }
    }
    if (ARENA_MODELS.has(spec)) {
      return { provider: "arena", model: spec, name: `arena/${spec}` }
    }
    const parts = spec.split("/")
    if (parts.length >= 2) {
      const provider = parts[0] === "thirty" ? "arena" : parts[0]
      const model = parts.slice(1).join("/")
      return { provider, model, name: `${provider}/${model}` }
    }
    return { provider: "arena", model: spec, name: `arena/${spec}` }
  }

  export function pickBattlePair(candidates?: BattleParticipant[]): [BattleParticipant, BattleParticipant] {
    const pool = candidates && candidates.length >= 2 ? candidates : DEFAULT_MODELS
    const idxA = Math.floor(Math.random() * pool.length)
    let idxB = Math.floor(Math.random() * pool.length)
    while (idxB === idxA && pool.length > 1) {
      idxB = Math.floor(Math.random() * pool.length)
    }

    // Randomize slot assignment to prevent position bias
    return Math.random() > 0.5 ? [pool[idxA], pool[idxB]] : [pool[idxB], pool[idxA]]
  }
}
