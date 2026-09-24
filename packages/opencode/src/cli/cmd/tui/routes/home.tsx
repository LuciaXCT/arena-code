import { Prompt, type PromptRef } from "@tui/component/prompt"
import { createMemo, For, onMount, Show, createSignal } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useDirectory } from "../context/directory"
import { useRoute, useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { Installation } from "@/installation"
import { Flag } from "@/flag/flag"
import { useCommandDialog } from "../component/dialog-command"
import { useTerminalDimensions } from "@opentui/solid"
import { Logo } from "../component/logo"

let once = false

function timeAgo(iso: string | number) {
  const ms = typeof iso === "number" ? iso : new Date(iso).getTime()
  const d = Date.now() - ms
  const m = Math.floor(d / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const Rounded = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
  topT: "┬",
  bottomT: "┴",
  leftT: "├",
  rightT: "┤",
  cross: "┼",
}

const CHIPS = ["Landing Page", "Knowledge Base", "3D Modeling", "Mini Game", "Personal Blog", "Dashboard"]

export function Home() {
  const sync = useSync()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
  const dimensions = useTerminalDimensions()
  const wide = createMemo(() => dimensions().width > 100)

  const recentSessions = createMemo(() => {
    const list = sync.data.session
    if (!list || list.length === 0) return []
    return list.filter((x) => (x as any).parentID === undefined).toSorted((a, b) => b.time.updated - a.time.updated).slice(0, 8)
  })

  let prompt: PromptRef
  const args = useArgs()
  const router = useRoute()
  onMount(() => {
    if (once) return
    if (route.initialPrompt) { prompt.set(route.initialPrompt); once = true }
    else if (args.prompt) { prompt.set({ input: args.prompt, parts: [] }); once = true; prompt.submit() }
  })
  const directory = useDirectory()
  const versionText = Flag.isArena() ? (process.env.ARENA_VERSION ?? Installation.VERSION) : Installation.VERSION

  const [newChatHover, setNewChatHover] = createSignal(false)
  const [searchHover, setSearchHover] = createSignal(false)

  return (
    <box flexDirection="row" width="100%" height="100%">
      <Show when={wide()}>
        <box flexDirection="column" width={32} height="100%" backgroundColor={theme.backgroundElement} border={["right"]} borderColor={theme.borderSubtle} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} gap={1}>
          <box flexDirection="row" gap={1} alignItems="center" paddingLeft={1}>
            <text fg={theme.error}>●</text>
            <text fg={theme.warning}>●</text>
            <text fg={theme.success}>●</text>
            <text fg={theme.textMuted}>○</text>
            <box flexGrow={1} />
            <text fg={theme.primary}>◈</text>
          </box>
          <box flexDirection="column" gap={0} marginTop={1} paddingLeft={1}>
            <box flexDirection="row" gap={1} alignItems="center">
              <text fg={theme.primary} attributes={TextAttributes.BOLD}>◈ ARENA</text>
              <text fg={theme.text} attributes={TextAttributes.BOLD}>CODE</text>
            </box>
            <text fg={theme.textMuted}>· {versionText} · nova-dark · ◈</text>
          </box>
          <box marginTop={1} border={["top","bottom","left","right"]} borderColor={newChatHover() ? theme.accent : theme.primary} customBorderChars={Rounded} backgroundColor={newChatHover() ? theme.accentDim : theme.backgroundPanel} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0} justifyContent="center" alignItems="center" onMouseOver={() => setNewChatHover(true)} onMouseOut={() => setNewChatHover(false)} onMouseUp={() => router.navigate({ type: "home" })}>
            <text fg={newChatHover() ? theme.text : theme.primary} attributes={TextAttributes.BOLD}>✦ New Chat · ○</text>
          </box>
          <box border={["top","bottom","left","right"]} borderColor={searchHover() ? theme.primary : theme.borderSubtle} customBorderChars={Rounded} backgroundColor={searchHover() ? theme.backgroundPanel : theme.backgroundElement} paddingLeft={1} paddingRight={1} flexDirection="row" gap={1} alignItems="center" onMouseOver={() => setSearchHover(true)} onMouseOut={() => setSearchHover(false)} onMouseUp={() => command.show()}>
            <text fg={searchHover() ? theme.primary : theme.textMuted}>○ Search skills · agents</text>
            <box flexGrow={1} />
            <text fg={theme.textMuted}>⌘P</text>
          </box>
          <box marginTop={1} flexDirection="row" gap={1} alignItems="center" paddingLeft={1}>
            <text fg={theme.text} attributes={TextAttributes.BOLD}>◈ Sessions</text>
            <text fg={theme.textMuted}>· {recentSessions().length}</text>
            <text fg={theme.textMuted}>· /s · Ctrl+XL</text>
          </box>
          <box flexDirection="column" gap={0} flexGrow={1}>
            <For each={recentSessions()}>{(s) => {
              const [hover, setHover] = createSignal(false)
              const title = ((s as any).title || "New session").slice(0, 16)
              const age = timeAgo(s.time.updated)
              const sid = s.id.slice(0, 7)
              return (
                <box flexDirection="column" gap={0} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} border={["bottom"]} borderColor={hover() ? theme.primary : theme.borderSubtle} backgroundColor={hover() ? theme.backgroundPanel : theme.backgroundElement} onMouseOver={() => setHover(true)} onMouseOut={() => setHover(false)} onMouseUp={() => router.navigate({ type: "session", sessionID: s.id })}>
                  <box flexDirection="row" gap={1} alignItems="center">
                    <text fg={hover() ? theme.primary : theme.textMuted}>{hover() ? "●" : "○"}</text>
                    <text fg={hover() ? theme.primary : theme.text} attributes={hover() ? TextAttributes.BOLD : 0}>{title}</text>
                  </box>
                  <box flexDirection="row" gap={1} paddingLeft={2} alignItems="center">
                    <text fg={hover() ? theme.accent : theme.textMuted}>{age} · {sid} · ◈</text>
                  </box>
                </box>
              )
            }}</For>
          </box>
          <box flexDirection="column" gap={0} border={["top"]} borderColor={theme.borderSubtle} paddingTop={1} paddingLeft={1}>
            <text fg={theme.textMuted}>○ {directory().toString().slice(0, 20)}</text>
            <text fg={theme.textMuted}>○ {versionText} · fit · ◈</text>
          </box>
        </box>
      </Show>

      <box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" backgroundColor={theme.background} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1}>
        <Logo />
        <box flexDirection="row" gap={1} alignItems="center" marginBottom={1} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement}>
          <text fg={theme.primary}>✦ arena</text>
          <text fg={theme.textMuted}>· {versionText}</text>
          <text fg={theme.textMuted}>· nova-dark · orange-black</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.error}>●</text>
          <text fg={theme.warning}>●</text>
          <text fg={theme.success}>●</text>
          <text fg={theme.textMuted}>○ ◈</text>
        </box>

        <box flexDirection="column" width="75%" maxWidth={82} backgroundColor={theme.backgroundPanel} border={["top","bottom","left","right"]} borderColor={theme.primary} customBorderChars={Rounded} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1}>
          <Prompt ref={(r) => { prompt = r; promptRef.set(r) }} />
        </box>

        <box flexDirection="row" gap={1} justifyContent="center" marginTop={1} alignItems="center">
          <text fg={theme.textMuted}>○ tab agent</text>
          <text fg={theme.textMuted}>· ⌘P search</text>
          <text fg={theme.textMuted}>· ⌘L sessions</text>
          <text fg={theme.textMuted}>· ◈ aesthetic</text>
        </box>

        <box flexDirection="row" gap={1} flexWrap="wrap" justifyContent="center" maxWidth={82} marginTop={1}>
          <For each={CHIPS}>{(chip) => {
            const [chipHover, setChipHover] = createSignal(false)
            return (
              <box paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} border={["top","bottom","left","right"]} borderColor={chipHover() ? theme.primary : theme.borderSubtle} backgroundColor={chipHover() ? theme.backgroundPanel : theme.backgroundElement} customBorderChars={Rounded} onMouseOver={() => setChipHover(true)} onMouseOut={() => setChipHover(false)} onMouseUp={() => prompt?.set({ input: `Build a beautiful ${chip} with modern aesthetic, orange-black nova-dark theme, clean typography`, parts: [] })}>
                <text fg={chipHover() ? theme.primary : theme.textMuted}>○ {chip}</text>
              </box>
            )
          }}</For>
        </box>

        <Show when={recentSessions().length > 0}>
          <box flexDirection="column" width="75%" maxWidth={82} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} gap={1} marginTop={1}>
            <box flexDirection="row" gap={1} alignItems="center" marginBottom={0}>
              <text fg={theme.primary} attributes={TextAttributes.BOLD}>◈ Recent Sessions</text>
              <text fg={theme.textMuted}>· {recentSessions().length} · restore · ○ ● ●</text>
            </box>
            <For each={recentSessions().slice(0,4)}>{(s) => {
              const [hover, setHover] = createSignal(false)
              const title = ((s as any).title || "New session").slice(0, 20)
              const sidShort = s.id.slice(0, 8)
              const age = timeAgo(s.time.updated)
              return (
                <box flexDirection="column" gap={0} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={1} border={["bottom"]} borderColor={hover() ? theme.primary : theme.borderSubtle} backgroundColor={hover() ? theme.backgroundPanel : theme.backgroundElement} onMouseOver={() => setHover(true)} onMouseOut={() => setHover(false)} onMouseUp={() => router.navigate({ type: "session", sessionID: s.id })}>
                  <box flexDirection="row" gap={1} alignItems="center">
                    <text fg={hover() ? theme.primary : theme.textMuted}>{hover() ? "●" : "○"}</text>
                    <text fg={hover() ? theme.primary : theme.text} attributes={hover() ? TextAttributes.BOLD : 0}>{title}</text>
                    <text fg={theme.textMuted}>· {age}</text>
                  </box>
                  <box paddingLeft={2} flexDirection="row" gap={1} alignItems="center">
                    <text fg={hover() ? theme.accent : theme.primary}>opencode -s {sidShort}</text>
                    <text fg={theme.textMuted}>· ◈ {sidShort}</text>
                  </box>
                </box>
              )
            }}</For>
          </box>
        </Show>

        <box marginTop={1} flexDirection="row" gap={1} alignItems="center">
          <text fg={theme.textMuted}>○ {versionText} · nova-dark #0A0A0A #FF5500 · aesthetic · clickable colour · fit · no garble · best UI forever · ◈</text>
        </box>
        <Toast />
      </box>
    </box>
  )
}
