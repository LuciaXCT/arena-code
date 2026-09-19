import { describe, expect, test } from "bun:test"
import { ArenaLeaderboard } from "@/arena/leaderboard"

describe("ArenaLeaderboard Engine", () => {
  test("loads benchmark categories", async () => {
    const agentLb = await ArenaLeaderboard.getLeaderboard("agent")
    expect(agentLb.length).toBeGreaterThan(0)
    expect(agentLb[0].rank).toBe(1)
    expect(agentLb[0].elo).toBeGreaterThan(agentLb[1].elo)

    const codeLb = await ArenaLeaderboard.getLeaderboard("code")
    expect(codeLb.length).toBeGreaterThan(0)

    const overallLb = await ArenaLeaderboard.getLeaderboard("overall")
    expect(overallLb.length).toBeGreaterThan(0)
  })

  test("formats table cleanly with ANSI headers", async () => {
    const entries = await ArenaLeaderboard.getLeaderboard("agent")
    const table = ArenaLeaderboard.formatTable(entries, "agent")

    expect(table).toContain("Arena.ai Leaderboard [AGENT]")
    expect(table).toContain("Rank")
    expect(table).toContain("Model")
    expect(table).toContain("Provider")
    expect(table).toContain("Elo")
    expect(table).toContain("Claude")
  })

  test("handles empty local leaderboard gracefully", async () => {
    const table = ArenaLeaderboard.formatTable([], "local")
    expect(table).toContain("No battle records found yet")
    expect(table).toContain("arena battle")
  })
})
