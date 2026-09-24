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
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
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
  const wide = createMemo(() => dimensions().width > 100)

  const mcp = createMemo(() => Object.keys(sync.data.mcp).length > 0)
  const connectedMcpCount = createMemo(() => Object.values(sync.data.mcp).filter((x) => x.status === "connected").length)

  const recentSessions = createMemo(() => {
    const list = sync.data.session
    if (!list || list.length === 0) return []
    return list.filter((x) => (x as any).parentID === undefined).toSorted((a, b) => b.time.updated - a.time.updated).slice(0, 10)
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
        {/* SIDEBAR - compact fit */}
        <Show when={wide()}>
          <box width={30} flexShrink={0} flexDirection="column" backgroundColor={theme.backgroundPanel} border={["right"]} borderColor={theme.borderSubtle} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0} gap={0}>
            <box flexDirection="row" alignItems="center" gap={1} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={0}>
              <text fg={theme.error}>●</text>
              <text fg={theme.warning}>●</text>
              <text fg={theme.success}>●</text>
              <box width={1} />
              <text fg={theme.text} attributes={TextAttributes.BOLD}>arena</text>
              <text fg={theme.textMuted}>code</text>
              <box flexGrow={1} />
              <text fg={theme.textMuted}>{versionText}</text>
            </box>

            <box flexDirection="column" gap={0} paddingLeft={1} paddingRight={1} paddingTop={1}>
              <box marginLeft={1} marginTop={0} backgroundColor={theme.background} border={["top","bottom","left","right"]} borderColor={theme.background} customBorderChars={Rounded} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
                <text fg={theme.background}>.</text>
              </box>
              <box marginTop={-1} backgroundColor={theme.primary} border={["top","bottom","left","right"]} borderColor={theme.primary} customBorderChars={Rounded} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0} flexDirection="row" alignItems="center" justifyContent="center" onMouseUp={() => router.navigate({ type: "home" })}>
                <text fg={theme.text} attributes={TextAttributes.BOLD}>✦ New Chat</text>
              </box>
              <box marginTop={1} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0} flexDirection="row" gap={1} alignItems="center" onMouseUp={() => command.show()}>
                <text fg={theme.text}>○ Search</text>
                <box flexGrow={1} />
                <text fg={theme.textMuted}>⌘P</text>
              </box>
            </box>

            <box flexDirection="column" gap={0} marginTop={1} flexGrow={1}>
              <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1} alignItems="center" paddingBottom={0}>
                <text fg={theme.text}>● Sessions · {recentSessions().length}</text>
              </box>
              <Show when={recentSessions().length === 0}>
                <box paddingLeft={1} paddingTop={1}>
                  <text fg={theme.textMuted}>○ No chats</text>
                </box>
              </Show>
              <box flexDirection="column" gap={0} flexGrow={1}>
                <For each={recentSessions()}>{(sess, idx) => (
                  <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0} backgroundColor={idx() % 2 === 0 ? theme.backgroundPanel : theme.background} onMouseUp={() => router.navigate({ type: "session", sessionID: sess.id })}>
                    <text fg={idx() === 0 ? theme.success : theme.textMuted}>{idx() === 0 ? "●" : "○"}</text>
                    <box flexDirection="column" gap={0} flexGrow={1}>
                      <text fg={theme.text}>{((sess as any).title || (sess as any).summary || sess.id).toString().slice(0, 20)}</text>
                      <box flexDirection="row" gap={1}>
                        <text fg={theme.textMuted}>{formatTimeAgo(sess.time.updated)} · {sess.id.slice(4, 10)}</text>
                      </box>
                    </box>
                  </box>
                )}</For>
              </box>
            </box>

            <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1} border={["top"]} borderColor={theme.borderSubtle} paddingTop={0} paddingBottom={1}>
              <text fg={theme.textMuted}>○ {directory().toString().slice(0, 20)}</text>
            </box>
          </box>
        </Show>

        {/* MAIN - OLD BANNER COMPACT FIT + WHITE TEXT + CIRCLE OVERLAY BEAUTY */}
        <box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center" paddingLeft={1} paddingRight={1} gap={0}>
          <box width="100%" maxWidth={70} flexDirection="column" gap={0} alignItems="center" justifyContent="center" flexGrow={1}>
            <box flexDirection="column" gap={0} alignItems="center" marginBottom={0} width="100%">
              <Logo />
              <box flexDirection="row" gap={1} alignItems="center" justifyContent="center" marginTop={1}>
                <text fg={theme.text}>○ What can I build for you? ○</text>
              </box>
              <text fg={theme.textMuted}>Interact with Arena Code · {versionText} · ○ ● ●</text>
            </box>

            <box width="100%" maxWidth={66} flexDirection="column" gap={0} zIndex={1000} marginTop={1}>
              <box backgroundColor={theme.background} border={["top","bottom","left","right"]} borderColor={theme.background} customBorderChars={Rounded} marginLeft={1} marginTop={0} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
                <text fg={theme.background}>.</text>
              </box>
              <box marginTop={-1} border={["top","bottom","left","right"]} borderColor={theme.border} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
                <Prompt ref={(r) => { prompt = r; promptRef.set(r) }} hint={Hint} />
              </box>
              <box flexDirection="row" gap={1} justifyContent="center" marginTop={0}>
                <text fg={theme.textMuted}>○ tab · ⌘P · ⌘L</text>
              </box>

              <box flexDirection="row" gap={1} justifyContent="center" flexWrap="wrap" marginTop={1}>
                <For each={chips}>{([label, text]) => (
                  <box flexDirection="column" gap={0}>
                    <box backgroundColor={theme.background} border={["top","bottom","left","right"]} borderColor={theme.background} customBorderChars={Rounded} marginLeft={1} marginTop={0} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0}>
                      <text fg={theme.background}>.</text>
                    </box>
                    <box marginTop={-1} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0} flexDirection="row" gap={1} alignItems="center" onMouseUp={() => prompt?.set({ input: text, parts: [] })}>
                      <text fg={theme.primary}>◍</text>
                      <text fg={theme.text}>{label}</text>
                    </box>
                  </box>
                )}</For>
              </box>

              <Show when={!wide() && recentSessions().length > 0}>
                <box flexDirection="column" gap={0} marginTop={1} width="100%">
                  <box flexDirection="row" gap={1} alignItems="center">
                    <text fg={theme.text}>● Recent · {recentSessions().length}</text>
                  </box>
                  <For each={recentSessions().slice(0,3)}>{(sess) => (
                    <box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1} paddingTop={0} paddingBottom={0} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} marginBottom={0} onMouseUp={() => router.navigate({ type: "session", sessionID: sess.id })}>
                      <text fg={theme.text}>○ {formatTimeAgo(sess.time.updated)} {((sess as any).title || sess.id).toString().slice(0, 14)}</text>
                    </box>
                  )}</For>
                </box>
              </Show>
            </box>
          </box>

          <box width="100%" maxWidth={66} flexDirection="row" gap={1} paddingTop={0} paddingBottom={0} flexShrink={0} justifyContent="center">
            <text fg={theme.textMuted}>○ {versionText} · workstation fit · circle overlay</text>
          </box>
          <Toast />
        </box>
      </box>
    </>
  )
}
