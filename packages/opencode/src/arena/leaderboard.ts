import { ArenaBattle } from "./battle"
import { UI } from "@/cli/ui"

export namespace ArenaLeaderboard {
  export type Category = "overall" | "code" | "agent" | "local"

  export interface LeaderboardEntry {
    rank: number
    model: string
    provider: string
    elo: number
    category: string
    license: "Proprietary" | "Open Source"
    confirmedSuccess?: string
    winRate?: string
    battles?: number
  }

  // Curated benchmarks from arena.ai & arena.ai/leaderboard/agent
  export const BENCHMARK_LEADERBOARDS: Record<"overall" | "code" | "agent", LeaderboardEntry[]> = {
    agent: [
      {
        rank: 1,
        model: "Claude 3.5 Sonnet (20241022)",
        provider: "Anthropic",
        elo: 1375,
        category: "agent",
        license: "Proprietary",
        confirmedSuccess: "19.8%",
        winRate: "68.2%",
      },
      {
        rank: 2,
        model: "GPT-4o (2024-11-20)",
        provider: "OpenAI",
        elo: 1358,
        category: "agent",
        license: "Proprietary",
        confirmedSuccess: "18.5%",
        winRate: "66.4%",
      },
      {
        rank: 3,
        model: "Claude 3 Opus",
        provider: "Anthropic",
        elo: 1342,
        category: "agent",
        license: "Proprietary",
        confirmedSuccess: "17.9%",
        winRate: "64.1%",
      },
      {
        rank: 4,
        model: "Gemini 1.5 Pro",
        provider: "Google",
        elo: 1330,
        category: "agent",
        license: "Proprietary",
        confirmedSuccess: "16.8%",
        winRate: "62.5%",
      },
      {
        rank: 5,
        model: "DeepSeek Coder V2.5",
        provider: "DeepSeek",
        elo: 1295,
        category: "agent",
        license: "Open Source",
        confirmedSuccess: "15.4%",
        winRate: "58.9%",
      },
      {
        rank: 6,
        model: "Qwen 2.5 Coder 32B",
        provider: "Alibaba",
        elo: 1282,
        category: "agent",
        license: "Open Source",
        confirmedSuccess: "14.7%",
        winRate: "56.8%",
      },
      {
        rank: 7,
        model: "Llama 3.3 70B Instruct",
        provider: "Meta",
        elo: 1270,
        category: "agent",
        license: "Open Source",
        confirmedSuccess: "14.2%",
        winRate: "55.1%",
      },
    ],
    code: [
      {
        rank: 1,
        model: "Claude 3.5 Sonnet",
        provider: "Anthropic",
        elo: 1388,
        category: "code",
        license: "Proprietary",
        confirmedSuccess: "21.2%",
        winRate: "69.5%",
      },
      {
        rank: 2,
        model: "GPT-4o",
        provider: "OpenAI",
        elo: 1365,
        category: "code",
        license: "Proprietary",
        confirmedSuccess: "19.6%",
        winRate: "67.0%",
      },
      {
        rank: 3,
        model: "DeepSeek Coder V2.5",
        provider: "DeepSeek",
        elo: 1315,
        category: "code",
        license: "Open Source",
        confirmedSuccess: "17.8%",
        winRate: "62.4%",
      },
      {
        rank: 4,
        model: "Qwen 2.5 Coder 32B",
        provider: "Alibaba",
        elo: 1302,
        category: "code",
        license: "Open Source",
        confirmedSuccess: "16.9%",
        winRate: "60.8%",
      },
      {
        rank: 5,
        model: "Gemini 1.5 Pro",
        provider: "Google",
        elo: 1298,
        category: "code",
        license: "Proprietary",
        confirmedSuccess: "16.5%",
        winRate: "59.7%",
      },
    ],
    overall: [
      {
        rank: 1,
        model: "Claude 3.5 Sonnet",
        provider: "Anthropic",
        elo: 1380,
        category: "overall",
        license: "Proprietary",
        winRate: "68.9%",
      },
      {
        rank: 2,
        model: "GPT-4o",
        provider: "OpenAI",
        elo: 1370,
        category: "overall",
        license: "Proprietary",
        winRate: "67.8%",
      },
      {
        rank: 3,
        model: "Gemini 1.5 Pro",
        provider: "Google",
        elo: 1340,
        category: "overall",
        license: "Proprietary",
        winRate: "64.2%",
      },
      {
        rank: 4,
        model: "Llama 3.3 70B Instruct",
        provider: "Meta",
        elo: 1290,
        category: "overall",
        license: "Open Source",
        winRate: "57.5%",
      },
      {
        rank: 5,
        model: "DeepSeek V3",
        provider: "DeepSeek",
        elo: 1285,
        category: "overall",
        license: "Open Source",
        winRate: "56.9%",
      },
    ],
  }

  export async function getLocalLeaderboard(): Promise<LeaderboardEntry[]> {
    const elos = await ArenaBattle.loadEloRatings()
    const records = Object.values(elos)
    if (records.length === 0) return []

    // Sort descending by Elo
    records.sort((a, b) => b.elo - a.elo)

    return records.map((rec, index) => {
      const winRate = rec.battles > 0 ? `${Math.round((rec.wins / rec.battles) * 100)}%` : "N/A"
      return {
        rank: index + 1,
        model: rec.model,
        provider: rec.provider,
        elo: rec.elo,
        category: "local",
        license: "Proprietary",
        battles: rec.battles,
        winRate,
      }
    })
  }

  export async function getLeaderboard(category: Category = "agent"): Promise<LeaderboardEntry[]> {
    if (category === "local") {
      return getLocalLeaderboard()
    }
    return BENCHMARK_LEADERBOARDS[category] ?? BENCHMARK_LEADERBOARDS.agent
  }

  export function formatTable(entries: LeaderboardEntry[], category: Category): string {
    const title = `🏆 Arena.ai Leaderboard [${category.toUpperCase()}]`
    const pad = (s: string, len: number) => (s + " ".repeat(Math.max(0, len - s.length))).slice(0, len)
    const rpad = (s: string, len: number) => (" ".repeat(Math.max(0, len - s.length)) + s).slice(-len)

    const lines: string[] = []
    lines.push("")
    lines.push(UI.Style.TEXT_HIGHLIGHT_BOLD + title + UI.Style.TEXT_NORMAL)
    lines.push(UI.Style.TEXT_DIM + "Rankings inspired by LMSYS Chatbot Arena & Agent Arena (https://arena.ai/)" + UI.Style.TEXT_NORMAL)
    lines.push("")

    const header = `${pad("Rank", 6)} ${pad("Model", 32)} ${pad("Provider", 14)} ${rpad("Elo", 6)}  ${pad("License", 13)} ${rpad("Win Rate", 9)}`
    lines.push(UI.Style.TEXT_NORMAL_BOLD + header + UI.Style.TEXT_NORMAL)
    lines.push(UI.Style.TEXT_DIM + "─".repeat(header.length) + UI.Style.TEXT_NORMAL)

    if (entries.length === 0) {
      lines.push(UI.Style.TEXT_DIM + "  No battle records found yet. Run `arena battle` to start your local leaderboard!" + UI.Style.TEXT_NORMAL)
      lines.push("")
      return lines.join("\n")
    }

    for (const item of entries) {
      const medal = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : ` #${item.rank}`
      const rankStr = pad(medal, 6)
      const modelStr = pad(item.model, 32)
      const provStr = pad(item.provider, 14)
      const eloStr = UI.Style.TEXT_SUCCESS_BOLD + rpad(String(item.elo), 6) + UI.Style.TEXT_NORMAL
      const licStr = item.license === "Open Source" ? UI.Style.TEXT_INFO + pad(item.license, 13) + UI.Style.TEXT_NORMAL : pad(item.license, 13)
      const winStr = rpad(item.winRate ?? "N/A", 9)

      lines.push(`${rankStr} ${modelStr} ${provStr} ${eloStr}  ${licStr} ${winStr}`)
    }

    lines.push(UI.Style.TEXT_DIM + "─".repeat(header.length) + UI.Style.TEXT_NORMAL)
    lines.push("")
    return lines.join("\n")
  }
}
