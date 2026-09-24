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
import { useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { Installation } from "@/installation"
import { Flag } from "@/flag/flag"
import { useKV } from "../context/kv"
import { useCommandDialog } from "../component/dialog-command"

// TODO: what is the best way to do this?
let once = false

const chips = [
  ["Magic Design", "Design this with one accent, a clear headline, and no clutter."],
  ["Full-Stack", "Build the smallest full-stack version of this, with a test."],
  ["Write Code", "Look at this repo and implement the next obvious fix."],
] as const

export function Home() {
  const sync = useSync()
  const kv = useKV()
  const { theme } = useTheme()
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const command = useCommandDialog()
  const mcp = createMemo(() => Object.keys(sync.data.mcp).length > 0)
  const mcpError = createMemo(() => {
    return Object.values(sync.data.mcp).some((x) => x.status === "failed")
  })

  const connectedMcpCount = createMemo(() => {
    return Object.values(sync.data.mcp).filter((x) => x.status === "connected").length
  })

  const isFirstTimeUser = createMemo(() => sync.data.session.length === 0)
  const tipsHidden = createMemo(() => kv.get("tips_hidden", false))
  const showTips = createMemo(() => {
    return false
    // Don't show tips for first-time users
    if (isFirstTimeUser()) return false
    return !tipsHidden()
  })

  command.register(() => [
    {
      title: tipsHidden() ? "Show tips" : "Hide tips",
      value: "tips.toggle",
      keybind: "tips_toggle",
      category: "System",
      onSelect: (dialog) => {
        kv.set("tips_hidden", !tipsHidden())
        dialog.clear()
      },
    },
  ])

  const Hint = (
    <Show when={connectedMcpCount() > 0}>
      <box flexShrink={0} flexDirection="row" gap={1}>
        <text fg={theme.text}>
          <Switch>
            <Match when={mcpError()}>
              <span style={{ fg: theme.error }}>•</span> mcp errors{" "}
              <span style={{ fg: theme.textMuted }}>ctrl+x s</span>
            </Match>
            <Match when={true}>
              <span style={{ fg: theme.success }}>•</span>{" "}
              {Locale.pluralize(connectedMcpCount(), "{} mcp server", "{} mcp servers")}
            </Match>
          </Switch>
        </text>
      </box>
    </Show>
  )

  let prompt: PromptRef
  const args = useArgs()
  onMount(() => {
    randomizeTip()
    if (once) return
    if (route.initialPrompt) {
      prompt.set(route.initialPrompt)
      once = true
    } else if (args.prompt) {
      prompt.set({ input: args.prompt, parts: [] })
      once = true
      prompt.submit()
    }
  })
  const directory = useDirectory()

  return (
    <>
      <box flexGrow={1} justifyContent="center" alignItems="center" paddingLeft={2} paddingRight={2} gap={1}>
        <Logo />
        <box alignItems="center" flexShrink={0} marginBottom={1}>
          <text fg={theme.text} attributes={TextAttributes.BOLD}>
            What can I build for you?
          </text>
          <text fg={theme.textMuted}>Interact with Arena Code</text>
        </box>
        <box width="100%" maxWidth={90} zIndex={1000} paddingTop={1}>
          <Prompt
            ref={(r) => {
              prompt = r
              promptRef.set(r)
            }}
            hint={Hint}
          />
          <box flexDirection="row" gap={1} justifyContent="center" marginTop={1}>
            <For each={chips}>
              {([label, text]) => (
                <box
                  border={["top", "bottom", "left", "right"]}
                  borderColor={theme.border}
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={theme.backgroundElement}
                  onMouseUp={() => prompt?.set({ input: text, parts: [] })}
                >
                  <text fg={theme.textMuted}>{label}</text>
                </box>
              )}
            </For>
          </box>
        </box>
        <Toast />
      </box>
      <Show when={!isFirstTimeUser()}>
        <Show when={showTips()}>
          <DidYouKnow />
        </Show>
      </Show>
      <box paddingTop={1} paddingBottom={1} paddingLeft={2} paddingRight={2} flexDirection="row" flexShrink={0} gap={2}>
        <text fg={theme.textMuted}>{directory()}</text>
        <box gap={1} flexDirection="row" flexShrink={0}>
          <Show when={mcp()}>
            <text fg={theme.text}>
              <Switch>
                <Match when={mcpError()}>
                  <span style={{ fg: theme.error }}>⊙ </span>
                </Match>
                <Match when={true}>
                  <span style={{ fg: connectedMcpCount() > 0 ? theme.success : theme.textMuted }}>⊙ </span>
                </Match>
              </Switch>
              {connectedMcpCount()} MCP
            </text>
            <text fg={theme.textMuted}>/status</text>
          </Show>
        </box>
        <box flexGrow={1} />
        <box flexShrink={0}>
          <text fg={theme.textMuted}>
            {Flag.isArena() ? (process.env.ARENA_VERSION ?? Installation.VERSION) : Installation.VERSION}
          </text>
        </box>
      </box>
    </>
  )
}
