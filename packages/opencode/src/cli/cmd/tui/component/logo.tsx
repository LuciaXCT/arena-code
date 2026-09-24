import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"

export function Logo() {
  const { theme } = useTheme()
  return (
    <box flexDirection="column" alignItems="center" gap={0}>
      <text fg={theme.text} attributes={TextAttributes.BOLD}>What can I build for you?</text>
      <text fg={theme.textMuted}>Interact with Arena Code and explore the boundless creative world</text>
      <box flexDirection="row" gap={1} alignItems="center" marginTop={1}>
        <text fg={theme.textMuted}>○ nova-dark · orange-black · aesthetic · ◈</text>
      </box>
    </box>
  )
}

export function OldBanner() {
  const { theme } = useTheme()
  return (
    <box flexDirection="column" alignItems="center" gap={0} width="100%" backgroundColor={theme.background}>
      <text fg={theme.primary} attributes={TextAttributes.BOLD}>▄▀█ █▀█ █▀▀ █▄ █ ▄▀█   █▀▀ █▀█ █▀▄ █▀▀</text>
      <text fg={theme.primary} attributes={TextAttributes.BOLD}>█▀█ █▀▄ ██▄ █ ▀█ █▀█   █▄▄ █▄█ █▄▀ ██▄</text>
    </box>
  )
}
