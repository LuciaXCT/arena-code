import { TextAttributes } from "@opentui/core"
import { For } from "solid-js"
import { useTheme } from "@tui/context/theme"

// OLD BANNER compact - original ARENA CODE block but tight spacing
const LOGO_COMPACT = [
  " ▄▄▄  ▄▄▄▄  ▄▄▄▄▄ ▄▄  ▄▄  ▄▄▄     ▄▄▄▄  ▄▄▄  ▄▄▄▄  ▄▄▄▄▄",
  "██▀██ ██▄█▄ ██▄▄  ███▄██ ██▀██   ██▀▀▀ ██▀██ ██▀██ ██▄▄",
  "██▀██ ██ ██ ██▄▄▄ ██ ▀██ ██▀██   ▀████ ▀███▀ ████▀ ██▄▄▄",
]

export function Logo() {
  const { theme } = useTheme()
  return (
    <box flexDirection="column" gap={0} alignItems="center" justifyContent="center">
      <For each={LOGO_COMPACT}>
        {(line) => (
          <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
            {line}
          </text>
        )}
      </For>
    </box>
  )
}
