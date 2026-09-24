import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"

// "ARENA CODE" as a fixed-width half-block wordmark. Every glyph is 5 cells
// wide and every row is exactly the same length, so the rows stay locked to
// each other when each one is centred. Unequal row lengths shift the rows
// against each other by a sub-character amount and the wordmark reads wrong.
const BANNER_BIG = [
  "▄▀▀▄ █▀▀▄ █▀▀▀ █  █ ▄▀▀▄     ▄▀▀▀ ▄▀▀▄ █▀▀▄ █▀▀▀",
  "█▄▄█ █▄▄▀ █▀▀  ██ █ █▄▄█     █    █  █ █  █ █▀▀ ",
  "█  █ █  █ █▄▄▄ █ ██ █  █     ▀▄▄▄ ▀▄▄▀ █▄▄▀ █▄▄▄",
]

// Same glyphs, no inter-letter gap, for panes too narrow for the full mark.
const BANNER_SMALL = [
  "▄▀▀▄█▀▀▄█▀▀▀█  █▄▀▀▄▄▀▀▀▄▀▀▄█▀▀▄█▀▀▀",
  "█▄▄██▄▄▀█▀▀ ██ ██▄▄██   █  ██  ██▀▀ ",
  "█  ██  ██▄▄▄█ ███  █▀▄▄▄▀▄▄▀█▄▄▀█▄▄▄",
]

// `flexShrink={0}` is load-bearing: without it the parent flex column shrinks
// the box and the lines overdraw each other into unreadable glyph soup.
export function OldBanner() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const lines = () => (dimensions().width >= 56 ? BANNER_BIG : BANNER_SMALL)
  // Pad to this banner's own width - padding to the other one would shift it.
  const width = () => Math.max(...lines().map((line) => line.length))
  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" gap={0} width="100%" flexShrink={0}>
      <For each={lines()}>
        {(line, index) => (
          <text
            fg={index() === 2 ? theme.secondary : theme.primary}
            attributes={TextAttributes.BOLD}
            selectable={false}
          >
            {line.padEnd(width(), " ")}
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
