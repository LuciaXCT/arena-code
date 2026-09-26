import { createMemo, For, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme, withAlpha } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { useDirectory } from "@tui/context/directory"
import { TodoItem } from "./todo-item"
import path from "path"
import os from "node:os"
import type { AssistantMessage } from "@opencode-ai/sdk/v2"

// A frosted-glass status card. Hidden by default so the chat stays quiet, one
// keybind away when you actually want to see Context / MCP / LSP / Todo. The
// alpha on the background is the whole point - the conversation stays faintly
// visible behind it instead of being walled off by an opaque panel.
export function StatusPanel(props: { sessionID: string; onClose: () => void }) {
  const { theme } = useTheme()
  const sync = useSync()
  const dimensions = useTerminalDimensions()
  const directory = useDirectory()

  const messages = createMemo(() => sync.data.message[props.sessionID] ?? [])
  const todo = createMemo(() => sync.data.todo[props.sessionID] ?? [])
  const diff = createMemo(() => sync.data.session_diff[props.sessionID] ?? [])

  const mcpEntries = createMemo(() => Object.entries(sync.data.mcp).sort(([a], [b]) => a.localeCompare(b)))
  const connectedMcp = createMemo(() => mcpEntries().filter(([, x]) => x.status === "connected").length)
  const errorMcp = createMemo(
    () =>
      mcpEntries().filter(
        ([, x]) => x.status === "failed" || x.status === "needs_auth" || x.status === "needs_client_registration",
      ).length,
  )

  const cost = createMemo(() => {
    const total = messages().reduce((sum, x) => sum + (x.role === "assistant" ? x.cost : 0), 0)
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)
  })

  const context = createMemo(() => {
    const last = messages().findLast((x) => x.role === "assistant" && x.tokens.output > 0) as AssistantMessage | undefined
    if (!last) return undefined
    const total =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    const model = sync.data.provider.find((x) => x.id === last.providerID)?.models[last.modelID]
    return {
      tokens: total.toLocaleString(),
      percentage: model?.limit.context ? Math.round((total / model.limit.context) * 100) : null,
    }
  })

  const openTodos = createMemo(() => todo().filter((t) => t.status !== "completed"))

  // Section header: tiny, dim, uppercase-ish label. No rules, no boxes.
  const Label = (p: { children: string }) => (
    <text fg={theme.textMuted} attributes={TextAttributes.DIM} selectable={false}>
      {p.children}
    </text>
  )

  return (
    <box
      position="absolute"
      top={2}
      right={2}
      width={46}
      maxHeight={Math.max(6, dimensions().height - 4)}
      flexDirection="column"
      backgroundColor={withAlpha(theme.backgroundPanel, 210)}
      border={["top", "bottom", "left", "right"]}
      borderColor={withAlpha(theme.borderSubtle, 140)}
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
    >
      <scrollbox flexGrow={1} minHeight={0} scrollbarOptions={{ visible: false }}>
        <box flexDirection="column" gap={1}>
          <box flexDirection="row" justifyContent="space-between" flexShrink={0}>
            <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
              Status
            </text>
            <box onMouseUp={props.onClose}>
              <text fg={theme.textMuted} selectable={false}>
                esc
              </text>
            </box>
          </box>

          <box flexDirection="column" flexShrink={0}>
            <Label>Context</Label>
            <text fg={theme.textMuted} selectable={false}>
              {context()?.tokens ?? 0} tokens
              <Show when={context()?.percentage !== null}> · {context()?.percentage}% used</Show>
            </text>
            <text fg={theme.textMuted} selectable={false}>
              {cost()} spent
            </text>
          </box>

          <Show when={mcpEntries().length > 0}>
            <box flexDirection="column" flexShrink={0}>
              <Label>MCP</Label>
              <text fg={theme.textMuted} selectable={false}>
                {connectedMcp()} connected
                <Show when={errorMcp() > 0}> · {errorMcp()} error{errorMcp() > 1 ? "s" : ""}</Show>
              </text>
              <For each={mcpEntries()}>
                {([key, item]) => (
                  <box flexDirection="row" gap={1}>
                    <text
                      flexShrink={0}
                      selectable={false}
                      style={{
                        fg: (
                          {
                            connected: theme.success,
                            failed: theme.error,
                            disabled: theme.textMuted,
                            needs_auth: theme.warning,
                            needs_client_registration: theme.error,
                          } as Record<string, typeof theme.success>
                        )[item.status],
                      }}
                    >
                      •
                    </text>
                    <text fg={theme.text} selectable={false} wrapMode="word">
                      {key}
                    </text>
                  </box>
                )}
              </For>
            </box>
          </Show>

          <box flexDirection="column" flexShrink={0}>
            <Label>LSP</Label>
            <Show
              when={sync.data.lsp.length > 0}
              fallback={
                <text fg={theme.textMuted} selectable={false}>
                  {sync.data.config.lsp === false ? "disabled in settings" : "starts as files are read"}
                </text>
              }
            >
              <For each={sync.data.lsp}>
                {(item) => (
                  <box flexDirection="row" gap={1}>
                    <text
                      flexShrink={0}
                      selectable={false}
                      style={{ fg: item.status === "connected" ? theme.success : theme.error }}
                    >
                      •
                    </text>
                    <text fg={theme.textMuted} selectable={false}>
                      {item.id}
                    </text>
                  </box>
                )}
              </For>
            </Show>
          </box>

          <Show when={openTodos().length > 0}>
            <box flexDirection="column" flexShrink={0}>
              <Label>Todo</Label>
              <For each={openTodos()}>{(t) => <TodoItem status={t.status} content={t.content} />}</For>
            </box>
          </Show>

          <Show when={diff().length > 0}>
            <box flexDirection="column" flexShrink={0}>
              <Label>Changed</Label>
              <For each={diff()}>
                {(item) => (
                  <box flexDirection="row" gap={1} justifyContent="space-between">
                    <text fg={theme.textMuted} selectable={false} wrapMode="char">
                      {path.basename(item.file)}
                    </text>
                    <box flexDirection="row" gap={1} flexShrink={0}>
                      <Show when={item.additions}>
                        <text fg={theme.diffAdded} selectable={false}>
                          +{item.additions}
                        </text>
                      </Show>
                      <Show when={item.deletions}>
                        <text fg={theme.diffRemoved} selectable={false}>
                          -{item.deletions}
                        </text>
                      </Show>
                    </box>
                  </box>
                )}
              </For>
            </box>
          </Show>

          <box flexDirection="column" flexShrink={0} paddingTop={1}>
            <Label>Next</Label>
            <text fg={theme.textMuted} selectable={false}>
              ctrl+p commands · ctrl+x l sessions
            </text>
            <text fg={theme.textMuted} selectable={false}>
              {directory().replace(os.homedir(), "~")}
            </text>
          </box>
        </box>
      </scrollbox>
    </box>
  )
}
