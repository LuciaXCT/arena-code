import { describe, expect, test } from "bun:test"
import { ArenaBattle } from "@/arena/battle"

describe("ArenaBattle Engine", () => {
  test("calculates Elo correctly on Model A win", () => {
    const { newA, newB, deltaA, deltaB } = ArenaBattle.calculateElo(1200, 1200, "a")
    expect(newA).toBe(1216)
    expect(newB).toBe(1184)
    expect(deltaA).toBe(16)
    expect(deltaB).toBe(-16)
  })

  test("calculates Elo correctly on Model B win", () => {
    const { newA, newB, deltaA, deltaB } = ArenaBattle.calculateElo(1200, 1200, "b")
    expect(newA).toBe(1184)
    expect(newB).toBe(1216)
    expect(deltaA).toBe(-16)
    expect(deltaB).toBe(16)
  })

  test("calculates Elo correctly on Tie between equal ratings", () => {
    const { newA, newB, deltaA, deltaB } = ArenaBattle.calculateElo(1200, 1200, "tie")
    expect(newA).toBe(1200)
    expect(newB).toBe(1200)
    expect(deltaA).toBe(0)
    expect(deltaB).toBe(0)
  })

  test("awards higher delta to underdog victory", () => {
    // Underdog (1000) beats favorite (1400)
    const underdogWin = ArenaBattle.calculateElo(1000, 1400, "a")
    // Favorite (1400) beats underdog (1000)
    const favoriteWin = ArenaBattle.calculateElo(1400, 1000, "a")

    expect(underdogWin.deltaA).toBeGreaterThan(favoriteWin.deltaA)
    expect(underdogWin.deltaA).toBeGreaterThan(25)
    expect(favoriteWin.deltaA).toBeLessThan(10)
  })

  test("parses model specifications", () => {
    const full = ArenaBattle.parseModelSpec("anthropic/claude-3-5-sonnet")
    expect(full.provider).toBe("anthropic")
    expect(full.model).toBe("claude-3-5-sonnet")
    expect(full.name).toBe("anthropic/claude-3-5-sonnet")

    const bare = ArenaBattle.parseModelSpec("qwen-coder")
    expect(bare.provider).toBe("arena")
    expect(bare.model).toBe("qwen-coder")

    const thirtyBare = ArenaBattle.parseModelSpec("kimi-k2.7")
    expect(thirtyBare.provider).toBe("arena")
    expect(thirtyBare.model).toBe("kimi-k2.7")

    const thirtyFull = ArenaBattle.parseModelSpec("thirty/deepseek-v4-flash")
    expect(thirtyFull.provider).toBe("arena")
    expect(thirtyFull.model).toBe("deepseek-v4-flash")
  })

  test("picks valid battle pair", () => {
    const [pA, pB] = ArenaBattle.pickBattlePair()
    expect(pA).toBeDefined()
    expect(pB).toBeDefined()
    expect(pA.model).not.toBe(pB.model)
  })
})
