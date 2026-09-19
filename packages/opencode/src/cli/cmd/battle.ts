import type { Argv } from "yargs"
import { UI } from "../ui"
import { cmd } from "./cmd"
import { Flag } from "@/flag/flag"
import { select, text, isCancel } from "@clack/prompts"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/v2"
import { Server } from "@/server/server"
import { ArenaBattle } from "@/arena/battle"
import { withNetworkOptions, resolveNetworkOptions } from "@/cli/network"
import { EOL } from "os"

export const BattleCommand = cmd({
  command: "battle [prompt..]",
  describe: "run a blind side-by-side battle between two models and vote on the winner",
  builder: (yargs: Argv) =>
    withNetworkOptions(yargs)
      .positional("prompt", {
        describe: "task or prompt to pit models against",
        type: "string",
        array: true,
        default: [],
      })
      .option("model-a", {
        describe: "candidate model A (e.g. anthropic/claude-3-5-sonnet)",
        type: "string",
      })
      .option("model-b", {
        describe: "candidate model B (e.g. openai/gpt-4o)",
        type: "string",
      })
      .option("blind", {
        describe: "hide model names until voting is complete",
        type: "boolean",
        default: true,
      }),
  handler: async (args) => {
    let promptText = (args.prompt as string[]).join(" ").trim()

    if (!promptText && !process.stdin.isTTY) {
      promptText = (await Bun.stdin.text()).trim()
    }

    if (!promptText) {
      const input = await text({
        message: "Enter the prompt/task for the model battle:",
        placeholder: "e.g. Write a thread-safe LRU cache in Go with test cases",
      })
      if (isCancel(input) || !input.trim()) {
        UI.println("Battle cancelled.")
        return
      }
      promptText = input.trim()
    }

    let candidates: ArenaBattle.BattleParticipant[] | undefined
    if (args["model-a"] && args["model-b"]) {
      candidates = [
        ArenaBattle.parseModelSpec(args["model-a"]),
        ArenaBattle.parseModelSpec(args["model-b"]),
      ]
    }

    const [modelA, modelB] = ArenaBattle.pickBattlePair(candidates)

    UI.println()
    UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "⚔️  ARENA MODEL BATTLE (BLIND TEST)" + UI.Style.TEXT_NORMAL)
    UI.println(UI.Style.TEXT_DIM + "─".repeat(60) + UI.Style.TEXT_NORMAL)
    UI.println(`${UI.Style.TEXT_NORMAL_BOLD}Prompt:${UI.Style.TEXT_NORMAL} ${promptText}`)
    if (args.blind) {
      UI.println(UI.Style.TEXT_DIM + "Identities of Model A and Model B are hidden until voting." + UI.Style.TEXT_NORMAL)
    } else {
      UI.println(UI.Style.TEXT_DIM + `Model A: ${modelA.name} vs Model B: ${modelB.name}` + UI.Style.TEXT_NORMAL)
    }
    UI.println(UI.Style.TEXT_DIM + "─".repeat(60) + UI.Style.TEXT_NORMAL)
    UI.println()

    const opts = await resolveNetworkOptions(args)
    const server = Server.listen(opts)
    const sdk = createOpencodeClient({ baseUrl: `http://${server.hostname}:${server.port}` })

    const executeModelRun = async (slotName: string, participant: ArenaBattle.BattleParticipant) => {
      UI.println(UI.Style.TEXT_INFO_BOLD + `▶ Generating response for ${slotName}...` + UI.Style.TEXT_NORMAL)
      const startTime = Date.now()

      const session = await sdk.session.create({
        title: `Arena Battle - ${slotName}`,
      })

      if (session.error) {
        throw new Error(`Failed to create session for ${slotName}: ${JSON.stringify(session.error)}`)
      }

      const sessionID = session.data.id
      let fullText = ""
      const events = await sdk.event.subscribe()

      const runPromise = (async () => {
        for await (const event of events.stream) {
          if (event.type === "message.part.updated") {
            const part = event.properties.part
            if (part.sessionID !== sessionID) continue
            if (part.type === "text" && part.text) {
              fullText = part.text
            }
          }
          if (event.type === "session.idle" && event.properties.sessionID === sessionID) {
            break
          }
        }
      })()

      await sdk.session.prompt({
        sessionID,
        model: {
          providerID: participant.provider,
          modelID: participant.model,
        },
        parts: [{ type: "text", text: promptText }],
      })

      await runPromise
      const latencyMs = Date.now() - startTime
      return { text: fullText || "(No response generated)", latencyMs }
    }

    let responseA = ""
    let responseB = ""
    let latencyA = 0
    let latencyB = 0

    try {
      const resA = await executeModelRun("Model A", modelA)
      responseA = resA.text
      latencyA = resA.latencyMs

      UI.println()
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "┌───────────────────────────────────────────────┐" + UI.Style.TEXT_NORMAL)
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + `│ 🤖 MODEL A (${(latencyA / 1000).toFixed(1)}s)` + UI.Style.TEXT_NORMAL)
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "└───────────────────────────────────────────────┘" + UI.Style.TEXT_NORMAL)
      UI.println(responseA.trim())
      UI.println()

      const resB = await executeModelRun("Model B", modelB)
      responseB = resB.text
      latencyB = resB.latencyMs

      UI.println()
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "┌───────────────────────────────────────────────┐" + UI.Style.TEXT_NORMAL)
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + `│ 🤖 MODEL B (${(latencyB / 1000).toFixed(1)}s)` + UI.Style.TEXT_NORMAL)
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "└───────────────────────────────────────────────┘" + UI.Style.TEXT_NORMAL)
      UI.println(responseB.trim())
      UI.println()
    } catch (err: any) {
      UI.error(`Battle execution error: ${err?.message || err}`)
      return
    }

    // Voting prompt
    const voteChoice = await select({
      message: "🏆 Evaluate the responses. Which model was better?",
      options: [
        { value: "a", label: "👈 Model A is better" },
        { value: "b", label: "👉 Model B is better" },
        { value: "tie", label: "🤝 Tie" },
        { value: "both_bad", label: "👎 Both are bad" },
      ],
    })

    if (isCancel(voteChoice)) {
      UI.println("Vote cancelled. Battle not recorded.")
      return
    }

    const vote = voteChoice as ArenaBattle.Vote
    const eloBeforeA = await ArenaBattle.getModelElo(modelA.provider, modelA.model)
    const eloBeforeB = await ArenaBattle.getModelElo(modelB.provider, modelB.model)
    const { newA, newB, deltaA, deltaB } = ArenaBattle.calculateElo(eloBeforeA, eloBeforeB, vote)

    const winner = vote === "a" ? "a" : vote === "b" ? "b" : vote === "tie" ? "tie" : "none"

    await ArenaBattle.recordBattle({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      prompt: promptText,
      modelA,
      modelB,
      responseA,
      responseB,
      vote,
      winner,
      eloBeforeA,
      eloBeforeB,
      eloAfterA: newA,
      eloAfterB: newB,
      latencyMsA: latencyA,
      latencyMsB: latencyB,
    })

    // Dramatic revelation banner
    UI.println()
    UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "╔════════════════════════════════════════════════════════════════════════╗" + UI.Style.TEXT_NORMAL)
    UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "║                      🏆 ARENA BATTLE REVEALED                          ║" + UI.Style.TEXT_NORMAL)
    UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "╚════════════════════════════════════════════════════════════════════════╝" + UI.Style.TEXT_NORMAL)
    UI.println(
      `🤖 Model A was: ${UI.Style.TEXT_NORMAL_BOLD}${modelA.name}${UI.Style.TEXT_NORMAL} (${deltaA >= 0 ? "+" : ""}${deltaA} Elo ➔ ${newA})`,
    )
    UI.println(
      `🤖 Model B was: ${UI.Style.TEXT_NORMAL_BOLD}${modelB.name}${UI.Style.TEXT_NORMAL} (${deltaB >= 0 ? "+" : ""}${deltaB} Elo ➔ ${newB})`,
    )
    UI.println(
      `Winner: ${winner === "a" ? "Model A (" + modelA.name + ")" : winner === "b" ? "Model B (" + modelB.name + ")" : winner === "tie" ? "Tie" : "None"}`,
    )
    UI.println()
    UI.println(UI.Style.TEXT_DIM + "Run `arena leaderboard --category local` to see your complete Elo rankings." + UI.Style.TEXT_NORMAL)
    UI.println()
  },
})
