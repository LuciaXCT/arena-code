# ARENA CODE — NEW TUI DESIGN v2 · COMPLETE AGENT PROMPT (MODERN, NOT OLD OPENCODE)

**How to use:** paste below `=====` into Ct002. Human says: "this opencode design is already old, i dont like it, i still want new designn" — so make NEW TUI, not old opencode.

Previous good TUI 153417358 was z.ai noir + auto-continue, but still old opencode layout (left sidebar Context/LSP/Todo, right chat, blocky borders). New design must be **expensive, simple, easy, modern, beautiful** like Arena web, totally different from default OpenCode.

=====================================================================

## 0. MISSION — NEW DESIGN, NOT OLD

You are rebuilding Arena Code TUI v2 — new design, modern, not old opencode.

Old design (keep as reference, but REPLACE):
- Home: Logo (3 lines block ASCII) + "What can I build for you?" + 3 chips + Prompt + Toast + status bar directory/MCP/version
- Session: Left sidebar Context tokens/LSP/Todo/~ + Right chat YOU bubble left 70% white/black, ARENA reply, code boxes, file chips, timestamp, prompt bottom
- Palette: noir #000000 #121214 #FFFFFF #9B9BA3 #7B6DF6 or emerald #04100C #0A1A14 #EAFFF6 #8FBFA9 #34D399 #DFFFF2
- Layout: full-width 178/180, paddingX 3, maxWidth 90, borders borderSubtle #232328, border #2E2E33, borderActive #7B6DF6
- Glitch fix: Index each={blocks()} not For

New design must be:
1. **Totally different** from default OpenCode and from v1 — no left sidebar Context/LSP/Todo, no blocky borders everywhere, no 3 chips only
2. **Arena-like expensive simple easy**: lots of whitespace, minimal borders, subtle background ladder, soft text, primary accent only on interactive
3. **Modern beautiful body**: centered, maxWidth 80 (not 90), more breathing room, pill-shaped chips, card-style session list, bubble with avatar/timestamp, code blocks with title bar
4. **Restore session like default**: home shows Recent Sessions list with `Continue opencode -s ses_...` — NOT auto-jump that hides it. User said old v1 6x logo repeat + ~ │ 13:13 no restore point is BAD. New must show restore list.
5. **Colour**: new palette "midnight" — deeper blacks, softer whites, emerald accent but more muted, or keep emerald but with new accent #7B6DF6 → #34D399? Propose new palette: canvas #08080A, panel #111113, element #1A1A1E, line #242428, lineSoft #1E1E22, ink #F5F5F7, muted #8A8A93, dim #5A5A64, primary #7B6DF6 (keep brand) or #34D399 emerald, accent #A8A0FF, ok #4ADE80, warn #F5C87A, err #F87171, lil #B9A5FF, bubble #F5F5F7 (white soft), surface #0E0E10, addBg #0D1F14, delBg #241010, fn #EDEDF2
6. **No rebuild? NO, this IS rebuild** — TUI files change, so build required. Colour JSON alone not enough for new design. Build recipe in §6.

Work silently, short report, one-line commands for human.

---

## 1. MACHINE FACTS

| Thing | Value |
|---|---|
| Machine | Kali WSL /home/nijam, PATH prefers /usr/local/bin |
| Current good binary (OLD, to replace) | ~/.local/bin/opencode 153417358 (or 153411685) — z.ai noir, auto-continue, YOU left 70% |
| Bad binary (6x logo) | 153421609 with recentSessions — deleted, do NOT use |
| Source | LuciaXCT/arena-code dev — currently has resumed auto-continue (good old) |
| Config dir | ~/.config/opencode/ honours XDG |
| Colour restore point old | arena-emerald.json 4560B 51 keys #04100C #0A1A14 #EAFFF6 #8FBFA9 #34D399 #DFFFF2 — keep as option, but new palette midnight is new default |
| Session restore | Should show Recent Sessions list + Continue opencode -s ses_... like default, not auto-jump |
| Agents | exactly 4 |
| Keybinds | Ctrl+P, Ctrl+X T, Ctrl+X L sessions, /exit |
| WSL | opencode directly, no tmux |
| Model | big-pickle + 9router |

Secrets: GH_TOKEN_LUCIA, GH_TOKEN_K1, VPS_* — ask once, never write.

---

## 2. 8 ZERO-ERROR RULES

1. One edit per file per turn or scripted rewrite assert count==1
2. Source trees roll back — grep-assert 4 markers before build, re-fetch dev raw if 0
3. One single-line command per paste for human
4. /exit before swapping binary
5. Prove colours with ANSI 48;2;R;G;B, strip echo
6. Files >128 MB vanish — cp to ~/oc-new-bin immediately
7. Self-validate OK/WARN/FAIL not traceback
8. No secrets in public repo

Also: never touch logo.tsx content? For NEW DESIGN, you MAY adjust logo size/position but keep banner idea (human said don't touch welcome banner before, but new design needs new banner? Keep old banner for now, but make it smaller/centered). Never push main (dev only), agent color quoted hex.

---

## 3. NEW DESIGN SPEC — WHAT TO CHANGE

### 3.1 Palette — new "midnight" (replace arena-code.json baked default)

Old noir: canvas #000000, panel #121214, element #1A1A1D, line #2E2E33, ink #FFFFFF, muted #9B9BA3, dim #6E6E76, primary #7B6DF6, accent #A8A0FF

New midnight: canvas #08080A (not pure black, softer), panel #111113, element #1A1A1E, line #242428, lineSoft #1E1E22, ink #F5F5F7 (soft white, not harsh #FFFFFF), muted #8A8A93, dim #5A5A64, primary #7B6DF6 (keep brand) or #34D399 if emerald brand, accent #A8A0FF, ok #4ADE80, warn #F5C87A, err #F87171, lil #B9A5FF, bubble #F5F5F7, surface #0E0E10, addBg #0D1F14, delBg #241010, fn #EDEDF2

This keeps background ladder canvas < panel < element for depth, but softer, more expensive.

Build theme JSON with 15 hexes via palette.py or edit `context/theme/arena-code.json` directly.

### 3.2 Home screen — new layout (routes/home.tsx)

Old: Logo + title + subtitle + Prompt + 3 chips + Toast + status bar. No session list (auto-continue hid it) or bad recentSessions that caused 6x logo.

New:
- Centered column maxWidth 80 (not 90), more whitespace
- Logo: keep but smaller, centered, with marginBottom 2, not repeating
- Title: "What can I build for you?" keep, but subtitle more subtle: "Arena Code — expensive, simple, easy" or keep "Interact with Arena Code" but muted smaller
- Prompt: centered, with subtle borderActive primary when focused, placeholder "How can I help you today?" keep, but with more padding
- Chips: 5 chips like z.ai (Landing Page, Knowledge/Teaching Material, 3D Modeling, Mini Game, Personal Blog) OR keep 3 but pill-shaped with rounded border (if opentui supports rounded) and hover accent
- Recent Sessions: SHOW list like default opencode — 5 recent, sorted updated desc, filter parentID undefined, each card:
  - Border borderSubtle, bg backgroundElement, hover borderActive primary
  - Row1: Session icon + title/summary (id slice 0,12 if no title) + timeAgo (7s ago, 2m ago)
  - Row2: Continue opencode -s {id} in accent colour
  - On click: router.navigate sessionID
  - Header: "Recent Sessions · {count} · /sessions · ctrl+x l" with muted
- No auto-continue effect — remove resumed signal and createEffect that navigates to latest. Let home show list.
- Status bar: minimal, only directory (muted) and version (muted), no MCP count unless >0, no tips
- Toast centered

This fixes "no restore point" — home now shows restore list.

### 3.3 Session screen — new bubble and code design (routes/session/index.tsx)

Old: YOU bubble left 70% bg secondary fg background, hover accent, timestamp diffContext, ARENA label, code boxes border backgroundElement, file chips, Index blocks.

New:
- Remove left sidebar Context/LSP/Todo — make full-width chat only, no sidebar (or make sidebar toggleable but hidden by default). Old left sidebar with Context 157k tokens etc is old opencode design — new should be minimal.
- Chat column: paddingX 4 (not 3), maxWidth 80 centered, not full 178/180? But keep full-width paint for bars — new design still full width but with centered content 80.
- YOU bubble: width 65% (not 70%), marginRight auto (left), bg secondary #F5F5F7, fg background #08080A (dark text inside white soft bubble), border borderSubtle, borderColor hover accent, rounded? If possible border style rounded, padding 1, with avatar "YOU" muted small above, timestamp muted below bubble, not inside.
- ARENA reply: no bubble, just text with left border accent 2px primary? Or subtle backgroundPanel? Keep ARENA label muted small, timestamp diffContext.
- Code blocks: with title bar showing filename, bg backgroundElement, border border, borderActive primary on hover, with copy hint "copy" muted top-right, syntax highlighting same keys but with new palette.
- File chips: pill-shaped, bg backgroundElement, fg textMuted, border borderSubtle, small padding.
- Streaming: keep Index each={blocks()} + block() accessors — glitch fix.
- Prompt at bottom: same as home prompt, centered maxWidth 80, with agent switcher tab and ctrl+p commands hints.
- No left sidebar — full chat.

### 3.4 Components

- component/prompt.tsx: more padding, borderActive primary when focused, backgroundElement, placeholder muted.
- component/logo.tsx: keep but ensure renders once, not 6x. If new design wants new logo, propose minimal text "Arena Code" with TextAttributes.BOLD, not block ASCII? But keep old per rule? For new design, you MAY make logo smaller: single line "Arena Code" bold, not 3 lines block.
- component/*: ensure no hardcoded hex, all via theme.

### 3.5 Theme keys (51 keys)

Same as before, but with new midnight values. Ensure defs has 15 base colours, theme refs them.

---

## 4. FILE MAP

| Path | Change |
|---|---|
| `context/theme/arena-code.json` | new midnight palette baked default (15 defs, 51 theme keys) |
| `routes/home.tsx` | remove resumed auto-continue, add recentSessions memo + card UI with Continue opencode -s, maxWidth 80, 5 chips pill, logo once, no 6x repeat |
| `routes/session/index.tsx` | remove left sidebar Context/LSP/Todo, full-width chat centered 80, YOU bubble 65% left secondary fg background, timestamp below, ARENA no bubble left border primary, code boxes title bar, file chips pill, Index blocks kept, paddingX 4 |
| `component/prompt.tsx` | more padding, borderActive primary focus |
| `component/logo.tsx` | ensure once, maybe minimal "Arena Code" bold not 3-line block for new design |
| `~/.config/opencode/agent/*.md` | keep 4, color quoted hex |

---

## 5. MARKERS TO VERIFY BEFORE BUILD (grep-assert)

```
grep -c 'marginRight="auto"' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
```

```
grep -c 'Index each={blocks()}' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
```

```
grep -c recentSessions ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

```
grep -c 'Continue.*opencode -s' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

```
grep -c 7B6DF6 ~/arena-src/packages/opencode/src/cli/cmd/tui/context/theme/arena-code.json
```

For new design: recentSessions=1, Continue opencode -s=1, marginRight=1, Index=1, 7B6DF6 maybe 0 if new palette midnight uses different primary? But keep primary #7B6DF6 for brand, so 7B6DF6=1 still. If using emerald primary #34D399, then grep 34D399.

Good new design markers: recentSessions≥1, Continue≥1, marginRight≥1, Index≥1, primary hex present.

---

## 6. BUILD RECIPE (single lines)

```
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.5"
```

```
export PATH="$HOME/.bun/bin:$PATH"
```

```
git clone -q -b dev https://github.com/LuciaXCT/arena-code.git ~/arena-src
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

Expected size ~1534xxxxx, version 1.0.0-arena.1, bun 1.3.5.

Copy out immediately.

---

## 7. INSTALL (human one per paste, /exit first)

```
/exit
```

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

## 8. COLOUR RESTORE POINT (persists, no rebuild for colours, but new design needs rebuild for layout)

For new midnight palette, you can either bake into arena-code.json (rebuild) OR create runtime theme:

```
curl -sfL -o ~/palette.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/palette.py
```

```
ARENA_PALETTE=noir python3 ~/palette.py --canvas "#08080A" --panel "#111113" --primary "#7B6DF6" --name midnight
```

Or use emerald:

```
ARENA_PALETTE=emerald python3 ~/palette.py
```

```
ls -lh ~/.config/opencode/themes/ && grep theme ~/.config/opencode/opencode.jsonc
```

---

## 9. VERIFICATION — PTY TEST FOR NEW DESIGN

```
curl -sfL -o ~/pty-test.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/pty-test.py
```

```
python3 ~/pty-test.py ~/oc-new-bin --theme ~/.config/opencode/themes/arena-midnight.json --marker ARENAPONG --wait 80
```

Checks:
- Home shows Recent Sessions + Continue opencode -s ses_... (restore point)
- Logo once not 6x
- Hero "What can I build for you?"
- Canvas #08080A or #04100C on screen n>0
- Panel #111113 or #0A1A14 n>0
- Text #F5F5F7 or #EAFFF6 n>0
- Bubble #F5F5F7 or #DFFFF2 n>0
- No JS errors
- Full width paints to 178/180
- No left sidebar Context/LSP/Todo (new minimal)

For old emerald good (153417358):

```
PASS canvas #04100C n=93, panel #0A1A14 n=126, text #EAFFF6 n=21, muted #8FBFA9 n=45, bubble #DFFFF2 n=28, resume/session list, reply, no errors, 178/180 → ALL PASS
```

For new midnight v2, expect similar but with #08080A etc and Recent Sessions list present.

---

## 10. WHAT YOU MUST REPORT (short)

1. New design: what changed — home.tsx (recentSessions list cards, no auto-continue, maxWidth 80, 5 chips pill), session/index.tsx (no left sidebar, bubble 65% left, timestamp below, code title bar, file pills, paddingX 4), theme midnight #08080A #111113 #F5F5F7 #8A8A93 #7B6DF6 #F5F5F7
2. Palette applied: midnight or emerald — headline hexes + restore point JSON path + size
3. Proof table: pty-test PASS/FAIL verbatim — Recent Sessions present, opencode -s present, logo once, hero present, colours n>0, no errors, full width
4. Preserved: 4 agents, placeholder, tab/ctrl+p hints, Index glitch fix, bubble left, full-width paint, logo not 6x
5. Human steps: /exit then opencode — new design visible, colours persist, session list restore
6. Explanation: 3-6 sentences why new design looks expensive simple easy — whitespace, background ladder, soft whites, primary only on interactive, pill chips, card sessions, minimal status bar
7. Shipped where: dev commit sha, release asset size, VPS stat

No logs, no multi-line paste, no secrets.

---

## 11. TROUBLESHOOTING NEW DESIGN

| Symptom | Fix |
|---|---|
| 6x logo repeat | Logo inside For loop or custom banner 6 lines — ensure single <Logo /> in home.tsx, not inside For |
| No Recent Sessions list | No sessions yet — chat once, /exit, opencode — list appears. Or grep recentSessions must be 1 |
| Home auto-jumps to session, no list | resumed effect still present — remove resumed signal and createEffect navigate, keep recentSessions |
| Left sidebar Context/LSP/Todo still shows | You didn't remove it from session/index.tsx — remove that box, make full-width chat centered 80 |
| Colours didn't change | Theme JSON not active — grep theme opencode.jsonc must show new name, ls themes/ must have JSON 4560B |
| Bubble still 70% not 65% | Edit width in session/index.tsx to 65% |
| Glitch flicker | For instead of Index — grep Index each={blocks()} must be 1 |
| Zip few KB | Tree mangled — re-check bin size >150M before zip |
| stat sizes differ | sudo install failed — re-run sudo install interactively |
| alwaysSeparate is not defined | In tmux — exit tmux, run opencode directly |

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

For new design: 1,1,0 — new list, no auto-jump.

```
stat -c%s ~/.local/bin/opencode
```

```
python3 ~/palette.py --check
```

All OK → /exit + opencode → new modern design.

