import { Prompt, type PromptRef } from "@tui/component/prompt"
import { createMemo, For, Match, onMount, Show, Switch } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "@tui/context/theme"
import { Logo } from "../component/logo"
import { DidYouKnow, randomizeTip } from "../component/did-you-know"
import { Locale } from "@/util/locale"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useDirectory } from "../context/directory"
import { useRoute, useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { Installation } from "@/installation"
import { Flag } from "@/flag/flag"
import { useKV } from "../context/kv"
import { useCommandDialog } from "../component/dialog-command"

let once = false

const chips = [
  ["Landing Page", "Build a beautiful landing page with one accent and clear headline."],
  ["Knowledge/Teaching Material", "Create teaching material with clear structure and examples."],
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

export function Home() {
  const sync = useSync()
  const kv = useKV()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
  const mcp = createMemo(() => Object.keys(sync.data.mcp).length > 0)
  const mcpError = createMemo(() => Object.values(sync.data.mcp).some((x) => x.status === "failed"))
  const connectedMcpCount = createMemo(() => Object.values(sync.data.mcp).filter((x) => x.status === "connected").length)
  const isFirstTimeUser = createMemo(() => sync.data.session.length === 0)
  const tipsHidden = createMemo(() => kv.get("tips_hidden", false))
  const showTips = createMemo(() => { return false; if (isFirstTimeUser()) return false; return !tipsHidden() })

  const recentSessions = createMemo(() => {
    const list = sync.data.session
    if (!list || list.length === 0) return []
    return list.filter((x) => (x as any).parentID === undefined).toSorted((a, b) => b.time.updated - a.time.updated).slice(0, 5)
  })

  command.register(() => [{ title: tipsHidden() ? "Show tips" : "Hide tips", value: "tips.toggle", keybind: "tips_toggle", category: "System", onSelect: (dialog) => { kv.set("tips_hidden", !tipsHidden()); dialog.clear() } }])

  const Hint = (<Show when={connectedMcpCount() > 0}><box flexShrink={0} flexDirection="row" gap={1}><text fg={theme.text}><Switch><Match when={mcpError()}><span style={{ fg: theme.error }}>•</span> mcp errors{" "}<span style={{ fg: theme.textMuted }}>ctrl+x s</span></Match><Match when={true}><span style={{ fg: theme.success }}>•</span>{" "}{Locale.pluralize(connectedMcpCount(), "{} mcp server", "{} mcp servers")}</Match></Switch></text></box></Show>)

  let prompt: PromptRef
  const args = useArgs()
  const router = useRoute()
  onMount(() => {
    randomizeTip()
    if (once) return
    if (route.initialPrompt) { prompt.set(route.initialPrompt); once = true }
    else if (args.prompt) { prompt.set({ input: args.prompt, parts: [] }); once = true; prompt.submit() }
  })
  const directory = useDirectory()

  return (
    <>
      <box flexGrow={1} justifyContent="center" alignItems="center" paddingLeft={2} paddingRight={2} gap={1}>
        <Logo />
        <box alignItems="center" flexShrink={0} marginBottom={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>What can I build for you?</text>
          <text fg={theme.textMuted}>Interact with Arena Code and explore the boundless creative world</text>
        </box>
        <box width="100%" maxWidth={80} zIndex={1000} paddingTop={1}>
          <Prompt ref={(r) => { prompt = r; promptRef.set(r) }} hint={Hint} />
          <box flexDirection="row" gap={1} justifyContent="center" marginTop={1} flexWrap="wrap">
            <For each={chips}>{([label, text]) => (<box border={["top","bottom","left","right"]} borderColor={theme.border} paddingLeft={1} paddingRight={1} backgroundColor={theme.backgroundElement} onMouseUp={() => prompt?.set({ input: text, parts: [] })}><text fg={theme.textMuted}>{label}</text></box>)}</For>
          </box>
          <Show when={recentSessions().length > 0}>
            <box flexDirection="column" gap={1} marginTop={2} width="100%">
              <box flexDirection="row" gap={1} alignItems="center">
                <text fg={theme.text} attributes={TextAttributes.BOLD}>Recent Sessions</text>
                <text fg={theme.textMuted}>· {recentSessions().length} · /sessions · ctrl+x l</text>
              </box>
              <For each={recentSessions()}>{(sess) => (<box flexDirection="row" gap={1} paddingLeft={1} paddingRight={1} paddingTop={1} paddingBottom={1} border={["top","bottom","left","right"]} borderColor={theme.borderSubtle} backgroundColor={theme.backgroundElement} onMouseUp={() => router.navigate({ type: "session", sessionID: sess.id })}><box flexDirection="column" flexGrow={1} gap={0}><box flexDirection="row" gap={1}><text fg={theme.textMuted}>Session</text><text fg={theme.text}>{(sess as any).title || (sess as any).summary || sess.id.slice(0,12)}</text><text fg={theme.textMuted}>{formatTimeAgo(sess.time.updated)}</text></box><box flexDirection="row" gap={1}><text fg={theme.textMuted}>Continue</text><text fg={theme.accent}>opencode -s {sess.id}</text></box></box><box flexShrink={0} alignItems="center" justifyContent="center"><text fg={theme.primary}>↩</text></box></box>)}</For>
            </box>
          </Show>
        </box>
        <Toast />
      </box>
      <Show when={!isFirstTimeUser()}><Show when={showTips()}><DidYouKnow /></Show></Show>
      <box paddingTop={1} paddingBottom={1} paddingLeft={2} paddingRight={2} flexDirection="row" flexShrink={0} gap={2}>
        <text fg={theme.textMuted}>{directory()}</text>
        <box gap={1} flexDirection="row" flexShrink={0}><Show when={mcp()}><text fg={theme.text}><Switch><Match when={mcpError()}><span style={{ fg: theme.error }}>⊙ </span></Match><Match when={true}><span style={{ fg: connectedMcpCount() > 0 ? theme.success : theme.textMuted }}>⊙ </span></Match></Switch>{connectedMcpCount()} MCP</text><text fg={theme.textMuted}>/status</text></Show></box>
        <box flexGrow={1} /><box flexShrink={0}><text fg={theme.textMuted}>{Flag.isArena() ? (process.env.ARENA_VERSION ?? Installation.VERSION) : Installation.VERSION}</text></box>
      </box>
    </>
  )
}
