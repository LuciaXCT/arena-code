import { createMemo, createSignal, onMount, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useSDK } from "@tui/context/sdk"
import { useRouteData } from "@tui/context/route"
import { useLocal } from "@tui/context/local"
import { Identifier } from "@/id/id"

type Role = { id: string; label: string; accent: "info" | "warning" }

const ROLES: Role[] = [
  { id: "brainstorm", label: "BRAINSTORM", accent: "info" },
  { id: "critic", label: "CRITIC", accent: "warning" },
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

function verdictText(sync: ReturnType<typeof useSync>, sessionID: string, roles: string[]) {
  const out: string[] = []
  for (const message of sync.data.message[sessionID] ?? []) {
    if (message.role !== "assistant") continue
    const agent = (message as { agent?: string }).agent ?? ""
    if (roles.includes(agent)) continue
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

  const prompt = route.prompt
  const sessionID = route.sessionID

  const columns = createMemo(() =>
    ROLES.map((role) => ({ role, body: agentText(sync, sessionID, role.id) })),
  )

  const verdict = createMemo(() => verdictText(sync, sessionID, ROLES.map((r) => r.id)))

  const running = createMemo(() => ROLES.some((r) => !agentText(sync, sessionID, r.id)))

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
          await send(role.id, prompt)
        }
        setPhase("Verdict…")
        await send(
          local.agent.current().name,
          [
            "You are the debate chair. Two agents answered the question below.",
            "",
            `Question: ${prompt}`,
            "",
            "Their replies are already in this session above.",
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

  const header = (role: Role) => (
    <text fg={role.accent === "info" ? theme.info : theme.warning} attributes={TextAttributes.BOLD}>
      {role.label}
    </text>
  )

  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={2} paddingRight={2} paddingTop={1} gap={1}>
      <text fg={theme.textMuted} attributes={TextAttributes.BOLD}>
        COUNCIL
        <span style={{ fg: theme.textMuted }}> · {prompt.slice(0, 60)}</span>
      </text>

      <box flexDirection="row" flexGrow={1} gap={3}>
        {columns().map(({ role, body }) => (
          <box flexDirection="column" flexGrow={1} width="50%" gap={1}>
            {header(role)}
            <Show when={body} fallback={<text fg={theme.textMuted}>…</text>}>
              <text fg={theme.text}>{body}</text>
            </Show>
          </box>
        ))}
      </box>

      <box flexDirection="column" gap={1}>
        <text fg={theme.primary} attributes={TextAttributes.BOLD}>
          VERDICT
        </text>
        <Show when={verdict()} fallback={<text fg={theme.textMuted}>…</text>}>
          <text fg={theme.text}>{verdict()}</text>
        </Show>
      </box>

      <Show when={running() || phase()}>
        <text fg={theme.textMuted}>{phase()}</text>
      </Show>
      <text fg={theme.textMuted}>esc to go back · ctrl+p for commands</text>
    </box>
  )
}
