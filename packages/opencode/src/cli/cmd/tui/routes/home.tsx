import { Prompt, type PromptRef } from "@tui/component/prompt"
import { createMemo, For, onMount, Show } from "solid-js"
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

const CHIPS = ["Landing Page", "Knowledge", "3D Modeling", "Mini Game", "Personal Blog"]

export function Home() {
  const sync = useSync()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
  const dimensions = useTerminalDimensions()
  const wide = createMemo(() => dimensions().width > 95)

  const recentSessions = createMemo(() => {
    const list = sync.data.session
    if (!list || list.length === 0) return []
    return list.filter((x) => (x as any).parentID === undefined).toSorted((a, b) => b.time.updated - a.time.updated).slice(0, 6)
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

  return (
    <box flexDirection="row" width="100%" height="100%">
      <Show when={wide()}>
        <box flexDirection="column" width={28} height="100%" backgroundColor={theme.backgroundElement} border={["right"]} borderColor={theme.borderSubtle} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} gap={1}>
          <box flexDirection="row" gap={1}>
            <text fg={theme.error}>●</text>
            <text fg={theme.warning}>●</text>
            <text fg={theme.success}>●</text>
          </box>
          <box flexDirection="row" gap={1} marginTop={1}>
            <text fg={theme.primary} attributes={TextAttributes.BOLD}>arenacode</text>
            <text fg={theme.textMuted}>{versionText}</text>
          </box>
          <box marginTop={1} border={["top","bottom","left","right"]} borderColor={theme.primary} customBorderChars={Rounded} backgroundColor={theme.backgroundPanel} paddingLeft={1} paddingRight={1} justifyContent="center" onMouseUp={() => router.navigate({ type: "home" })}>
            <text fg={theme.primary} attributes={TextAttributes.BOLD}>✦ New Chat</text>
          </box>
          <box border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundPanel} paddingLeft={1} paddingRight={1} flexDirection="row" gap={1} onMouseUp={() => command.show()}>
            <text fg={theme.textMuted}>○ Search</text>
            <box flexGrow={1} />
            <text fg={theme.textMuted}>⌘P</text>
          </box>
          <box marginTop={1} flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>Sessions · {recentSessions().length}</text>
          </box>
          <box flexDirection="column" gap={0} flexGrow={1}>
            <For each={recentSessions()}>{(s) => {
              const title = ((s as any).title || "New session").slice(0, 12)
              const age = timeAgo(s.time.updated)
              const sid = s.id.slice(0, 6)
              return (
                <box flexDirection="row" gap={1} paddingLeft={1} paddingTop={0} paddingBottom={1} border={["bottom"]} borderColor={theme.borderSubtle} onMouseUp={() => router.navigate({ type: "session", sessionID: s.id })}>
                  <text fg={theme.textMuted}>○ {title} · {age} · {sid}</text>
                </box>
              )
            }}</For>
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>○ {directory().toString().slice(0, 14)}</text>
          </box>
        </box>
      </Show>

      <box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" backgroundColor={theme.background} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} gap={1}>
        <Logo />
        <box flexDirection="row" gap={1} alignItems="center" marginBottom={1}>
          <text fg={theme.primary}>✦ arena</text>
          <text fg={theme.textMuted}>· {versionText} · ○ ● ●</text>
        </box>

        <box flexDirection="column" width="70%" maxWidth={68} backgroundColor={theme.backgroundPanel} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
          <Prompt ref={(r) => { prompt = r; promptRef.set(r) }} />
        </box>

        <box flexDirection="row" gap={1} justifyContent="center" marginTop={1}>
          <text fg={theme.textMuted}>○ tab agent · ⌘P search · ⌘L sessions</text>
        </box>

        <box flexDirection="row" gap={1} flexWrap="wrap" justifyContent="center" maxWidth={68} marginTop={1}>
          <For each={CHIPS}>{(chip) => (
            <box paddingLeft={1} paddingRight={1} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} backgroundColor={theme.backgroundElement} customBorderChars={Rounded} onMouseUp={() => prompt?.set({ input: `Build a ${chip}`, parts: [] })}>
              <text fg={theme.textMuted}>○ {chip}</text>
            </box>
          )}</For>
        </box>

        <Show when={recentSessions().length > 0}>
          <box flexDirection="column" width="70%" maxWidth={68} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} gap={0} marginTop={1}>
            <For each={recentSessions().slice(0,3)}>{(s) => {
              const title = ((s as any).title || "New session").slice(0, 14)
              const sidShort = s.id.slice(0, 6)
              const age = timeAgo(s.time.updated)
              return (
                <box flexDirection="row" gap={1} paddingTop={0} paddingBottom={0} onMouseUp={() => router.navigate({ type: "session", sessionID: s.id })}>
                  <text fg={theme.textMuted}>○ {title} · {age} · {sidShort}</text>
                </box>
              )
            }}</For>
          </box>
        </Show>

        <box marginTop={1}>
          <text fg={theme.textMuted}>○ {versionText} · nova-dark · clickable · fit</text>
        </box>
        <Toast />
      </box>
    </box>
  )
}
