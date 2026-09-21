import z from "zod"
import { Tool } from "./tool"
import { ArenaBattle } from "../arena/battle"

const parameters = z.object({
  prompt: z.string().describe("The original task prompt both models answered"),
  modelA: z.string().describe("First model in provider/model format (e.g. anthropic/claude-sonnet-4)"),
  modelB: z.string().describe("Second model in provider/model format"),
  responseA: z.string().describe("Full response text from model A"),
  responseB: z.string().describe("Full response text from model B"),
  vote: z.enum(["a", "b", "tie", "both_bad"]).describe("Which response was better: a, b, tie, or both_bad"),
})

export const ArenaVoteTool = Tool.define("arena_vote", async () => {
  return {
    description:
      "Record the verdict of a blind model battle and update Elo ratings. Use only after presenting two anonymized responses (Model A and Model B) and receiving the user's verdict.",
    parameters,
    async execute(params: z.infer<typeof parameters>) {
      const participantA = ArenaBattle.parseModelSpec(params.modelA)
      const participantB = ArenaBattle.parseModelSpec(params.modelB)
      const eloBeforeA = await ArenaBattle.getModelElo(participantA.provider, participantA.model)
      const eloBeforeB = await ArenaBattle.getModelElo(participantB.provider, participantB.model)
      const { newA, newB, deltaA, deltaB } = ArenaBattle.calculateElo(eloBeforeA, eloBeforeB, params.vote)
      const winner = params.vote === "a" ? "a" : params.vote === "b" ? "b" : params.vote === "tie" ? "tie" : "none"
      await ArenaBattle.recordBattle({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        prompt: params.prompt,
        modelA: participantA,
        modelB: participantB,
        responseA: params.responseA,
        responseB: params.responseB,
        vote: params.vote,
        winner,
        eloBeforeA,
        eloBeforeB,
        eloAfterA: newA,
        eloAfterB: newB,
      })
      const output = [
        "## Arena Battle Revealed",
        "",
        `Model A was ${participantA.name} (${deltaA >= 0 ? "+" : ""}${deltaA} Elo -> ${newA})`,
        `Model B was ${participantB.name} (${deltaB >= 0 ? "+" : ""}${deltaB} Elo -> ${newB})`,
        `Winner: ${winner === "a" ? `Model A (${participantA.name})` : winner === "b" ? `Model B (${participantB.name})` : winner === "tie" ? "Tie" : "None"}`,
      ].join("\n")
      return {
        title: "Recorded arena vote",
        output,
        metadata: {},
      }
    },
  }
})
