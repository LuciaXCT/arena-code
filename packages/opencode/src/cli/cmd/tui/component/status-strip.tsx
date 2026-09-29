import { createMemo, Show } from "solid-js"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"

// One quiet line between the transcript and the composer. The full status
// card (ctrl+x b) owns the detail; this strip only surfaces what wants your
// attention right now: the todo in flight, and MCP servers that aren't healthy.
// Renders nothing when there's nothing to say.
export function StatusStrip(props: { sessionID: string }) {
  const { theme } = useTheme()
  const sync = useSync()

  const todo = createMemo(() => sync.data.todo[props.sessionID] ?? [])
  const openTodos = createMemo(() => todo().filter((t) => t.status !== "completed"))
  const current = createMemo(
    () => todo().find((t) => t.status === "in_progress") ?? openTodos()[0],
  )

  const mcp = createMemo(() => Object.entries(sync.data.mcp ?? {}))
  const mcpDown = createMemo(
    () => mcp().filter(([, x]) => x.status !== "connected" && x.status !== "disabled").length,
  )

  return (
    <Show when={openTodos().length > 0 || mcpDown() > 0}>
      {/* Marker sits in the same gutter column as the user-message rail (┃),
          content lines up with message text — the strip reads as a note
          hanging on the left rail, not a floating paragraph. */}
      <box flexShrink={0} flexDirection="column" gap={0}>
        <Show when={current()}>
          <box flexDirection="row" gap={2}>
            <text flexShrink={0} selectable={false} style={{ fg: theme.warning }}>
              ◇
            </text>
            <text fg={theme.textMuted} wrapMode="word" selectable={false}>
              {current()!.content}
            </text>
            <Show when={openTodos().length > 1}>
              <text flexShrink={0} fg={theme.textMuted} selectable={false}>
                · {openTodos().length - 1} more
              </text>
            </Show>
          </box>
        </Show>
        <Show when={mcpDown() > 0}>
          <box flexDirection="row" gap={2}>
            <text flexShrink={0} selectable={false} style={{ fg: theme.error }}>
              ◆
            </text>
            <text fg={theme.textMuted} selectable={false}>
              {mcpDown()} mcp server{mcpDown() > 1 ? "s" : ""} need attention — ctrl+x b for detail
            </text>
          </box>
        </Show>
      </box>
    </Show>
  )
}
