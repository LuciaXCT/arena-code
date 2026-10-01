import { createMemo, For, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme, withAlpha } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { TodoItem } from "./todo-item"
import path from "path"
import type { AssistantMessage } from "@opencode-ai/sdk/v2"

// The rail has to earn its columns. On a wide terminal 34 is comfortable; on a
// narrow one that much would leave the chat too thin to read, so it steps down
// instead of taking a fixed cut.
export const STATUS_PANEL_WIDTH = 34

export function statusPanelWidth(terminalWidth: number) {
  if (terminalWidth < 108) return 32
  if (terminalWidth < 140) return 36
  if (terminalWidth < 160) return 40
  return 44
}

// Cells in the context gauge. Twelve reads as a gauge at a glance without
// eating the row; it is the one piece of the rail that is a picture, not text.
const METER_CELLS = 12

// The status rail: a slim column on the left, the chat beside it.
//
// Side by side, not on top. An overlay reads as a smudge over whatever message
// happens to be under it; a column means nothing is ever covered and the chat
// simply wraps to the width it actually has. Left, because a right rail is what
// every other client does and this one is arena.
//
// The fill is the active theme's panel colour at low alpha: it darkens with a
// dark theme and lightens with a light one, so the transcript stays legible
// behind it. You do not have to open anything to read your stats - the gauge
// and the labels are the whole interface.
export function StatusPanel(props: { sessionID: string; onClose: () => void }) {
  const { theme } = useTheme()
  const sync = useSync()
  const dimensions = useTerminalDimensions()
  const width = createMemo(() => statusPanelWidth(dimensions().width))
  const innerWidth = createMemo(() => Math.max(8, width() - 4))

  const messages = createMemo(() => sync.data.message[props.sessionID] ?? [])
  const todo = createMemo(() => sync.data.todo[props.sessionID] ?? [])
  const diff = createMemo(() => sync.data.session_diff[props.sessionID] ?? [])

  const mcpEntries = createMemo(() => Object.entries(sync.data.mcp).sort(([a], [b]) => a.localeCompare(b)))
  const mcpUp = createMemo(() => mcpEntries().filter(([, x]) => x.status === "connected").length)
  const brokenMcp = createMemo(() =>
    mcpEntries().filter(([, x]) => x.status !== "connected" && x.status !== "disabled"),
  )
  const disabledMcp = createMemo(() => mcpEntries().filter(([, x]) => x.status === "disabled").length)

  const cost = createMemo(() => messages().reduce((sum, x) => sum + (x.role === "assistant" ? x.cost : 0), 0))
  const spent = createMemo(() =>
    cost() > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cost()) : undefined,
  )

  // The model that produced the last token. Watching this change is how you
  // see a free lane rotate — the rail is where that becomes visible.
  const model = createMemo(() => {
    const last = messages().findLast((x) => x.role === "assistant") as AssistantMessage | undefined
    if (!last) return undefined
    return { provider: last.providerID, id: last.modelID }
  })

  const context = createMemo(() => {
    const last = messages().findLast((x) => x.role === "assistant" && x.tokens.output > 0) as
      | AssistantMessage
      | undefined
    if (!last) return undefined
    const total =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    const info = sync.data.provider.find((x) => x.id === last.providerID)?.models[last.modelID]
    return {
      total,
      percentage: info?.limit.context ? Math.round((total / info.limit.context) * 100) : null,
    }
  })

  // Fill colour tracks pressure: calm while there is room, warning as it fills,
  // error when the window is nearly spent. A number alone never reads as urgent.
  const meter = createMemo(() => {
    const pct = Math.min(100, Math.max(0, context()?.percentage ?? 0))
    const filled = Math.round((pct / 100) * METER_CELLS)
    return {
      pct,
      filled,
      empty: Math.max(0, METER_CELLS - filled),
      color: pct >= 80 ? theme.error : pct >= 55 ? theme.warning : theme.success,
    }
  })

  const openTodos = createMemo(() => todo().filter((t) => t.status !== "completed"))
  const doneTodos = createMemo(() => todo().filter((t) => t.status === "completed").length)
  const changed = createMemo(() => diff().slice(0, 4))
  const additions = createMemo(() => diff().reduce((sum, x) => sum + (x.additions ?? 0), 0))
  const deletions = createMemo(() => diff().reduce((sum, x) => sum + (x.deletions ?? 0), 0))

  function compact(n: number) {
    if (n < 1_000) return `${n}`
    if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`
    return `${(n / 1_000_000).toFixed(1)}m`
  }

  function fit(s: string, max: number) {
    return s.length > max ? s.slice(0, Math.max(0, max - 1)) + "…" : s
  }

  // Micro-label gutter. Dim and fixed width so the values to their right line
  // up down the whole rail instead of wandering with each label's length.
  const LABEL = 8
  const Label = (p: { text: string }) => (
    <box width={LABEL} flexShrink={0}>
      <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
        {p.text}
      </text>
    </box>
  )

  const Rule = () => (
    <text fg={withAlpha(theme.borderSubtle, 160)} selectable={false} wrapMode="none">
      {"─".repeat(innerWidth())}
    </text>
  )

  return (
    <box
      width={width()}
      height="100%"
      flexShrink={0}
      flexDirection="column"
      backgroundColor={withAlpha(theme.backgroundPanel, 140)}
      border={["left"]}
      borderColor={withAlpha(theme.borderSubtle, 120)}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
    >
      <box flexDirection="column" gap={1}>
        {/* Wordmark and the one key that closes the rail. The ✕ is the only
            control here; everything else is read-only telemetry. */}
        <box flexDirection="row" justifyContent="space-between" flexShrink={0}>
          <text selectable={false} wrapMode="none">
            <span style={{ fg: theme.primary }}>◆</span>
            <span style={{ fg: theme.text, bold: true }}> status</span>
            <span style={{ fg: theme.textMuted }}> · {props.sessionID.slice(-6)}</span>
          </text>
          <box onMouseUp={props.onClose} paddingLeft={2}>
            <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
              ✕
            </text>
          </box>
        </box>

        <Rule />

        {/* Which lane is answering. Rotation lives here: when a free model dies
            and the turn is replayed elsewhere, this string is what changes. */}
        <Show when={model()}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Label text="model" />
            <text fg={theme.text} selectable={false} wrapMode="none">
              {fit(`${model()!.provider}/${model()!.id}`, Math.max(6, innerWidth() - LABEL - 1))}
            </text>
          </box>
        </Show>

        {/* The centrepiece: a gauge plus the number it stands for. Always
            shown, even at zero, because an element that appears and vanishes
            makes the rail jump under you. */}
        <box flexDirection="row" gap={1} flexShrink={0}>
          <Label text="context" />
          <box flexDirection="column" flexGrow={1} minWidth={0}>
            <text selectable={false} wrapMode="none">
              <span style={{ fg: meter().color }}>{"▰".repeat(meter().filled)}</span>
              <span style={{ fg: theme.borderSubtle }}>{"▱".repeat(meter().empty)}</span>
            </text>
            <text fg={theme.text} selectable={false} wrapMode="none">
              {compact(context()?.total ?? 0)}
              <Show when={context()?.percentage != null}>
                <span style={{ fg: theme.textMuted }}> · {context()!.percentage}%</span>
              </Show>
              <Show when={spent()}>
                <span style={{ fg: theme.textMuted }}> · {spent()}</span>
              </Show>
            </text>
          </box>
        </box>

        <Show when={mcpEntries().length > 0}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Label text="mcp" />
            <box flexDirection="column" flexGrow={1} minWidth={0}>
              <text selectable={false} wrapMode="none">
                <span style={{ fg: brokenMcp().length > 0 ? theme.warning : theme.success }}>{mcpUp()}</span>
                <span style={{ fg: theme.textMuted }}> up</span>
                <Show when={brokenMcp().length + disabledMcp() > 0}>
                  <span style={{ fg: theme.textMuted }}> · {mcpEntries().length} total</span>
                </Show>
              </text>
              <For each={brokenMcp().slice(0, 4)}>
                {([key, item]) => (
                  <box flexDirection="row" gap={1} flexShrink={0}>
                    <text
                      flexShrink={0}
                      selectable={false}
                      style={{
                        fg: item.status === "needs_auth" ? theme.warning : theme.error,
                      }}
                    >
                      •
                    </text>
                    <text fg={theme.textMuted} selectable={false} wrapMode="none">
                      {key}
                    </text>
                  </box>
                )}
              </For>
            </box>
          </box>
        </Show>

        <Show when={sync.data.lsp.length > 0}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Label text="lsp" />
            <text fg={theme.textMuted} selectable={false} wrapMode="none">
              {sync.data.lsp.map((x) => x.id).join(" · ")}
            </text>
          </box>
        </Show>

        <Show when={openTodos().length > 0}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Label text="todo" />
            <box flexDirection="column" flexGrow={1} minWidth={0}>
              <text selectable={false} wrapMode="none">
                <span style={{ fg: theme.text }}>{openTodos().length}</span>
                <span style={{ fg: theme.textMuted }}> open</span>
                <Show when={doneTodos() > 0}>
                  <span style={{ fg: theme.textMuted }}> · {doneTodos()} done</span>
                </Show>
              </text>
              <For each={openTodos().slice(0, 5)}>
                {(t) => <TodoItem status={t.status} content={t.content} />}
              </For>
              <Show when={openTodos().length > 5}>
                <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
                  +{openTodos().length - 5} more
                </text>
              </Show>
            </box>
          </box>
        </Show>

        <Show when={changed().length > 0}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Label text="changed" />
            <box flexDirection="column" flexGrow={1} minWidth={0}>
              <text selectable={false} wrapMode="none">
                <span style={{ fg: theme.text }}>{diff().length} files</span>
                <span style={{ fg: theme.success }}> +{additions()}</span>
                <span style={{ fg: theme.error }}> -{deletions()}</span>
              </text>
              <For each={changed()}>
                {(item) => (
                  <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false} wrapMode="none">
                    {fit(path.basename(item.file), Math.max(6, innerWidth() - LABEL - 1))}
                  </text>
                )}
              </For>
            </box>
          </box>
        </Show>

        <Show when={openTodos().length === 0 && doneTodos() > 0}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <Label text="todo" />
            <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
              {doneTodos()} done
            </text>
          </box>
        </Show>
      </box>
    </box>
  )
}
