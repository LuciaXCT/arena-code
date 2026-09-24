import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { For, Show } from "solid-js"
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

// Narrow panes get a plain tag rather than a squeezed wordmark - too narrow
// for block letters, and a second ASCII variant is just another thing to
// keep aligned.
const BANNER_MARK = "◆"
const BANNER_WORD = "ARENA CODE"

// `flexShrink={0}` is load-bearing: without it the parent flex column shrinks
// the box and the lines overdraw each other into unreadable glyph soup.
export function OldBanner() {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()
  const wide = () => dimensions().width >= 56
  // Pad to the banner's own width - uneven rows centre independently and drift.
  const width = () => Math.max(...BANNER_BIG.map((line) => line.length))
  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" gap={0} width="100%" flexShrink={0}>
      <Show
        when={wide()}
        fallback={
          <text selectable={false}>
            <span style={{ fg: theme.secondary }}>{BANNER_MARK} </span>
            <span style={{ fg: theme.primary, bold: true }}>{BANNER_WORD}</span>
          </text>
        }
      >
        <For each={BANNER_BIG}>
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
      </Show>
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
