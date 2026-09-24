import { Prompt, type PromptRef } from "@tui/component/prompt"
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useTerminalDimensions } from "@opentui/solid"
import { useTheme } from "@tui/context/theme"
import { Logo, OldBanner } from "../component/logo"
import { useSync } from "../context/sync"
import { Toast } from "../ui/toast"
import { useArgs } from "../context/args"
import { useDirectory } from "../context/directory"
import { useRoute, useRouteData } from "@tui/context/route"
import { usePromptRef } from "../context/prompt"
import { useCommandDialog } from "../component/dialog-command"

// TODO: what is the best way to do this?
let once = false

const CHIPS = ["Landing Page", "Knowledge Base", "3D Modeling", "Mini Game", "Personal Blog", "Dashboard"] as const

// Auto-generated session titles look like "New session - 2026-09-24T16:29:14Z".
// Strip the ISO tail so a raw timestamp never leaks into the list.
function prettyTitle(title: string | undefined, max: number) {
  const raw = (title || "New session").trim()
  const cleaned = raw.replace(/\s*[-–—]?\s*\d{4}-\d{2}-\d{2}T[\d:.]*Z?$/, "").trim()
  const value = cleaned || raw
  if (value.length <= max) return value
  return value.slice(0, Math.max(1, max - 1)).trimEnd() + "…"
}

// Short, fixed-width age. Never returns an ISO string, so session rows can't
// grow long enough to collide with the id next to them.
function timeAgo(iso: string | number) {
  const ms = typeof iso === "number" ? iso : new Date(iso).getTime()
  if (!ms || Number.isNaN(ms)) return "now"
  const m = Math.floor((Date.now() - ms) / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// The friendliest possible label for a session: the opening line of the first
// thing the person actually typed. Falls back to the stored title when the
// session's messages aren't loaded yet (only opened sessions get hydrated).
function firstUserText(messages: { role: string; id: string }[], parts: Record<string, any[]>) {
  for (const msg of messages) {
    if (msg.role !== "user") continue
    const text = parts[msg.id]?.find((p) => p.type === "text")?.text as string | undefined
    const line = text?.split("\n").find((l) => l.trim())
    if (line?.trim()) return line.trim()
  }
  return undefined
}

export function Home() {
  const sync = useSync()
  const theme = useTheme().theme
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const args = useArgs()
  const router = useRoute()
  const command = useCommandDialog()
  const dimensions = useTerminalDimensions()
  const directory = useDirectory()

  // Sidebar needs real width; the composer just needs to stop being cramped.
  const wide = createMemo(() => dimensions().width > 110)
  // More air on tall panes, tightened up when rows are scarce.
  const spacing = createMemo(() => (dimensions().height >= 34 ? 2 : 1))

  const recentSessions = createMemo(() =>
    (sync.data.session || [])
      .filter((x) => x.parentID === undefined)
      .toSorted((a, b) => b.time.updated - a.time.updated)
      .slice(0, 8),
  )

  // The sidebar has no scrollbox, so cap the list to what actually fits.
  // 1 row per session, ~19 rows of fixed chrome around it.
  const sidebarItems = createMemo(() => Math.max(1, Math.min(12, dimensions().height - 20)))

  // The centered column drops its heaviest blocks on short panes instead of
  // growing taller than the viewport and clipping the greeting at the top.
  const showChips = createMemo(() => dimensions().height >= 26)
  // The sidebar already lists sessions - only duplicate the list in the center
  // on panes too narrow to show the rail.
  const showRecentCard = createMemo(() => !wide() && dimensions().height >= 30)
  const cardItems = createMemo(() => Math.max(1, Math.min(4, dimensions().height - 30)))

  // "New session - 2026-09-24T16:29Z" is noise. Prefer what they typed.
  const friendlyTitle = (s: { id: string; title?: string }, max: number) =>
    prettyTitle(firstUserText(sync.data.message[s.id] ?? [], sync.data.part) ?? s.title, max)

  const [newChatHover, setNewChatHover] = createSignal(false)
  const [searchHover, setSearchHover] = createSignal(false)

  // Stored titles are all "New session - <timestamp>" because title generation
  // fails on the free lane. Pull the opening prompt for the sessions the rail
  // actually shows so the list reads like something a person wrote.
  const hydrated = new Set<string>()
  createEffect(() => {
    if (!wide()) return
    for (const s of recentSessions().slice(0, Math.min(sidebarItems(), 8))) {
      if (hydrated.has(s.id)) continue
      hydrated.add(s.id)
      void sync.session.sync(s.id).catch(() => {})
    }
  })

  let prompt: PromptRef | undefined
  onMount(() => {
    if (once) return
    if (route.initialPrompt) {
      prompt?.set(route.initialPrompt)
      once = true
    } else if (args.prompt) {
      prompt?.set({ input: args.prompt, parts: [] })
      once = true
      prompt?.submit()
    }
  })

  const fill = (text: string) => prompt?.set({ input: text, parts: [] })

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={theme.background}>
      <box flexDirection="row" width="100%" flexGrow={1} paddingTop={1} paddingBottom={1}>
        <Show when={wide()}>
          {/* Transparent rail: no panel, no rule - content is held apart by space alone. */}
          <box
            flexDirection="column"
            width={30}
            flexShrink={0}
            paddingLeft={2}
            paddingRight={1}
            gap={1}
          >
            <box flexDirection="row" height={1} flexShrink={0} gap={1} alignItems="center">
              <text fg={theme.error} selectable={false}>
                ●
              </text>
              <text fg={theme.warning} selectable={false}>
                ●
              </text>
              <text fg={theme.success} selectable={false}>
                ●
              </text>
              <text fg={theme.textMuted} selectable={false}>
                ○
              </text>
            </box>

            <box height={1} flexShrink={0} marginBottom={1}>
              <text fg={theme.text} attributes={TextAttributes.BOLD} selectable={false}>
                Arena Code
              </text>
            </box>

            {/* Soft filled surfaces instead of outlined boxes. */}
            <box
              height={3}
              flexShrink={0}
              backgroundColor={newChatHover() ? theme.backgroundPanel : theme.backgroundElement}
              justifyContent="center"
              onMouseOver={() => setNewChatHover(true)}
              onMouseOut={() => setNewChatHover(false)}
              onMouseUp={() => router.navigate({ type: "home" })}
            >
              <text fg={newChatHover() ? theme.primary : theme.text} selectable={false}>
                ✦ New Chat
              </text>
            </box>

            <box
              height={3}
              flexShrink={0}
              backgroundColor={searchHover() ? theme.backgroundPanel : theme.backgroundElement}
              justifyContent="center"
              onMouseOver={() => setSearchHover(true)}
              onMouseOut={() => setSearchHover(false)}
              onMouseUp={() => command.show()}
            >
              <text fg={searchHover() ? theme.primary : theme.textMuted} selectable={false}>
                ○ Search
              </text>
            </box>

            <box height={1} flexShrink={0} marginBottom={1}>
              <text fg={theme.textMuted} selectable={false}>
                Recent
              </text>
            </box>

            <box flexDirection="column" flexGrow={1} gap={0}>
              <For each={recentSessions().slice(0, sidebarItems())}>
                {(s) => {
                  const [hover, setHover] = createSignal(false)
                  const title = friendlyTitle(s, 22)
                  const age = timeAgo(s.time.updated)
                  return (
                    <box
                      flexDirection="row"
                      height={1}
                      flexShrink={0}
                      gap={1}
                      onMouseOver={() => setHover(true)}
                      onMouseOut={() => setHover(false)}
                      onMouseUp={() => router.navigate({ type: "session", sessionID: s.id })}
                    >
                      <text fg={hover() ? theme.primary : theme.text} selectable={false}>
                        {title}
                      </text>
                      <text fg={theme.textMuted} selectable={false}>
                        {age}
                      </text>
                    </box>
                  )
                }}
              </For>
            </box>

            <box height={1} flexShrink={0}>
              <text fg={theme.textMuted} selectable={false}>
                {directory().slice(0, 20)}
              </text>
            </box>
          </box>
        </Show>

        <box
          flexDirection="column"
          flexGrow={1}
          alignItems="center"
          justifyContent="center"
          paddingLeft={2}
          paddingRight={2}
          gap={spacing()}
        >
          <OldBanner />

          <Logo />

          <box width="100%" maxWidth={82} flexShrink={0}>
            <Prompt
              hideModel
              ref={(r) => {
                prompt = r
                promptRef.set(r)
              }}
            />
          </box>

          {/* Borderless pills: the surface lift reads as elevation, no outline needed. */}
          <box
            visible={showChips()}
            flexDirection="row"
            flexWrap="wrap"
            justifyContent="center"
            maxWidth={82}
            gap={1}
            flexShrink={0}
          >
            <For each={CHIPS}>
              {(chip) => {
                const [hover, setHover] = createSignal(false)
                return (
                  <box
                    height={1}
                    flexShrink={0}
                    backgroundColor={hover() ? theme.backgroundPanel : theme.backgroundElement}
                    paddingLeft={2}
                    paddingRight={2}
                    onMouseOver={() => setHover(true)}
                    onMouseOut={() => setHover(false)}
                    onMouseUp={() =>
                      fill(`Build a beautiful ${chip} with a modern aesthetic, soft dark theme, clean typography`)
                    }
                  >
                    <text fg={hover() ? theme.primary : theme.textMuted} selectable={false}>
                      {chip}
                    </text>
                  </box>
                )
              }}
            </For>
          </box>

          <Show when={showRecentCard()}>
            <box flexDirection="column" width="100%" maxWidth={82} flexShrink={0} gap={0}>
              <box flexDirection="row" height={1} flexShrink={0} gap={1} alignItems="center">
                <text fg={theme.textMuted} selectable={false}>
                  Recent Sessions
                </text>
              </box>
              <box height={1} flexShrink={0} />
              <For each={recentSessions().slice(0, cardItems())}>
                {(s) => {
                  const [hover, setHover] = createSignal(false)
                  const title = friendlyTitle(s, 34)
                  const age = timeAgo(s.time.updated)
                  return (
                    <box
                      flexDirection="row"
                      height={1}
                      flexShrink={0}
                      gap={1}
                      onMouseOver={() => setHover(true)}
                      onMouseOut={() => setHover(false)}
                      onMouseUp={() => router.navigate({ type: "session", sessionID: s.id })}
                    >
                      <text fg={hover() ? theme.primary : theme.text} selectable={false}>
                        {title}
                      </text>
                      <text fg={theme.textMuted} selectable={false}>
                        {age}
                      </text>
                    </box>
                  )
                }}
              </For>
            </box>
          </Show>

          <Toast />
        </box>
      </box>
    </box>
  )
}
