import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"

export function Logo() {
  const { theme } = useTheme()
  return (
    <box flexDirection="row" gap={1} alignItems="center" justifyContent="center">
      <text fg={theme.textMuted}>✦</text>
      <text fg={theme.text} attributes={TextAttributes.BOLD}>arena</text>
      <text fg={theme.textMuted}>code</text>
    </box>
  )
}
