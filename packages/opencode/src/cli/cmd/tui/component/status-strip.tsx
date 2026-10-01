import { createMemo, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme, withAlpha } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import type { AssistantMessage } from "@opencode-ai/sdk/v2"

// One quiet line between the transcript and the composer.
//
// Always painted, fixed height, dim by default. A strip that comes and goes
// makes the screen jump a row whenever the last todo closes, and it hides the
// exact signal you wanted a status line for.
//
// Every colour here comes from the active theme, so a swap to a light theme
// repaints this line with it instead of leaving dark-theme values stranded.
export function StatusStrip(props: {
  sessionID: string
  panelOpen?: boolean
  panelWidth?: number
  onTogglePanel?: () => void
}) {
  const { theme } = useTheme()
  const sync = useSync()
  const dimensions = useTerminalDimensions()

  const todo = createMemo(() => sync.data.todo[props.sessionID] ?? [])
  const openTodos = createMemo(() => todo().filter((t) => t.status !== "completed"))
  const current = createMemo(() => todo().find((t) => t.status === "in_progress") ?? openTodos()[0])

  const mcp = createMemo(() => Object.entries(sync.data.mcp ?? {}))
  const mcpUp = createMemo(() => mcp().filter(([, x]) => x.status === "connected").length)
  const mcpDown = createMemo(
    () => mcp().filter(([, x]) => x.status !== "connected" && x.status !== "disabled").length,
  )

  const lsp = createMemo(() => sync.data.lsp.length)

  // Rotation surfaces here as a retry status: `Switched to provider/model` is
  // what the server writes when a free lane dies and the turn is replayed
  // somewhere else. Watching it move is the point of having the line.
  const retry = createMemo(() => {
    const status = sync.data.session_status[props.sessionID] as
      | { type?: string; attempt?: number; message?: string }
      | undefined
    if (!status || status.type !== "retry") return undefined
    return { attempt: status.attempt ?? 1, message: status.message ?? "retrying" }
  })

  const context = createMemo(() => {
    const messages = sync.data.message[props.sessionID] ?? []
    const last = messages.findLast((x) => x.role === "assistant" && x.tokens.output > 0) as
      | AssistantMessage
      | undefined
    if (!last) return undefined
    return {
      total:
        last.tokens.input +
        last.tokens.output +
        last.tokens.reasoning +
        last.tokens.cache.read +
        last.tokens.cache.write,
    }
  })

  function compact(n: number) {
    if (n < 1_000) return `${n}`
    if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`
    return `${(n / 1_000_000).toFixed(1)}m`
  }

  // Hard slice plus `wrapMode="none"` keeps this to exactly one row. Whatever
  // the docked rail is taking is not available to us.
  const room = createMemo(() => Math.max(20, dimensions().width - 52 - (props.panelWidth ?? 0)))
  const label = createMemo(() => {
    const text = retry()?.message ?? current()?.content ?? "idle"
    return text.length > room() ? text.slice(0, room() - 1) + "…" : text
  })

  const live = createMemo(() => Boolean(retry()) || current()?.status === "in_progress")

  return (
    <box flexShrink={0} height={1} flexDirection="row" justifyContent="space-between" gap={2}>
      <box flexDirection="row" gap={2} flexShrink={1} minWidth={0}>
        <text flexShrink={0} selectable={false} style={{ fg: live() ? theme.warning : theme.borderSubtle }}>
          {retry() ? "↻" : "◇"}
        </text>
        <text
          fg={live() ? theme.text : theme.textMuted}
          wrapMode="none"
          selectable={false}
          attributes={live() ? undefined : TextAttributes.DIM}
        >
          {label()}
        </text>
        <Show when={openTodos().length > 1}>
          <text flexShrink={0} fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
            +{openTodos().length - 1}
          </text>
        </Show>
      </box>

      <box flexDirection="row" gap={2} flexShrink={0}>
        <Show when={mcp().length > 0}>
          <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
            <span style={{ fg: mcpDown() > 0 ? theme.error : theme.success }}>•</span> {mcpUp()}/{mcp().length}
          </text>
        </Show>
        <Show when={lsp() > 0}>
          <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
            lsp {lsp()}
          </text>
        </Show>
        <Show when={context()}>
          <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
            {compact(context()!.total)} ctx
          </text>
        </Show>
        {/* The HUD toggle. Labelled rather than a lone glyph - a bare symbol
            in the corner is invisible until you already know it is there.
            Colour comes from the theme, so it reads on light and dark alike. */}
        <Show when={props.onTogglePanel}>
          <box onMouseUp={() => props.onTogglePanel?.()} flexShrink={0}>
            <text
              fg={props.panelOpen ? theme.primary : theme.textMuted}
              attributes={props.panelOpen ? undefined : TextAttributes.DIM}
              selectable={false}
            >
              ▤ status
            </text>
          </box>
        </Show>
      </box>
    </box>
  )
}
