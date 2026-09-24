import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"

export function Logo() {
  const { theme } = useTheme()
  return (
    <box flexDirection="column" alignItems="center" gap={0} paddingBottom={1}>
      <text fg={theme.primary} attributes={TextAttributes.BOLD}>◈ ARENA CODE ◈</text>
      <box height={1} />
      <text fg={theme.text} attributes={TextAttributes.BOLD}>What can I build for you?</text>
      <text fg={theme.textMuted}>Interact with Arena Code and explore the boundless creative world</text>
    </box>
  )
}
