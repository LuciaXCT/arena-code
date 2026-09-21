import type { Argv } from "yargs"
import { UI } from "../ui"
import { cmd } from "./cmd"
import { text, isCancel } from "@clack/prompts"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk/v2"
import { Server } from "@/server/server"
import { ArenaBattle } from "@/arena/battle"
import { withNetworkOptions, resolveNetworkOptions } from "@/cli/network"

export const SideBySideCommand = cmd({
  command: "side-by-side [prompt..]",
  describe: "run the same prompt on two named models and show both answers side by side",
  builder: (yargs: Argv) =>
    withNetworkOptions(yargs)
      .positional("prompt", {
        describe: "task or prompt to run on both models",
        type: "string",
        array: true,
        default: [],
      })
      .option("model-a", {
        describe: "model A (e.g. anthropic/claude-3-5-sonnet)",
        type: "string",
      })
      .option("model-b", {
        describe: "model B (e.g. openai/gpt-4o)",
        type: "string",
      }),
  handler: async (args) => {
    let promptText = (args.prompt as string[]).join(" ").trim()

    if (!promptText && !process.stdin.isTTY) {
      promptText = (await Bun.stdin.text()).trim()
    }

    if (!promptText) {
      const input = await text({
        message: "Enter the prompt/task to compare:",
        placeholder: "e.g. Explain Raft consensus in three paragraphs",
      })
      if (isCancel(input) || !input.trim()) {
        UI.println("Comparison cancelled.")
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
    UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + "▦ ARENA SIDE BY SIDE" + UI.Style.TEXT_NORMAL)
    UI.println(UI.Style.TEXT_DIM + "─".repeat(60) + UI.Style.TEXT_NORMAL)
    UI.println(`${UI.Style.TEXT_NORMAL_BOLD}Prompt:${UI.Style.TEXT_NORMAL} ${promptText}`)
    UI.println(UI.Style.TEXT_DIM + `Left: ${modelA.name}   Right: ${modelB.name}` + UI.Style.TEXT_NORMAL)
    UI.println(UI.Style.TEXT_DIM + "─".repeat(60) + UI.Style.TEXT_NORMAL)
    UI.println()

    const opts = await resolveNetworkOptions(args)
    const server = Server.listen(opts)
    const sdk = createOpencodeClient({ baseUrl: `http://${server.hostname}:${server.port}` })

    const executeModelRun = async (slotName: string, participant: ArenaBattle.BattleParticipant) => {
      UI.println(UI.Style.TEXT_INFO_BOLD + `▶ Generating response for ${slotName}...` + UI.Style.TEXT_NORMAL)
      const startTime = Date.now()

      const session = await sdk.session.create({
        title: `Arena Side by Side - ${slotName}`,
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

    try {
      const resA = await executeModelRun(modelA.name, modelA)
      UI.println()
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + `┌─ ${modelA.name} (${(resA.latencyMs / 1000).toFixed(1)}s)` + UI.Style.TEXT_NORMAL)
      UI.println(resA.text.trim())
      UI.println()

      const resB = await executeModelRun(modelB.name, modelB)
      UI.println()
      UI.println(UI.Style.TEXT_HIGHLIGHT_BOLD + `┌─ ${modelB.name} (${(resB.latencyMs / 1000).toFixed(1)}s)` + UI.Style.TEXT_NORMAL)
      UI.println(resB.text.trim())
      UI.println()
    } catch (err: any) {
      UI.error(`Comparison execution error: ${err?.message || err}`)
      return
    }

    UI.println(UI.Style.TEXT_DIM + "No vote recorded. Run `arena battle` for a blind test with Elo." + UI.Style.TEXT_NORMAL)
    UI.println()
  },
})
