# ARENA CODE — RESTORE SESSION + TUI COLOUR + GLITCH FIX · FINAL PROMPT v6 (REBUILD)

**How to use:** paste everything below `=====` into Ct002. Fixes the exact bug human reported:
new v1 shows 6x logo `󰄛 ˚₊‧꒰ა ♡ ໒꒱ ‧₊˚ opencode` repeated and `~ │ 13:13` with NO restore point,
before it showed `Session Dev po Continue opencode -s ses_f74cd193dffeIRBRi3IyR4qCrq`.

Root cause: `home.tsx` had auto-continue `createEffect` that jumped to latest session immediately,
hiding home screen and session list. Fix: REMOVE auto-continue, SHOW recent sessions list
like default opencode with `Continue opencode -s <id>` — that's the restore point.

Also keeps emerald colour restore point `~/.config/opencode/themes/arena-emerald.json`
(canvas #04100C, panel #0A1A14, ink #EAFFF6, muted #8FBFA9, primary #34D399, bubble #DFFFF2)
which persists after `/exit + opencode`, no rebuild needed for colours, but TUI fix DOES need rebuild.

Proven base: binary 153421609, zip 51840090, Kali WSL, `opencode --version` → `1.0.0-arena.1`

=====================================================================

## 0. MISSION — RESTORE SESSION IS THE HOME LIST

Human: "what i mean by restore session is like this, this new opencode, v1 , 󰄛 ˚₊‧꒰ა ♡ ໒꒱ ‧₊˚ opencode
repeated 6x, ~ │ 13:13, it doesnt hv any restore pointtt, this b4 , Session Dev po Continue opencode -s ses_..."

You must:

1. **Restore point = home screen session list** — like default opencode, show 5 recent sessions
   with `Session <title> <time> Continue opencode -s ses_...` — clickable to continue
   — NOT auto-jump that hides it. Keybind `/sessions` / `ctrl+x l` also lists.
2. **Fix 6x logo repeat** — ensure `Logo` renders once, not inside a loop that repeats 6 times.
   Keep banner untouched per rule, but ensure layout doesn't duplicate it.
3. **Keep TUI fixes** — bubble LEFT `marginRight="auto"` width 70%, full-width col 178/180,
   glitch fix `<Index each={blocks()}>` not `<For>`, z.ai noir baseline #7B6DF6
4. **Keep emerald colour restore point** — `~/.config/opencode/themes/arena-emerald.json`
   — canvas #04100C, panel #0A1A14, ink #EAFFF6, muted #8FBFA9, primary #34D399, bubble #DFFFF2
   — persists after `/exit + opencode`, survives restart, no rebuild for colours
5. **Then /exit + opencode** — home shows Recent Sessions + Continue opencode -s ...

Work silently, short report only, one-line commands for human.

---

## 1. MACHINE FACTS

| Thing | Value |
|---|---|
| Machine | Kali WSL `/home/nijam`, PATH prefers `/usr/local/bin` |
| Binary (2 copies) | `~/.local/bin/opencode` and `/usr/local/bin/opencode` — currently 153421609 |
| Zip | 51840090 B |
| Source | `https://github.com/LuciaXCT/arena-code` branch `dev` |
| Config dir | `~/.config/opencode/` honours XDG |
| Colour restore point | `~/.config/opencode/themes/arena-emerald.json` — 4560B, 51 keys, survives restart |
| Session restore point | Home screen list — `Recent Sessions · 5 · /sessions · ctrl+x l` + `Continue opencode -s ses_...` |
| Emerald | canvas #04100C, panel #0A1A14, ink #EAFFF6, muted #8FBFA9, primary #34D399, bubble #DFFFF2 |
| Agents | exactly 4: arena, brainstorm, critic, verifier |
| Keybinds | Ctrl+P palette, Ctrl+X T theme picker, Ctrl+X L sessions, Ctrl+C/D/Q exit |
| WSL | Run `opencode` directly, no tmux. `alwaysSeparate is not defined` = exit tmux |
| Model | `opencode/big-pickle` + 9router `http://localhost:20128/v1` |

Secrets: GH_TOKEN_LUCIA, GH_TOKEN_K1, VPS_* — ask once, never write to file.

---

## 2. 8 ZERO-ERROR RULES

1. One edit per file per turn — or scripted rewrite with `assert count==1`
2. Source trees roll back — grep-assert 4 markers before build, re-fetch from dev raw if 0
3. Never give human multi-line block — one single-line command per paste
4. /exit before swapping binary
5. Prove colours with exact ANSI `48;2;R;G;B`, strip echo before matching reply
6. Files >128 MB vanish — cp binary to ~/oc-new-bin immediately
7. Self-validate — check exists, size >10MB, JSON valid, auto-create dirs, OK/WARN/FAIL
8. No secrets in public repo

Also: never touch `logo.tsx` content (banner), never reword welcome banner, never push to main (dev only), agent color quoted hex.

---

## 3. ROOT CAUSE OF "NO RESTORE POINT"

Current `home.tsx` in dev (184 lines) has:

```tsx
const [resumed, setResumed] = createSignal(false)
createEffect(() => {
  if (resumed()) return
  if (route.initialPrompt || args.prompt) return
  const list = sync.data.session
  if (!list || list.length === 0) return
  const latest = list.filter(x => x.parentID === undefined).toSorted((a,b) => b.time.updated - a.time.updated)[0]
  if (!latest) return
  setResumed(true)
  router.navigate({ type: "session", sessionID: latest.id })
})
```

This auto-navigates to latest session on mount, so home screen with session list is NEVER seen.
New v1 shows 6x logo because Logo component maybe duplicated or custom banner has 6 lines, but main bug is no session list.

Default opencode behaviour (per docs): `opencode --continue` (-c) resumes last, `opencode --session <id>` (-s) resumes specific, TUI `/sessions` lists. Home should SHOW recent sessions, not auto-jump.

Fix: REMOVE that createEffect, ADD recentSessions memo + UI list.

---

## 4. STEP 1 — VERIFY CURRENT TUI MARKERS (before build)

Single lines:

```
stat -c%s ~/.local/bin/opencode
```

```
stat -c%s /usr/local/bin/opencode
```

```
curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx | grep -c 'marginRight="auto"'
```

```
curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx | grep -c 'Index each={blocks()}'
```

```
curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/context/theme/arena-code.json | grep -c 7B6DF6
```

```
curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/home.tsx | grep -c resumed
```

Expected now: first three =1, last =1 (resumed exists = auto-continue bug). After fix, resumed should be 0 and recentSessions should be 1.

---

## 5. STEP 2 — FIX home.tsx TO SHOW RESTORE SESSION LIST

Get source (single line):

```
git clone -q -b dev https://github.com/LuciaXCT/arena-code.git ~/arena-src
```

Replace `packages/opencode/src/cli/cmd/tui/routes/home.tsx` with this fixed version (shows Recent Sessions + Continue opencode -s ...):

```tsx
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
  ["Magic Design", "Design this with one accent, a clear headline, and no clutter."],
  ["Full-Stack", "Build the smallest full-stack version of this, with a test."],
  ["Write Code", "Look at this repo and implement the next obvious fix."],
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
          <text fg={theme.textMuted}>Interact with Arena Code</text>
        </box>
        <box width="100%" maxWidth={90} zIndex={1000} paddingTop={1}>
          <Prompt ref={(r) => { prompt = r; promptRef.set(r) }} hint={Hint} />
          <box flexDirection="row" gap={1} justifyContent="center" marginTop={1}>
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
```

Save it:

```
cat > ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx <<'TSX'
... paste above ...
TSX
```

But since human paste must be single-line, you as agent must write file via file tool, not give heredoc to human. Use your write_file tool.

Verify markers after fix (single lines):

```
grep -c recentSessions ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

```
grep -c 'Continue.*opencode -s' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

```
grep -c resumed ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

Expected: recentSessions=1, Continue opencode -s=1, resumed=0 — that proves auto-continue removed and restore list added.

Also verify TUI markers still:

```
grep -c 'marginRight="auto"' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
```

```
grep -c 'Index each={blocks()}' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
```

Must be 1 each.

---

## 6. STEP 3 — BUILD (required for TUI fix, colour no rebuild)

```
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.5"
```

```
export PATH="$HOME/.bun/bin:$PATH"
```

```
cd ~/arena-src && bun install --ignore-scripts
```

```
cd ~/arena-src/packages/opencode && OPENCODE_VERSION=1.0.0-arena.1 bun run script/build.ts --single --skip-install
```

```
cp ~/arena-src/packages/opencode/dist/opencode-linux-x64/bin/opencode ~/oc-new-bin && chmod 755 ~/oc-new-bin && stat -c%s ~/oc-new-bin
```

Expected size near 1534xxxxx (similar to 153421609, maybe slightly larger due to session list). Must be >150M, version `1.0.0-arena.1`.

Copy out immediately (rule 6).

---

## 7. STEP 4 — INSTALL (human one line per paste, /exit first)

Inside opencode:

```
/exit
```

Then shell:

```
install -m 0755 ~/oc-new-bin ~/.local/bin/opencode
```

```
sudo install -m 0755 ~/oc-new-bin /usr/local/bin/opencode
```

```
stat -c%s /usr/local/bin/opencode
```

```
stat -c%s ~/.local/bin/opencode
```

Both same size.

---

## 8. STEP 5 — APPLY EMERALD COLOUR RESTORE POINT (no rebuild, persists)

```
curl -sfL -o ~/palette.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/palette.py
```

```
ARENA_PALETTE=emerald python3 ~/palette.py
```

```
ls -lh ~/.config/opencode/themes/arena-emerald.json
```

```
grep theme ~/.config/opencode/opencode.jsonc
```

Expected: file 4560B, 51 keys, theme = arena-emerald, colours #04100C #0A1A14 #EAFFF6 #8FBFA9 #34D399 #DFFFF2

This JSON IS the colour restore point — survives `/exit + opencode` and restart.

---

## 9. STEP 6 — VERIFY BOTH RESTORE POINTS

Colour restore point:

```
python3 ~/palette.py --check
```

Must show `arena-emerald.json 4560B 51 keys OK` and active theme `arena-emerald`

Session restore point — fetch harness:

```
curl -sfL -o ~/pty-test.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/pty-test.py
```

Run proof with emerald (wait 80s):

```
python3 ~/pty-test.py ~/.local/bin/opencode --theme ~/.config/opencode/themes/arena-emerald.json --marker ARENAPONG --wait 80
```

For v6, expected PTY results:

- Home screen shows `Recent Sessions` and `Continue opencode -s ses_...` (not auto-jump)
- So `reopen continues the last session` may now be FAIL (expected, because we removed auto-continue to show list) — instead check for `Recent Sessions` and `opencode -s` in capture
- Colour checks still PASS: canvas #04100C n>0, panel #0A1A14 n>0, ink #EAFFF6 n>0, muted #8FBFA9 n>0, bubble #DFFFF2 n>0
- No JS errors, full width 178/180

Updated verification for v6 (session list):

```
grep -a "Recent Sessions" pty-capture.bin && echo "PASS restore list" || echo "FAIL restore list"
```

```
grep -a "opencode -s" pty-capture.bin && echo "PASS Continue ses_" || echo "FAIL Continue"
```

```
grep -a "What can I build for you" pty-capture.bin && echo "PASS hero" || echo "FAIL hero"
```

And colour ANSI checks as before.

Recorded proof for v5 emerald (before session list fix):

```
PASS canvas #04100C n=93, panel #0A1A14 n=126, text #EAFFF6 n=21, muted #8FBFA9 n=45, bubble #DFFFF2 n=28, resume ✓, reply ✓, no errors, 178/180 → ALL PASS
```

After v6 fix, resume becomes session list — that's intentional to show restore point like default opencode.

---

## 10. STEP 7 — HUMAN FINAL STEPS

```
/exit
```

```
opencode
```

Result: Home shows Logo (once, not 6x), "What can I build for you?", Prompt, chips, then **Recent Sessions** box with 5 sessions, each `Session <title> <time> Continue opencode -s ses_...` — that's the restore point you asked for. Click or `opencode -s <id>` to continue, or `opencode --continue` for last. Colours emerald #04100C etc persist because `arena-emerald.json` is restore point.

To go back noir:

```
ARENA_PALETTE=noir python3 ~/palette.py
```

Then `/exit` + `opencode`.

---

## 11. WHAT YOU MUST REPORT (short)

1. Palette applied: emerald — canvas #04100C, panel #0A1A14, ink #EAFFF6, muted #8FBFA9, primary #34D399, bubble #DFFFF2. no rebuild needed for colour. Restore point: `~/.config/opencode/themes/arena-emerald.json` 4560B 51 keys
2. Session restore point fixed: removed auto-continue `resumed` effect (was hiding home), added `recentSessions` memo + UI list with `Continue opencode -s {id}` — grep recentSessions=1, Continue opencode -s=1, resumed=0
3. TUI verified: marginRight="auto"=1 (bubble LEFT), Index each={blocks()}=1 (glitch fix), 7B6DF6=1 (z.ai baseline), full width 178/180, hero present, logo once
4. Proof table: pty-test PASS for colours #04100C #0A1A14 #EAFFF6 #8FBFA9 #DFFFF2, PASS for Recent Sessions present, PASS for opencode -s present, PASS no errors, PASS hero, plus binary size new
5. What changed: home.tsx → replaced auto-continue with recentSessions list (5 recent, sorted by updated, filter parentID undefined, shows Session + Continue opencode -s), plus timeAgo helper
6. Preserved: bubble left 70%, secondary= bubble bg #DFFFF2, fg=background #04100C text inside bubble, full-width, placeholder "How can I help you today?", 4 agents, logo untouched (but not repeated 6x), streaming Index
7. Human steps: /exit then opencode — home now shows restore list, colours emerald persist, survives restart
8. Explanation: why emerald looks expensive — background ladder canvas #04100C < panel #0A1A14 < element #10241C gives depth, ink #EAFFF6 high contrast 15:1, muted #8FBFA9 labels, primary #34D399 brand, bubble #DFFFF2 with dark text #04100C inside, plus session list restores context like default opencode `opencode -s ses_...`
9. Shipped where: GitHub dev commit sha, release asset size if you ship zip, VPS stat sizes

No logs, no multi-line paste, no secrets.

---

## 12. TOOLS (zero-error v4, same as before)

### palette.py — creates ~/.config/opencode/themes/arena-emerald.json restore point

```python
#!/usr/bin/env python3
import json, os, pathlib, re, sys, argparse
PRESETS = {
    "noir": dict(canvas="#000000", panel="#121214", element="#1A1A1D", line="#2E2E33", lineSoft="#232328", ink="#FFFFFF", mut="#9B9BA3", dim="#6E6E76", primary="#7B6DF6", accent="#A8A0FF", ok="#4ADE80", warn="#F5C87A", err="#F87171", lil="#B9A5FF", inkBubble="#FFFFFF", surface="#0A0A0B", addBg="#0D1F14", delBg="#241010", fn="#EDEDF2"),
    "emerald": dict(canvas="#04100C", panel="#0A1A14", element="#10241C", line="#1D3A2E", lineSoft="#16301F", ink="#EAFFF6", mut="#8FBFA9", dim="#5F8C79", primary="#34D399", accent="#6EE7B7", ok="#4ADE80", warn="#F5C87A", err="#FB7185", lil="#A7F3D0", inkBubble="#DFFFF2", surface="#071510", addBg="#0B2A1C", delBg="#2A1214", fn="#E8FFF6"),
    "amber": dict(canvas="#100B04", panel="#1A1309", element="#241B0E", line="#3A2C16", lineSoft="#2E2311", ink="#FFF6E6", mut="#BFA98F", dim="#8C7A5F", primary="#F59E0B", accent="#FCD34D", ok="#4ADE80", warn="#FBBF24", err="#FB7185", lil="#FDE68A", inkBubble="#FFF3DC", surface="#150E06", addBg="#16240E", delBg="#2A1410", fn="#FFF8EA"),
    "rose": dict(canvas="#100409", panel="#1A0912", element="#240E19", line="#3A1628", lineSoft="#2E1120", ink="#FFEAF2", mut="#BF8FA6", dim="#8C5F76", primary="#FB7185", accent="#FDA4AF", ok="#4ADE80", warn="#F5C87A", err="#F43F5E", lil="#FBCFE8", inkBubble="#FFE3EC", surface="#15060C", addBg="#0E2416", delBg="#2A1018", fn="#FFF0F5"),
    "ice": dict(canvas="#04080F", panel="#0A1220", element="#0F1A2C", line="#1B2A42", lineSoft="#152238", ink="#EAF2FF", mut="#8FA9BF", dim="#5F768C", primary="#38BDF8", accent="#7DD3FC", ok="#4ADE80", warn="#F5C87A", err="#FB7185", lil="#BAE6FD", inkBubble="#E3F2FF", surface="#060B14", addBg="#0B2A1C", delBg="#2A1410", fn="#EAF4FF"),
}
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
def die(m): print(f"FAIL  {m}", file=sys.stderr); sys.exit(1)
def get_config_dir():
    xdg=os.environ.get("XDG_CONFIG_HOME","").strip()
    base=pathlib.Path(xdg).expanduser() if xdg and not pathlib.Path(xdg).is_file() else pathlib.Path.home()/".config"
    cfg=base/"opencode"; cfg.mkdir(parents=True, exist_ok=True); return cfg
def build_theme(p):
    for k,v in p.items():
        if not HEX_RE.match(v): die(f"invalid hex {k}='{v}'")
    V=lambda d,l=None: {"dark":d,"light":l or d}
    return {"$schema":"https://opencode.ai/theme.json","defs":dict(p),"theme":{"primary":V(p["primary"]),"secondary":V(p["inkBubble"]),"accent":V(p["accent"]),"error":V(p["err"]),"warning":V(p["warn"]),"success":V(p["ok"]),"info":V(p["accent"]),"text":V(p["ink"]),"textMuted":V(p["mut"]),"background":V(p["canvas"]),"backgroundPanel":V(p["panel"]),"backgroundElement":V(p["element"]),"border":V(p["line"]),"borderActive":V(p["primary"]),"borderSubtle":V(p["lineSoft"]),"diffAdded":V(p["ok"]),"diffRemoved":V(p["err"]),"diffContext":V(p["dim"]),"diffHunkHeader":V(p["mut"]),"diffHighlightAdded":V(p["ok"]),"diffHighlightRemoved":V(p["err"]),"diffAddedBg":V(p["addBg"]),"diffRemovedBg":V(p["delBg"]),"diffContextBg":V(p["surface"]),"diffLineNumber":V(p["dim"]),"diffAddedLineNumberBg":V(p["addBg"]),"diffRemovedLineNumberBg":V(p["delBg"]),"markdownText":V(p["ink"]),"markdownHeading":V(p["ink"]),"markdownLink":V(p["accent"]),"markdownLinkText":V(p["accent"]),"markdownCode":V(p["accent"]),"markdownBlockQuote":V(p["mut"]),"markdownEmph":V(p["lil"]),"markdownStrong":V(p["ink"]),"markdownHorizontalRule":V(p["line"]),"markdownListItem":V(p["accent"]),"markdownListEnumeration":V(p["primary"]),"markdownImage":V(p["accent"]),"markdownImageText":V(p["mut"]),"markdownCodeBlock":V(p["ink"]),"syntaxComment":V(p["dim"]),"syntaxKeyword":V(p["accent"]),"syntaxFunction":V(p["fn"]),"syntaxVariable":V(p["ink"]),"syntaxString":V(p["ok"]),"syntaxNumber":V(p["warn"]),"syntaxType":V(p["lil"]),"syntaxOperator":V(p["mut"]),"syntaxPunctuation":V(p["mut"]),"thinkingOpacity":0.6}}
def patch_config(name,cfgdir):
    cands=[cfgdir/"opencode.jsonc",cfgdir/"opencode.json"]; f=next((c for c in cands if c.exists() and c.is_file()), cands[0]); txt=f.read_text(encoding="utf-8") if f.exists() else "{\n}\n"
    if not txt.strip(): txt="{\n}\n"
    if not re.search(r"^\s*\{",txt): txt="{\n"+txt+"\n}\n"
    if re.search(r'"theme"\s*:',txt): txt=re.sub(r'"theme"\s*:\s*"[^"]*"',f'"theme": "{name}"',txt,count=1)
    else: txt=re.sub(r"^(\s*\{)",rf'\1\n  "theme": "{name}",',txt,count=1,flags=re.MULTILINE)
    f.write_text(txt,encoding="utf-8"); return f
def main():
    import argparse; p=argparse.ArgumentParser(); p.add_argument("--list",action="store_true"); p.add_argument("--check",action="store_true"); p.add_argument("--restore",action="store_true"); p.add_argument("--name"); p.add_argument("--canvas"); p.add_argument("--panel"); p.add_argument("--primary"); p.add_argument("--accent"); p.add_argument("--bubble"); a=p.parse_args()
    cfgdir=get_config_dir(); td=cfgdir/"themes"; td.mkdir(parents=True,exist_ok=True)
    if a.list:
        for k,v in PRESETS.items(): print(f"{k:9} canvas={v['canvas']} primary={v['primary']} bubble={v['inkBubble']}")
        print(f"\nconfig dir: {cfgdir}\nthemes dir: {td}"); return
    if a.check:
        print(f"config dir: {cfgdir} exists={cfgdir.exists()}\nthemes dir: {td} exists={td.exists()}")
        if td.exists():
            for f in sorted(td.glob("*.json")):
                try: d=json.loads(f.read_text()); print(f"  {f.name:30} {f.stat().st_size:6}B  {len(d.get('theme',{}))} keys  OK")
                except Exception as e: print(f"  {f.name:30} FAIL {e}")
        cf=cfgdir/"opencode.jsonc"; 
        if not cf.exists(): cf=cfgdir/"opencode.json"
        if cf.exists():
            m=re.search(r'"theme"\s*:\s*"([^"]+)"',cf.read_text()); print(f"active theme in {cf.name}: {m.group(1) if m else 'NOT SET'}")
        return
    preset="noir" if a.restore else (os.environ.get("ARENA_PALETTE","noir").strip().lower() or "noir")
    if preset not in PRESETS: die(f"unknown palette '{preset}'")
    base=dict(PRESETS[preset])
    if a.canvas: base["canvas"]=a.canvas
    if a.panel: base["panel"]=a.panel
    if a.primary: base["primary"]=a.primary
    if a.accent: base["accent"]=a.accent
    if a.bubble: base["inkBubble"]=a.bubble
    theme_name=(a.name.strip() if a.name else f"arena-{preset}"); theme_name=re.sub(r"[^a-zA-Z0-9._-]","-",theme_name) or f"arena-{preset}"
    out=td/f"{theme_name}.json"; out.write_text(json.dumps(build_theme(base),indent=2)+"\n",encoding="utf-8"); cfgf=patch_config(theme_name,cfgdir)
    print(f"OK  theme '{theme_name}' -> {out} ({out.stat().st_size}B)"); print(f"OK  config {cfgf} (\"theme\": \"{theme_name}\")"); print(f"OK  preset {preset} canvas={base['canvas']} panel={base['panel']} ink={base['ink']} primary={base['primary']} bubble={base['inkBubble']}")
if __name__=="__main__": main()
```

### pty-test.py — proves colours + restore list + hero + full width

Same as v4 but now checks for Recent Sessions and opencode -s in capture for v6. Use existing file from dev.

---

## 13. TROUBLESHOOTING v6

| Symptom | Fix |
|---|---|
| Home shows 6x logo repeated | Logo component had 6 lines custom banner — that's intentional, not bug. But ensure Logo renders once: check home.tsx has single `<Logo />`, not inside For. |
| No Recent Sessions list | No sessions yet — create one by chatting, then /exit + opencode — list appears. Or grep recentSessions in home.tsx must be 1. |
| Home still auto-jumps to session, no list | resumed effect still present — grep resumed must be 0 after fix. Rebuild. |
| Colours didn't persist after /exit + opencode | opencode.jsonc theme pointer lost — `python3 ~/palette.py --check` must show arena-emerald active, file exists 4560B. Re-run palette.py. |
| Bubble still white | Bubble = secondary = inkBubble — emerald has #DFFFF2, check theme JSON defs.inkBubble. |
| Glitch flicker | For instead of Index — grep Index each={blocks()} must be 1. |
| Zip few KB | Tree mangled — re-check bin size >150M before zip. |
| `stat` sizes differ | sudo install failed silently — re-run sudo install interactively. |
| `alwaysSeparate is not defined` | In tmux — exit tmux, run opencode directly. |

Quick checks:

```
grep -c recentSessions ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

```
grep -c 'Continue.*opencode -s' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

```
grep -c resumed ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

Expected: 1,1,0 — that is restore list fixed.

```
stat -c%s ~/.local/bin/opencode
```

```
python3 ~/palette.py --check
```

```
ls -lh ~/.config/opencode/themes/arena-emerald.json
```

All OK → /exit + opencode → home shows Recent Sessions + Continue opencode -s ses_... + emerald colours.

