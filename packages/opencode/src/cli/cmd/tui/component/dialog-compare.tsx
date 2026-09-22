import { onMount } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { DialogAlert } from "@tui/ui/dialog-alert"
import { useToast } from "@tui/ui/toast"
import { useSDK } from "../context/sdk"
import { useRoute } from "@tui/context/route"
import { useLocal } from "@tui/context/local"
import { DialogModel } from "./dialog-model"
import { ArenaBattle } from "@/arena/battle"
import { Identifier } from "@/id/id"

export type CompareMode = "battle" | "side-by-side"
type Slot = { providerID: string; modelID: string }

function slotName(slot: Slot) {
  return `${slot.providerID}/${slot.modelID}`
}

export function ComparePrompt(props: { mode: CompareMode }) {
  const dialog = useDialog()
  const blind = props.mode === "battle"
  return (
    <DialogPrompt
      title={blind ? "Battle prompt" : "Compare prompt"}
      placeholder="e.g. Write a thread-safe LRU cache in Go with test cases"
      onConfirm={(text) => {
        if (!text.trim()) return
        dialog.replace(() => <ModelSlot mode={props.mode} prompt={text.trim()} slot="A" />)
      }}
    />
  )
}

function ModelSlot(props: { mode: CompareMode; prompt: string; slot: "A" | "B"; first?: Slot }) {
  const dialog = useDialog()
  return (
    <DialogModel
      title={props.slot === "A" ? "Select model A" : "Select model B"}
      onPick={(model) => {
        const first = props.slot === "A" ? undefined : props.first
        if (!first) {
          dialog.replace(() => <ModelSlot mode={props.mode} prompt={props.prompt} slot="B" first={model} />)
          return
        }
        dialog.replace(() => <Runner mode={props.mode} prompt={props.prompt} modelA={first} modelB={model} />)
      }}
    />
  )
}

async function runSlot(
  sdk: ReturnType<typeof useSDK>,
  sessionID: string,
  agent: string,
  slot: Slot,
  prompt: string,
): Promise<{ text: string; latencyMs: number }> {
  const startTime = Date.now()
  let fullText = ""
  const events = await sdk.client.event.subscribe()
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
  await sdk.client.session.prompt({
    sessionID,
    agent,
    model: { providerID: slot.providerID, modelID: slot.modelID },
    messageID: Identifier.ascending("message"),
    parts: [{ type: "text", text: prompt, id: Identifier.ascending("part") }],
  })
  await runPromise
  return { text: fullText.trim() || "(No response generated)", latencyMs: Date.now() - startTime }
}

function Runner(props: { mode: CompareMode; prompt: string; modelA: Slot; modelB: Slot }) {
  const dialog = useDialog()
  const toast = useToast()
  const sdk = useSDK()
  const route = useRoute()
  const local = useLocal()
  const blind = props.mode === "battle"

  onMount(() => {
    void (async () => {
      try {
        const title = `${blind ? "Battle" : "Side by side"}: ${props.prompt.slice(0, 40)}`
        const session = await sdk.client.session.create({ title })
        if (session.error) throw new Error(JSON.stringify(session.error))
        const sessionID = session.data.id
        const agent = local.agent.current().name
        if (!blind) route.navigate({ type: "session", sessionID })

        toast.show({ message: `Generating ${blind ? "Model A" : slotName(props.modelA)}…`, variant: "info" })
        const resA = await runSlot(sdk, sessionID, agent, props.modelA, props.prompt)
        toast.show({ message: `Generating ${blind ? "Model B" : slotName(props.modelB)}…`, variant: "info" })
        const resB = await runSlot(sdk, sessionID, agent, props.modelB, props.prompt)

        if (!blind) {
          toast.show({ message: "Comparison complete.", variant: "info" })
          dialog.clear()
          return
        }

        const participantA = { provider: props.modelA.providerID, model: props.modelA.modelID, name: slotName(props.modelA) }
        const participantB = { provider: props.modelB.providerID, model: props.modelB.modelID, name: slotName(props.modelB) }
        dialog.replace(() => (
          <DialogSelect
            title="Which response was better?"
            options={[
              { title: "Model A is better", value: "a" as const },
              { title: "Model B is better", value: "b" as const },
              { title: "Tie", value: "tie" as const },
              { title: "Both are bad", value: "both_bad" as const },
            ]}
            onSelect={async (option) => {
              const vote = option.value as ArenaBattle.Vote
              const eloBeforeA = await ArenaBattle.getModelElo(participantA.provider, participantA.model)
              const eloBeforeB = await ArenaBattle.getModelElo(participantB.provider, participantB.model)
              const { newA, newB, deltaA, deltaB } = ArenaBattle.calculateElo(eloBeforeA, eloBeforeB, vote)
              await ArenaBattle.recordBattle({
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                prompt: props.prompt,
                modelA: participantA,
                modelB: participantB,
                responseA: resA.text,
                responseB: resB.text,
                vote,
                winner: ArenaBattle.winnerOf(vote),
                eloBeforeA,
                eloBeforeB,
                eloAfterA: newA,
                eloAfterB: newB,
                latencyMsA: resA.latencyMs,
                latencyMsB: resB.latencyMs,
              })
              const { text } = ArenaBattle.formatReveal({
                modelA: participantA,
                modelB: participantB,
                vote,
                newA,
                newB,
                deltaA,
                deltaB,
              })
              await DialogAlert.show(dialog, "Arena Battle Revealed", text)
              route.navigate({ type: "session", sessionID })
            }}
          />
        ))
      } catch (error) {
        toast.error(error)
        dialog.clear()
      }
    })()
  })

  return (
    <DialogAlert
      title={blind ? "Running blind battle…" : "Running comparison…"}
      message="Both models are generating. You can press esc to dismiss this and keep working."
      onConfirm={() => {}}
    />
  )
}
