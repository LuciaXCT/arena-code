import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo } from "solid-js"
import { For, Show } from "solid-js"

const LOGO_WIDE = [
  "▄▀█ █▀█ █▀▀ █▄ █ ▄▀█   █▀▀ █▀█ █▀▄ █▀▀",
  "█▀█ █▀▄ ██▄ █ ▀█ █▀█   █▄▄ █▄█ █▄▀ ██▄",
]
const LOGO_MID = ["◈  ARENA CODE  ◈"]
const LOGO_SMALL = ["ARENA CODE"]

export function Logo() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const cols = createMemo(() => dimensions().width)

  return (
    <box flexDirection="column" alignItems="center" gap={0} paddingBottom={1}>
      <Show when={cols() >= 130} fallback={
        <Show when={cols() >= 90} fallback={
          <text fg={theme.primary} attributes={TextAttributes.BOLD}>{LOGO_SMALL[0]}</text>
        }>
          <text fg={theme.primary} attributes={TextAttributes.BOLD}>{LOGO_MID[0]}</text>
        </Show>
      }>
        <For each={LOGO_WIDE}>
          {(line, idx) => (
            <text fg={idx() === 0 ? theme.primary : theme.accent} attributes={TextAttributes.BOLD}>{line}</text>
          )}
        </For>
      </Show>
      <text fg={theme.textMuted}>Interact with Arena Code and explore the boundless world</text>
    </box>
  )
}
