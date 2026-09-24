import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"

// Big 3-line wordmark. Used whenever the pane is wide enough to hold it.
const BANNER_BIG = [
  " ▄▄▄  ▄▄▄▄  ▄▄▄▄▄ ▄▄  ▄▄  ▄▄▄     ▄▄▄▄  ▄▄▄  ▄▄▄▄  ▄▄▄▄▄",
  "██▀██ ██▄█▄ ██▄▄  ███▄██ ██▀██   ██▀▀▀ ██▀██ ██▀██ ██▄▄",
  "██▀██ ██ ██ ██▄▄▄ ██ ▀██ ██▀██   ▀████ ▀███▀ ████▀ ██▄▄▄",
]

// Compact 2-line fallback for narrow panes.
const BANNER_SMALL = [
  "▄▀█ █▀█ █▀▀ █▄ █ ▄▀█ █▀▀ █▀█ █▀▄ █▀▀",
  "█▀█ █▀▄ ██▄ █ ▀█ █▀█ █▄▄ █▄█ █▄▀ ██▄",
]

// `flexShrink={0}` is load-bearing: without it the parent flex column shrinks
// the box and the lines overdraw each other into unreadable glyph soup.
export function OldBanner() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const lines = () => (dimensions().width >= 64 ? BANNER_BIG : BANNER_SMALL)
  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" gap={0} width="100%" flexShrink={0}>
      <For each={lines()}>
        {(line, index) => (
          <text
            fg={index() === 2 ? theme.secondary : theme.primary}
            attributes={TextAttributes.BOLD}
            selectable={false}
          >
            {line}
          </text>
        )}
      </For>
    </box>
  )
}

export function Logo() {
  const { theme } = useTheme()
  return (
    <box flexDirection="column" alignItems="center" gap={0} flexShrink={0}>
      <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
        What can I build for you?
      </text>
      <text fg={theme.textMuted} selectable={false}>
        Interact with Arena Code and explore the boundless creative world
      </text>
    </box>
  )
}
