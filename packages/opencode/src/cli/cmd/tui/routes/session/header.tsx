import { createMemo, Show } from "solid-js"
import { useRouteData } from "@tui/context/route"
import { useSync } from "@tui/context/sync"
import { useTheme } from "@tui/context/theme"

function timeAgo(iso: string | number) {
  const ms = typeof iso === "number" ? iso : new Date(iso).getTime()
  const d = Date.now() - ms
  const m = Math.floor(d / 60000)
  if (m < 1) return "now"
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

export function Header() {
  const route = useRouteData("session")
  const sync = useSync()
  const { theme } = useTheme()
  const session = createMemo(() => sync.session.get(route.sessionID)!)
  const messages = createMemo(() => sync.data.message[route.sessionID] ?? [])

  const cost = createMemo(() => {
    const total = messages().reduce((acc, x) => acc + (x.role === "assistant" ? (x as any).cost || 0 : 0), 0)
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)
  })

  const tokens = createMemo(() => {
    const last = messages().findLast((x) => x.role === "assistant") as any
    if (!last) return undefined
    const t = last.tokens
    if (!t) return undefined
    return (t.input || 0) + (t.output || 0) + (t.reasoning || 0)
  })

  const title = createMemo(() => (session()?.title || "New session").slice(0, 28))
  const age = createMemo(() => timeAgo(session()?.time?.updated || Date.now()))

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      border={["bottom"]}
      borderColor={theme.borderSubtle}
      flexShrink={0}
    >
      <box flexDirection="row" gap={2} alignItems="center">
        <text fg={theme.text} attributes={1}>
          {title()}
        </text>
        <text fg={theme.textMuted}>{age()}</text>
      </box>
      <box flexDirection="row" gap={2} alignItems="center">
        <Show when={tokens()}>{(t) => <text fg={theme.textMuted}>{t().toLocaleString()} tok</text>}</Show>
        <text fg={theme.primary}>{cost()}</text>
      </box>
    </box>
  )
}
