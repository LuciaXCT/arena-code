import { createMemo, createSignal, For, onMount, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { useRouteData } from "@tui/context/route"
import { useLocal } from "@tui/context/local"
import { Identifier } from "@/id/id"

type Role = { id: string; label: string; tone: "info" | "warning" | "primary"; brief: string }

const ROLES: Role[] = [
  {
    id: "brainstorm",
    label: "BRAINSTORM",
    tone: "info",
    brief: "At most 3 options. For each: what it is, the main cost, how it fails. Then one line: Recommend option N, because …",
  },
  {
    id: "critic",
    label: "CRITIC",
    tone: "warning",
    brief: "Blockers / Should-fix / Nits / Unchecked. Name files, commands or keys. Say \"no blocker\" and stop if there is nothing serious.",
  },
  {
    id: "debate",
    label: "DEBATE",
    tone: "primary",
    brief: "Strongest point / Weakest point / Side / Concede. Argue against the two answers above. No new options.",
  },
]

// Collect the assistant text a given agent produced in this session.
function agentText(sync: ReturnType<typeof useSync>, sessionID: string, agent: string) {
  const out: string[] = []
  for (const message of sync.data.message[sessionID] ?? []) {
    if (message.role !== "assistant") continue
    if ((message as { agent?: string }).agent !== agent) continue
    for (const part of sync.data.part[message.id] ?? []) {
      if (part.type === "text" && part.text?.trim()) out.push(part.text.trim())
    }
  }
  return out.join("\n\n")
}

export function Council() {
  const route = useRouteData("council")
  const { theme } = useTheme()
  const sync = useSync()
  const sdk = useSDK()
  const local = useLocal()
  const [phase, setPhase] = createSignal("")
  const [width, setWidth] = createSignal(140)

  const prompt = route.prompt
  const sessionID = route.sessionID

  const columns = createMemo(() => ROLES.map((role) => ({ role, body: agentText(sync, sessionID, role.id) })))
  const verdict = createMemo(() => agentText(sync, sessionID, local.agent.current().name))
  const running = createMemo(() => ROLES.some((role) => !agentText(sync, sessionID, role.id)))

  const toneColor = (tone: Role["tone"]) =>
    tone === "info" ? theme.info : tone === "warning" ? theme.warning : theme.primary

  const send = (agent: string, text: string) =>
    sdk.client.session.prompt({
      sessionID,
      agent,
      messageID: Identifier.ascending("message"),
      parts: [{ type: "text", text, id: Identifier.ascending("part") }],
    })

  onMount(() => {
    void (async () => {
      try {
        for (const role of ROLES) {
          setPhase(`${role.label} thinking…`)
          await send(role.id, [role.brief, "", `Question: ${prompt}`].join("\n"))
        }
        setPhase("VERDICT thinking…")
        await send(
          local.agent.current().name,
          [
            "You are the debate chair. Three agents answered the question below.",
            "",
            `Question: ${prompt}`,
            "",
            "Their replies are already in this session above. Nothing may be edited.",
            "",
            "Write the verdict. Nothing else. Use exactly these four lines:",
            "- Decision: one sentence",
            "- Why: the evidence, not the vibe",
            "- Smallest next step",
            "- What would prove this wrong",
          ].join("\n"),
        )
        setPhase("")
      } catch (error) {
        setPhase(error instanceof Error ? error.message : String(error))
      }
    })()
  })

  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={3} paddingRight={3} paddingTop={1} gap={1}>
      <box flexDirection="row" gap={1} flexShrink={0}>
        <text fg={theme.primary} attributes={TextAttributes.BOLD}>
          COUNCIL
        </text>
        <text fg={theme.textMuted}>{prompt}</text>
      </box>

      <box flexDirection="row" flexGrow={1} minHeight={0} gap={2}>
        <For each={columns()}>
          {({ role, body }) => (
            <box flexDirection="column" flexGrow={1} width={`${Math.floor(100 / ROLES.length)}%`} minHeight={0}>
              <text fg={toneColor(role.tone)} attributes={TextAttributes.BOLD} flexShrink={0}>
                {role.label}
              </text>
              <scrollbox
                flexGrow={1}
                minHeight={0}
                verticalScrollbarOptions={{ visible: false }}
                horizontalScrollbarOptions={{ visible: false }}
              >
                <text fg={theme.text}>{body || "…"}</text>
              </scrollbox>
            </box>
          )}
        </For>
      </box>

      <box
        flexDirection="column"
        flexShrink={0}
        minHeight={0}
        maxHeight={10}
        paddingTop={1}
        border={["top"]}
        borderColor={theme.borderSubtle}
      >
        <text fg={theme.primary} attributes={TextAttributes.BOLD} flexShrink={0}>
          VERDICT
        </text>
        <scrollbox
          flexGrow={1}
          minHeight={0}
          verticalScrollbarOptions={{ visible: false }}
          horizontalScrollbarOptions={{ visible: false }}
        >
          <text fg={theme.text}>{verdict() || "…"}</text>
        </scrollbox>
      </box>

      <Show when={running() || phase()}>
        <text fg={theme.textMuted} flexShrink={0}>
          {phase()}
        </text>
      </Show>
      <text fg={theme.textMuted} flexShrink={0}>
        esc back · ctrl+p commands · scroll with mouse
      </text>
    </box>
  )
}
