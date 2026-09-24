import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useTerminalDimensions } from "@opentui/solid"
import { createMemo, For, Show } from "solid-js"

const OLD_BANNER = [
  "▄▀█ █▀█ █▀▀ █▄ █ ▄▀█   █▀▀ █▀█ █▀▄ █▀▀",
  "█▀█ █▀▄ ██▄ █ ▀█ █▀█   █▄▄ █▄█ █▄▀ ██▄",
]

export function Logo() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const cols = createMemo(() => dimensions().width)

  return (
    <box flexDirection="column" alignItems="center" gap={0} paddingBottom={1}>
      <Show when={cols() >= 100} fallback={
        <box flexDirection="row" gap={1} alignItems="center">
          <text fg={theme.primary} attributes={TextAttributes.BOLD}>◈</text>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>ARENA</text>
          <text fg={theme.primary} attributes={TextAttributes.BOLD}>CODE</text>
          <text fg={theme.primary} attributes={TextAttributes.BOLD}>◈</text>
        </box>
      }>
        <For each={OLD_BANNER}>{(line) => <text fg={theme.primary} attributes={TextAttributes.BOLD}>{line}</text>}</For>
      </Show>

      <box height={1} />

      <box flexDirection="column" alignItems="center" gap={0}>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>What can I build for you?</text>
        <text fg={theme.textMuted}>Interact with Arena Code and explore the boundless creative world</text>
        <box flexDirection="row" gap={1} alignItems="center" marginTop={1}>
          <text fg={theme.textMuted}>○ nova-dark · orange-black · old banner + new design · ◈</text>
        </box>
      </box>
    </box>
  )
}
