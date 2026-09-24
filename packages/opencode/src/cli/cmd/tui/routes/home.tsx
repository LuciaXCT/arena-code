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
  const kv = useKV()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
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
    <box flexDirection="row" width="100%" height="100%">
      {/* SIDEBAR */}
      <Show when={wide()}>
        <box
          flexDirection="column"
          width={28}
          height="100%"
          backgroundColor={theme.backgroundElement}
          border={["right"]}
          borderColor={theme.borderSubtle}
          paddingLeft={1}
          paddingRight={1}
          paddingTop={1}
          paddingBottom={1}
          gap={1}
        >
          <box flexDirection="row" gap={1} marginBottom={1}>
            <text fg={theme.error}>●</text>
            <text fg={theme.warning}>●</text>
            <text fg={theme.success}>●</text>
          </box>
          <box marginBottom={1} flexDirection="row" gap={1}>
            <text fg={theme.primary} attributes={TextAttributes.BOLD}>arenacode</text>
            <text fg={theme.textMuted}>{versionText}</text>
          </box>

          <box
            border={["top","bottom","left","right"]}
            borderColor={theme.primary}
            customBorderChars={Rounded}
            backgroundColor={theme.backgroundPanel}
            paddingLeft={1}
            paddingRight={1}
            paddingTop={0}
            paddingBottom={0}
            flexDirection="row"
            justifyContent="center"
            onMouseUp={() => router.navigate({ type: "home" })}
          >
            <text fg={theme.primary} attributes={TextAttributes.BOLD}>✦ New Chat</text>
          </box>

          <box
            border={["top","bottom","left","right"]}
            borderColor={theme.borderSubtle}
            customBorderChars={Rounded}
            backgroundColor={theme.backgroundPanel}
            paddingLeft={1}
            paddingRight={1}
            paddingTop={0}
            paddingBottom={0}
            marginTop={1}
            flexDirection="row"
            gap={1}
            onMouseUp={() => command.show()}
          >
            <text fg={theme.textMuted}>○ Search</text>
            <box flexGrow={1} />
            <text fg={theme.textMuted}>⌘P</text>
          </box>

          <box marginTop={1} flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>Sessions ·</text>
            <text fg={theme.text}>{recentSessions().length}</text>
            <text fg={theme.textMuted}>/s</text>
          </box>

          <box flexDirection="column" gap={0} flexGrow={1}>
            <For each={recentSessions()}>{(s) => {
              const title = ((s as any).title || "New session").slice(0, 16)
              const age = timeAgo(s.time.updated)
              const sid = s.id.slice(0, 8)
              const active = false
              return (
                <box flexDirection="column" gap={0} paddingLeft={1} paddingTop={0} paddingBottom={1} border={["bottom"]} borderColor={theme.borderSubtle}>
                  <box flexDirection="row" gap={1}>
                    <text fg={active ? theme.primary : theme.textMuted}>{active ? "●" : "○"}</text>
                    <text fg={theme.text}>{title}</text>
                  </box>
                  <box paddingLeft={2}>
                    <text fg={theme.textMuted}>{age} · {sid}</text>
                  </box>
                </box>
              )
            }}</For>
          </box>

          <box marginTop={1} flexDirection="row" gap={1}>
            <text fg={theme.textMuted}>○ {directory().toString().slice(0, 18)}</text>
          </box>
        </box>
      </Show>

      {/* MAIN AREA */}
      <box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" backgroundColor={theme.background} paddingLeft={2} paddingRight={2} paddingTop={2} paddingBottom={2} gap={2}>
        <Logo />

        <box flexDirection="row" gap={1} alignItems="center">
          <text fg={theme.primary}>✦ arena</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.textMuted}>{versionText}</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.textMuted}>○</text>
          <text fg={theme.warning}>●</text>
          <text fg={theme.error}>●</text>
        </box>

        <box flexDirection="column" width="75%" maxWidth={90} border={["top","bottom","left","right"]} borderColor={theme.primary} customBorderChars={Rounded} backgroundColor={theme.backgroundPanel} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} zIndex={1000}>
          <box flexDirection="row" gap={0} minHeight={1}>
            <text fg={theme.primary}>│ </text>
            <Prompt ref={(r) => { prompt = r; promptRef.set(r) }} hint={Hint} />
          </box>
          <box flexDirection="row" gap={1} justifyContent="flex-end" marginTop={1}>
            <text fg={theme.textMuted}>tab</text>
            <text fg={theme.textMuted}>switch agent</text>
            <text fg={theme.textMuted}>·</text>
            <text fg={theme.textMuted}>ctrl+p</text>
            <text fg={theme.textMuted}>commands</text>
          </box>
        </box>

        <box flexDirection="row" gap={2} justifyContent="center">
          <text fg={theme.textMuted}>○ tab agent</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.textMuted}>⌘P search</text>
          <text fg={theme.textMuted}>·</text>
          <text fg={theme.textMuted}>⌘L sessions</text>
        </box>

        <box flexDirection="row" gap={1} flexWrap="wrap" justifyContent="center" maxWidth={80}>
          <For each={CHIPS}>{(chip) => {
            const full = chips.find(c => c[0] === chip)?.[1] || chip
            return (
              <box paddingLeft={2} paddingRight={2} paddingTop={0} paddingBottom={0} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} backgroundColor={theme.backgroundElement} customBorderChars={Rounded} onMouseUp={() => prompt?.set({ input: full, parts: [] })}>
                <text fg={theme.textMuted}>○ {chip}</text>
              </box>
            )
          }}</For>
        </box>

        <Show when={recentSessions().length > 0}>
          <box flexDirection="column" width="75%" maxWidth={90} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} customBorderChars={Rounded} backgroundColor={theme.backgroundElement} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} gap={1}>
            <For each={recentSessions().slice(0,5)}>{(s) => {
              const title = ((s as any).title || "New session").slice(0, 32)
              const age = timeAgo(s.time.updated)
              const sid = s.id.slice(0, 20) + "..."
              return (
                <box flexDirection="column" gap={0} marginBottom={1}>
                  <box flexDirection="row" gap={2}>
                    <text fg={theme.textMuted}>Session</text>
                    <text fg={theme.text}>{title}</text>
                  </box>
                  <box flexDirection="row" gap={2}>
                    <text fg={theme.textMuted}>Continue</text>
                    <text fg={theme.primary}>opencode -s {sid}</text>
                  </box>
                  <box>
                    <text fg={theme.textMuted}>{age} · {s.id.slice(0,12)}</text>
                  </box>
                </box>
              )
            }}</For>
          </box>
        </Show>

        <box flexDirection="row" gap={2} marginTop={1}>
          <text fg={theme.textMuted}>○ {versionText} · restore session · arena ascii · fit · no garble</text>
        </box>
        <Toast />
      </box>
    </box>
  )
}
