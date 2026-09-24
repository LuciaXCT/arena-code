import { Prompt, type PromptRef } from "@tui/component/prompt"
import { createMemo, For, onMount, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { useSync } from "@tui/context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useDirectory } from "../context/directory"
import { useRoute, useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { Installation } from "@/installation"
import { Flag } from "@/flag/flag"
import { useKV } from "../context/kv"
import { useCommandDialog } from "../component/dialog-command"
import { useDialog } from "@tui/ui/dialog"
import { useTerminalDimensions } from "@opentui/solid"
import { Logo } from "../component/logo"

let once = false

const chips = [
  ["Landing Page", "Build a beautiful landing page with one accent and clear headline."],
  ["Knowledge", "Create teaching material with clear structure and examples."],
  ["3D Modeling", "Generate a 3D model concept with simple geometry."],
  ["Mini Game", "Build a small playable mini game with one mechanic."],
  ["Personal Blog", "Design a personal blog with clean typography and no clutter."],
] as const

function formatTimeAgo(ms: number) {
  const sec = Math.floor((Date.now() - ms) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
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

export function Home() {
  const sync = useSync()
  const kv = useKV()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
  const dialog = useDialog()
  const dimensions = useTerminalDimensions()
  const wide = createMemo(() => dimensions().width > 110)
  const ultraWide = createMemo(() => dimensions().width > 130)

  const mcp = createMemo(() => Object.keys(sync.data.mcp).length > 0)
  const connectedMcpCount = createMemo(() => Object.values(sync.data.mcp).filter((x) => x.status === "connected").length)

  const recentSessions = createMemo(() => {
    const list = sync.data.session
    if (!list || list.length === 0) return []
    return list.filter((x) => (x as any).parentID === undefined).toSorted((a, b) => b.time.updated - a.time.updated).slice(0, 5)
  })

  const Hint = (
    <Show when={connectedMcpCount() > 0}>
      <box flexShrink={0} flexDirection="row" gap={1}>
        <text fg={theme.text}>● {connectedMcpCount()} MCP</text>
      </box>
    </Show>
  )

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
    <>
      <box flexDirection="row" flexGrow={1} width="100%" height="100%">
        {/* SIDEBAR - FIXED: no garble, short id, short time, column layout */}
        <Show when={wide()}>
          <box width={32} flexShrink={0} flexDirection="column" backgroundColor={theme.backgroundPanel} border={["right"]} borderColor={theme.borderSubtle} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} gap={1}>
            <box flexDirection="row" alignItems="center" gap={1} paddingLeft={1} paddingRight={1}>
              <text fg={theme.error}>●</text>
              <text fg={theme.warning}>●</text>
              <text fg={theme.success}>●</text>
              <box width={1} />
              <text fg={theme.text} attributes={TextAttributes.BOLD}>arena</text>
              <text fg={theme.textMuted}>code</text>
              <box flexGrow={1} />
              <text fg={theme.textMuted}>{versionText}</text>
            </box>

            <box flexDirection="column" gap={1} paddingLeft={1} paddingRight={1} paddingTop={1}>
              <box backgroundColor={theme.primary} border={["top","bottom","left","right"]} borderColor={theme.primary} customBorderChars={Rounded} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} flexDirection="row" alignItems="center" justifyContent="center" onMouseUp={() => router.navigate({ type: "home" })}>
                <text fg={theme.text} attributes={TextAttributes.BOLD}>✦ New Chat</text>
              </box>
              <box border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={2} paddingRight={1} paddingTop={0} paddingBottom={0} flexDirection="row" gap={1} alignItems="center" onMouseUp={() => command.show()}>
                <text fg={theme.text}>○ Search</text>
                <box flexGrow={1} />
                <text fg={theme.textMuted}>⌘P</text>
              </box>
            </box>

            <box flexDirection="column" gap={1} marginTop={1} flexGrow={1}>
              <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1} alignItems="center">
                <text fg={theme.text} attributes={TextAttributes.BOLD}>Sessions</text>
                <text fg={theme.textMuted}>· {recentSessions().length} · /s</text>
              </box>
              <Show when={recentSessions().length === 0}>
                <box paddingLeft={1} paddingTop={1}>
                  <text fg={theme.textMuted}>○ No chats</text>
                </box>
              </Show>
              <box flexDirection="column" gap={1} flexGrow={1} marginTop={1}>
                <For each={recentSessions()}>{(sess) => (
                  <box flexDirection="column" gap={0} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} backgroundColor={theme.backgroundElement} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} onMouseUp={() => router.navigate({ type: "session", sessionID: sess.id })}>
                    <box flexDirection="row" gap={1}>
                      <text fg={theme.textMuted}>Session</text>
                      <text fg={theme.text}>{((sess as any).title || "New session").toString().slice(0, 18)}</text>
                    </box>
                    <box flexDirection="row" gap={1} marginTop={0}>
                      <text fg={theme.textMuted}>{formatTimeAgo(sess.time.updated)}</text>
                      <text fg={theme.textMuted}>·</text>
                      <text fg={theme.accent}>opencode -s {sess.id.slice(0, 12)}...</text>
                    </box>
                  </box>
                )}</For>
              </box>
            </box>

            <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1} border={["top"]} borderColor={theme.borderSubtle} paddingTop={1}>
              <text fg={theme.textMuted}>○ {directory().toString().slice(0, 22)}</text>
            </box>
          </box>
        </Show>

        {/* MAIN - OLD BANNER COMPACT + RESTORE SESSION FIXED NO GARBLE */}
        <box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center" paddingLeft={2} paddingRight={2} gap={1}>
          <box width="100%" maxWidth={90} flexDirection="column" gap={1} alignItems="center" justifyContent="center" flexGrow={1}>
            {/* OLD BANNER - responsive: full block when ultraWide, compact when wide, minimal when narrow */}
            <box flexDirection="column" gap={0} alignItems="center" width="100%">
              <Show when={ultraWide()} fallback={
                <Show when={wide()} fallback={
                  <box flexDirection="row" gap={1} alignItems="center" justifyContent="center">
                    <text fg={theme.textMuted}>✦</text>
                    <text fg={theme.text} attributes={TextAttributes.BOLD}>arena code</text>
                    <text fg={theme.textMuted}>· {versionText}</text>
                  </box>
                }>
                  <Logo />
                </Show>
              }>
                <Logo />
              </Show>
              <box height={1} />
              <text fg={theme.text} attributes={TextAttributes.BOLD}>What can I build for you?</text>
              <text fg={theme.textMuted}>Interact with Arena Code and explore the boundless world</text>
            </box>

            <box width="100%" maxWidth={72} flexDirection="column" gap={1} zIndex={1000} marginTop={1}>
              <Prompt ref={(r) => { prompt = r; promptRef.set(r) }} hint={Hint} />
              <box flexDirection="row" gap={1} justifyContent="center" marginTop={1}>
                <text fg={theme.textMuted}>○ tab agent · ⌘P search · ⌘L sessions</text>
              </box>

              <box flexDirection="row" gap={1} justifyContent="center" flexWrap="wrap" marginTop={2}>
                <For each={chips}>{([label, text]) => (
                  <box border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} flexDirection="row" gap={1} alignItems="center" onMouseUp={() => prompt?.set({ input: text, parts: [] })}>
                    <text fg={theme.primary}>○</text>
                    <text fg={theme.text}>{label}</text>
                  </box>
                )}</For>
              </box>

              {/* RESTORE SESSION - FIXED NO GARBLE, ARENA ASCII */}
              <Show when={recentSessions().length > 0}>
                <box flexDirection="column" gap={1} marginTop={3} width="100%">
                  <box flexDirection="row" gap={1} alignItems="center" marginBottom={1}>
                    <text fg={theme.text} attributes={TextAttributes.BOLD}>Restore Session</text>
                    <text fg={theme.textMuted}>· {recentSessions().length} · arena ascii · fit</text>
                  </box>
                  <For each={recentSessions()}>{(sess) => (
                    <box flexDirection="column" gap={0} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} backgroundColor={theme.backgroundPanel} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} onMouseUp={() => router.navigate({ type: "session", sessionID: sess.id })}>
                      <box flexDirection="row" gap={2}>
                        <text fg={theme.textMuted}>Session</text>
                        <text fg={theme.text}>{((sess as any).title || "New session").toString().slice(0, 28)}</text>
                      </box>
                      <box flexDirection="row" gap={2} marginTop={1}>
                        <text fg={theme.textMuted}>Continue</text>
                        <text fg={theme.accent}>opencode -s {sess.id.slice(0, 16)}...</text>
                      </box>
                      <box flexDirection="row" gap={1} marginTop={1}>
                        <text fg={theme.textMuted}>{formatTimeAgo(sess.time.updated)} · {sess.id.slice(0, 12)}</text>
                      </box>
                    </box>
                  )}</For>
                </box>
              </Show>
            </box>
          </box>

          <box width="100%" maxWidth={72} flexDirection="row" gap={1} paddingTop={1} paddingBottom={1} flexShrink={0} justifyContent="center">
            <text fg={theme.textMuted}>○ {versionText} · restore session · arena ascii · fit · no garble</text>
          </box>
          <Toast />
        </box>
      </box>
    </>
  )
}
