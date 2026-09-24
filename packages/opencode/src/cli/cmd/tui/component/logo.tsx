import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"

export function Logo() {
  const { theme } = useTheme()
  return (
    <box flexDirection="column" alignItems="center" gap={0} paddingBottom={1}>
      <box flexDirection="row" gap={1} alignItems="center">
        <text fg={theme.primary} attributes={TextAttributes.BOLD}>◈</text>
        <text fg={theme.text} attributes={TextAttributes.BOLD}>ARENA</text>
        <text fg={theme.primary} attributes={TextAttributes.BOLD}>CODE</text>
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>◈</text>
        <text fg={theme.textMuted}>·</text>
        <text fg={theme.error}>●</text>
        <text fg={theme.warning}>●</text>
        <text fg={theme.success}>●</text>
      </box>
      <box height={1} />
      <text fg={theme.text} attributes={TextAttributes.BOLD}>What can I build for you?</text>
      <text fg={theme.textMuted}>Interact with Arena Code and explore the boundless creative world</text>
      <text fg={theme.textMuted}>○ nova-dark · orange-black · aesthetic · ◈</text>
    </box>
  )
}
