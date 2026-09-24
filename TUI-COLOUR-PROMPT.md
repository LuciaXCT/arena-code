# ARENA CODE — TUI COLOUR & LOOK · COMPLETE AGENT PROMPT (v3)

**How to use:** paste everything below the `=====` line into your AI agent (Ct002).
It is self-contained: it tells the agent what to change, where the code lives, how to
build, how to *prove* the result in a real terminal, and how to ship it. Nothing else
is needed.

Proven on build **153417358** (`opencode --version` → `1.0.0-arena.1`), Kali WSL + Linux x64.

=====================================================================

## 0. MISSION

You are restyling the **Arena Code** TUI (a build of OpenCode). The human wants to change
the **colours** and "so on" — i.e. the whole look: palette, bubbles, layout, spacing,
labels, hero screen. You must:

1. Ship a **new palette** the human can switch in seconds, **without rebuilding** (Tier 1).
2. Keep every look-and-feel fix already in the product, and be able to change the
   **shape/layout/copy** too, by rebuilding (Tier 2).
3. **Prove** it in a real PTY terminal with exact ANSI colour evidence — not by eye,
   not by "looks fine".
4. Ship it to the two places the human uses: the **GitHub release** and the **VPS**.

Work silently. Do not paste giant logs at the human. Report the short table in §8.

---

## 1. MACHINE FACTS (do not re-discover these)

| Thing | Value |
|---|---|
| Human's machine | Kali Linux **WSL**, home `/home/nijam`, PATH prefers `/usr/local/bin` |
| Binary (2 copies, both must match) | `~/.local/bin/opencode` **and** `/usr/local/bin/opencode` |
| Current good build size | **153417358** bytes — verify with `stat -c%s` |
| Source (public, full tree) | `https://github.com/LuciaXCT/arena-code` branch **`dev`** |
| Public no-token download | `https://github.com/LuciaXCT/arena-code/releases/download/v1.0.0-arena.1/arena-code-1.0.0-arena.1-linux-x64.zip` |
| Release ids | `LuciaXCT/arena-code` → **395208634**; `k1ruuuu/arena-cli` (private) → **395165172** |
| VPS | host/user/port/password: **ask the human** (never print, never commit them) |
| Config dir | `~/.config/opencode/` (`opencode.jsonc`, `agent/`, `command/`, `themes/`) |
| Model in use | `opencode/big-pickle` (free tier) + `9router` provider on `http://localhost:20128/v1` |
| Agents (exactly 4, never add/remove) | `arena` `brainstorm` `critic` `verifier` |
| Command palette | **Ctrl+P** · theme picker: **Ctrl+X then T** (`<leader>t`) · new session: `<leader>n` |

Secrets you need from the human (5 values): `GH_TOKEN_LUCIA`, `GH_TOKEN_K1`,
`VPS_HOST`, `VPS_USER`, `VPS_PASS`. Ask once, keep them out of every file and every log.

---

## 2. THE 6 RULES THAT PREVENT 90% OF THE FAILURES

These were all learned the hard way. Breaking any one of them has already broken a release.

1. **One edit per file per turn.** Never issue two edits to the same file in the same
   response — they race and silently clobber each other (a whole restyle was lost this way).
   If a file needs several changes, rewrite it with a script that asserts each replacement
   happened exactly once: `assert s.count(old) == 1`.
2. **Source trees roll back.** Sandboxes/snapshots silently restore older copies of files.
   **Before every build**, grep-assert the 4 markers (§5.2). If any is missing, re-fetch that
   file from `dev` and re-assert. Never build on an unverified tree.
3. **Never give the human a multi-line block to paste.** Their terminal eats line breaks →
   `syntax error near unexpected token`. Give **one single-line command per paste**, or do it
   yourself with your file tools. No `if/then`, no heredocs, no `\` continuations.
4. **`/exit` before swapping the binary.** A running `opencode` cannot be hot-swapped;
   replacing the file under it produces a broken process. Tell the human to `/exit` first.
5. **Prove colours with exact ANSI, not text.** A green tick that only searched for the word
   "YOU" passed a broken build twice. Assert the true-colour triplet, e.g. `48;2;0;0;0`.
   Also **strip the text you typed** before asserting a model reply, or you match your own echo.
6. **Files >128 MB vanish from sandboxes.** Right after a build, copy the binary somewhere
   safe (`cp dist/.../opencode ~/oc-new-bin`) and re-check its size before shipping.
   Restore from the release zip if it disappears.

Also: never touch `logo.tsx`, never reword the welcome banner (the human tuned it),
never push to `main` (always `dev`), never ship `MODELS_DEV_API_JSON={}`,
and an agent's `color:` in its markdown **must be a quoted hex** (`"#7B6DF6"`) or the TUI won't boot.

---

## 3. TIER 1 — CHANGE THE COLOURS **WITHOUT REBUILDING** (≈3 minutes) ← do this first

### 3.1 Why this works

OpenCode reads **custom theme JSON at runtime** and merges it over the built-in themes
(`getCustomThemes()` in `src/cli/cmd/tui/context/theme.tsx`, glob `themes/*.json`):

* global: `~/.config/opencode/themes/<name>.json` (honours `$XDG_CONFIG_HOME`)
* per-project: `<project>/.opencode/themes/<name>.json` (or `.arena/themes/` when `ARENA=1`)

A file named `arena-emerald.json` becomes the theme named `arena-emerald`. A custom theme
**overrides a built-in theme of the same name** — so you can even overwrite `arena-code`.
Active theme = `"theme"` in `opencode.jsonc` (or the picker: Ctrl+X → T).

**Nothing in the TUI hard-codes a hex colour** (verified: zero `#RRGGBB` literals in
`routes/` and `component/`). Every colour on screen comes from these keys → a JSON file
is a complete repaint.

### 3.2 Create `tools/palette.py`

Write this file exactly (it is tested). It builds a full 51-key theme from **15 hex values**,
writes it to the config dir, and patches `"theme"` in `opencode.jsonc` **without destroying
the JSONC comments** (regex, never `json.load`).

```python
#!/usr/bin/env python3
"""palette.py — Arena Code TUI palette switcher (no rebuild needed).
   python3 palette.py                      # apply preset 'noir'
   ARENA_PALETTE=emerald python3 palette.py
   python3 palette.py --list"""
import json, os, pathlib, re, sys

# canvas=app bg · panel=chat column bg · element=boxes/chips/input bg · surface=diff ctx bg
# line=borders · lineSoft=subtle borders · ink=main text · mut=labels · dim=timestamps/faint
# primary=brand (active borders, selection) · accent=links/code accent · ok/warn/err=status
# lil=emphasis/italic · inkBubble=USER BUBBLE background · addBg/delBg=diff backgrounds · fn=code text
PRESETS = {
 "noir":    dict(canvas="#000000", panel="#121214", element="#1A1A1D", line="#2E2E33", lineSoft="#232328",
                 ink="#FFFFFF", mut="#9B9BA3", dim="#6E6E76", primary="#7B6DF6", accent="#A8A0FF",
                 ok="#4ADE80", warn="#F5C87A", err="#F87171", lil="#B9A5FF", inkBubble="#FFFFFF",
                 surface="#0A0A0B", addBg="#0D1F14", delBg="#241010", fn="#EDEDF2"),
 "emerald": dict(canvas="#04100C", panel="#0A1A14", element="#10241C", line="#1D3A2E", lineSoft="#16301F",
                 ink="#EAFFF6", mut="#8FBFA9", dim="#5F8C79", primary="#34D399", accent="#6EE7B7",
                 ok="#4ADE80", warn="#F5C87A", err="#FB7185", lil="#A7F3D0", inkBubble="#DFFFF2",
                 surface="#071510", addBg="#0B2A1C", delBg="#2A1214", fn="#E8FFF6"),
 "amber":   dict(canvas="#100B04", panel="#1A1309", element="#241B0E", line="#3A2C16", lineSoft="#2E2311",
                 ink="#FFF6E6", mut="#BFA98F", dim="#8C7A5F", primary="#F59E0B", accent="#FCD34D",
                 ok="#4ADE80", warn="#FBBF24", err="#FB7185", lil="#FDE68A", inkBubble="#FFF3DC",
                 surface="#150E06", addBg="#16240E", delBg="#2A1410", fn="#FFF8EA"),
 "rose":    dict(canvas="#100409", panel="#1A0912", element="#240E19", line="#3A1628", lineSoft="#2E1120",
                 ink="#FFEAF2", mut="#BF8FA6", dim="#8C5F76", primary="#FB7185", accent="#FDA4AF",
                 ok="#4ADE80", warn="#F5C87A", err="#F43F5E", lil="#FBCFE8", inkBubble="#FFE3EC",
                 surface="#15060C", addBg="#0E2416", delBg="#2A1018", fn="#FFF0F5"),
 "ice":     dict(canvas="#04080F", panel="#0A1220", element="#0F1A2C", line="#1B2A42", lineSoft="#152238",
                 ink="#EAF2FF", mut="#8FA9BF", dim="#5F768C", primary="#38BDF8", accent="#7DD3FC",
                 ok="#4ADE80", warn="#F5C87A", err="#FB7185", lil="#BAE6FD", inkBubble="#E3F2FF",
                 surface="#060B14", addBg="#0B2A1C", delBg="#2A1410", fn="#EAF4FF"),
}

def build(p):
    V = lambda d, l=None: {"dark": d, "light": l or d}
    return {"$schema": "https://opencode.ai/theme.json", "defs": dict(p), "theme": {
        "primary": V(p["primary"]), "secondary": V(p["inkBubble"]), "accent": V(p["accent"]),
        "error": V(p["err"]), "warning": V(p["warn"]), "success": V(p["ok"]), "info": V(p["accent"]),
        "text": V(p["ink"]), "textMuted": V(p["mut"]),
        "background": V(p["canvas"]), "backgroundPanel": V(p["panel"]), "backgroundElement": V(p["element"]),
        "border": V(p["line"]), "borderActive": V(p["primary"]), "borderSubtle": V(p["lineSoft"]),
        "diffAdded": V(p["ok"]), "diffRemoved": V(p["err"]), "diffContext": V(p["dim"]),
        "diffHunkHeader": V(p["mut"]), "diffHighlightAdded": V(p["ok"]), "diffHighlightRemoved": V(p["err"]),
        "diffAddedBg": V(p["addBg"]), "diffRemovedBg": V(p["delBg"]), "diffContextBg": V(p["surface"]),
        "diffLineNumber": V(p["dim"]), "diffAddedLineNumberBg": V(p["addBg"]), "diffRemovedLineNumberBg": V(p["delBg"]),
        "markdownText": V(p["ink"]), "markdownHeading": V(p["ink"]), "markdownLink": V(p["accent"]),
        "markdownLinkText": V(p["accent"]), "markdownCode": V(p["accent"]), "markdownBlockQuote": V(p["mut"]),
        "markdownEmph": V(p["lil"]), "markdownStrong": V(p["ink"]), "markdownHorizontalRule": V(p["line"]),
        "markdownListItem": V(p["accent"]), "markdownListEnumeration": V(p["primary"]),
        "markdownImage": V(p["accent"]), "markdownImageText": V(p["mut"]), "markdownCodeBlock": V(p["ink"]),
        "syntaxComment": V(p["dim"]), "syntaxKeyword": V(p["accent"]), "syntaxFunction": V(p["fn"]),
        "syntaxVariable": V(p["ink"]), "syntaxString": V(p["ok"]), "syntaxNumber": V(p["warn"]),
        "syntaxType": V(p["lil"]), "syntaxOperator": V(p["mut"]), "syntaxPunctuation": V(p["mut"]),
        "thinkingOpacity": 0.6}}

def patch_config(name, cfgdir):
    f = cfgdir / "opencode.jsonc"
    if not f.exists() and (cfgdir / "opencode.json").exists():
        f = cfgdir / "opencode.json"
    txt = f.read_text() if f.exists() else "{\n}\n"
    if re.search(r'"theme"\s*:', txt):
        txt = re.sub(r'"theme"\s*:\s*"[^"]*"', f'"theme": "{name}"', txt, count=1)
    else:
        txt = re.sub(r"^(\s*\{)", rf'\1\n  "theme": "{name}",', txt, count=1)
    f.write_text(txt)
    return f

def main():
    if "--list" in sys.argv:
        for k, v in PRESETS.items():
            print(f"{k:9} canvas={v['canvas']} primary={v['primary']} accent={v['accent']} bubble={v['inkBubble']}")
        return
    name = os.environ.get("ARENA_PALETTE", "noir").strip().lower()
    if name not in PRESETS:
        sys.exit(f"unknown palette '{name}'. options: {', '.join(PRESETS)}")
    theme_name = f"arena-{name}"
    cfgdir = pathlib.Path(os.environ.get("XDG_CONFIG_HOME") or (pathlib.Path.home() / ".config")) / "opencode"
    (cfgdir / "themes").mkdir(parents=True, exist_ok=True)
    out = cfgdir / "themes" / f"{theme_name}.json"
    out.write_text(json.dumps(build(PRESETS[name]), indent=2) + "\n")
    cfg = patch_config(theme_name, cfgdir)
    r, g, b = (int(PRESETS[name]["primary"][i:i+2], 16) for i in (1, 3, 5))
    print(f"OK  theme '{theme_name}' -> {out}")
    print(f"OK  config  {cfg}  (\"theme\": \"{theme_name}\")")
    print(f"PROOF  expect ANSI triplet 48;2;{r};{g};{b} (primary) on screen after restart")

if __name__ == "__main__":
    main()
```

The human can also fetch it in one line (once you have pushed it to `dev`):

```
curl -sfL -o ~/palette.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/palette.py
```

### 3.3 Apply a palette (single lines, one per paste)

```
ARENA_PALETTE=emerald python3 ~/palette.py
```

then, inside opencode: `/exit` — and start it again:

```
opencode
```

To make a **new** palette of your own: add one entry to `PRESETS` (15 hex values) or copy
the generated JSON and edit hexes directly. To overwrite the shipped look everywhere,
name the file `arena-code.json` — a custom theme beats the built-in one of the same name.

### 3.4 The 6 values that control ~90% of the look

| You want | Change |
|---|---|
| darker / lighter app | `canvas` → then `panel` (one step lighter) → `element` (one step more) |
| the brand colour (borders, selection, list markers) | `primary` |
| links, inline code, accents | `accent` |
| the **white user bubble** | `inkBubble` (= theme key `secondary`) |
| text readability | `ink` (main), `mut` (labels), `dim` (timestamps) — keep ≥ 7:1 / 4.5:1 contrast on `canvas` |
| success / warning / failure | `ok`, `warn`, `err` |

Keep the three-step background ladder (`canvas` < `panel` < `element`) — that ladder *is*
the depth of the design. Flatten it and the UI looks cheap.

### 3.5 The bubble-text trap (read this)

The user bubble paints `bg = theme.secondary` and **`fg = theme.background`**.
So the text inside the bubble is always your *canvas* colour. That is why the shipped look
is a **white bubble with black text** (canvas `#000000`, `inkBubble #FFFFFF`).

If the human wants a **coloured bubble with white text** (e.g. indigo bubble), Tier 1 is not
enough — edit one line in Tier 2 (§5.5, edit A).

---

## 4. THEME KEY REFERENCE (all 51 keys + 1 number)

Value forms: `"#RRGGBB"` · a `defs` reference name (`"coral"`) · `{"dark": "...", "light": "..."}` ·
`"transparent"` / `"none"`. Unknown reference names **throw** at startup (`Color reference "x" not found`) —
so if the TUI refuses to boot after a theme edit, you have a typo in a ref name.

| Key | What it paints |
|---|---|
| `primary` | brand accent: active borders, selection, list enumerations |
| `secondary` | **the user message bubble background** |
| `accent` | links, inline code, markdown list bullets, info |
| `error` / `warning` / `success` / `info` | status, failures, tool errors, ok states |
| `text` | main text (most-used key) |
| `textMuted` | labels, `YOU`/`ARENA` tags, secondary text (most-used key) |
| `selectedListItemText` | *optional* — text on a selected row (falls back to `background`) |
| `background` | app canvas **and the text colour inside the user bubble** |
| `backgroundPanel` | the chat column behind messages |
| `backgroundElement` | boxes: input editor, chips, code blocks, dialogs |
| `backgroundMenu` | *optional* — menus (falls back to `backgroundElement`) |
| `border` / `borderActive` / `borderSubtle` | box edges / focused edge / hairlines |
| `diffAdded` `diffRemoved` `diffContext` `diffHunkHeader` `diffHighlightAdded` `diffHighlightRemoved` `diffAddedBg` `diffRemovedBg` `diffContextBg` `diffLineNumber` `diffAddedLineNumberBg` `diffRemovedLineNumberBg` | file diffs and patch views |
| `markdownText` `markdownHeading` `markdownLink` `markdownLinkText` `markdownCode` `markdownBlockQuote` `markdownEmph` `markdownStrong` `markdownHorizontalRule` `markdownListItem` `markdownListEnumeration` `markdownImage` `markdownImageText` `markdownCodeBlock` | how the model's reply renders |
| `syntaxComment` `syntaxKeyword` `syntaxFunction` `syntaxVariable` `syntaxString` `syntaxNumber` `syntaxType` `syntaxOperator` `syntaxPunctuation` | code highlighting inside replies |
| `thinkingOpacity` | number `0..1` (default `0.6`) — how faded "thinking" text is |

---

## 5. TIER 2 — CHANGE SHAPE / LAYOUT / COPY (rebuild, ≈10 minutes)

Colours never need this. Use it for: bubble alignment/width/fg, hero text, chips, spacing,
column width, code-box style, labels, keybinds.

### 5.1 Get the source

```
git clone -q -b dev https://github.com/LuciaXCT/arena-code.git ~/arena-src
```

### 5.2 Grep-assert the 4 markers **before building** (rule 2)

All four must print `1` or more. If one prints `0`, that file rolled back — re-fetch it from
`dev` with `curl -sfL -o <file> https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/<path>`
and re-assert. **Never build until all four pass.**

```
grep -c 7B6DF6 ~/arena-src/packages/opencode/src/cli/cmd/tui/context/theme/arena-code.json
```
```
grep -c 'marginRight="auto"' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
```
```
grep -c 'Index each={blocks()}' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
```
```
grep -c resumed ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx
```

### 5.3 File map (everything under `packages/opencode/src/cli/cmd/tui/`)

| Path | Owns |
|---|---|
| `context/theme/arena-code.json` | the **baked-in default** palette (what you get with no custom theme) |
| `context/theme.tsx` | theme engine: `DEFAULT_THEMES`, `resolveTheme`, `getCustomThemes()` — do not rewrite, just read |
| `routes/home.tsx` | hero screen: title, sub-line, pills, 5 chips, `maxWidth`, **and the auto-continue effect** |
| `routes/session/index.tsx` | the chat: user bubble, model blocks, streaming, code boxes, file chips, timestamps, column width |
| `component/*.tsx` | editor, status bar, dialogs, tabs, message parts |
| `component/logo.tsx` | **DO NOT EDIT** |
| `~/.config/opencode/agent/*.md` | the 4 agents; frontmatter `color:` (quoted hex) is the agent's tint |

### 5.4 The current spec — preserve all of it

These are accepted by the human. Re-breaking any of them is a regression, not a restyle.

* Palette **z.ai noir**: canvas `#000000`, panel `#121214`, element `#1A1A1D`, line `#2E2E33`,
  ink `#FFFFFF`, muted `#9B9BA3`, dim `#6E6E76`, primary `#7B6DF6`, accent `#A8A0FF`,
  sage `#4ADE80`, sand `#F5C87A`, rose `#F87171`, lilac `#B9A5FF`.
* **User bubble**: aligned **left** (`marginRight="auto"`, never `marginLeft`), `width="70%"`,
  `bg={hover() ? theme.accent : theme.secondary}`, `fg={theme.background}`, muted `YOU` label above it.
* **Model side**: quiet `ARENA` label, indigo-edged code boxes, dark-on-light file chips,
  timestamp in `theme.diffContext`.
* **Streaming**: text parts render through `<Index each={blocks()}>` with `block()` accessors
  (a `<For>` here caused the visible glitch/flicker while the model streams — never revert it).
* **Layout**: full-width session column (padding 3), hero `maxWidth` 90, nothing cut at 180 cols.
* **Auto-continue**: on start, the TUI navigates into the newest session with
  `parentID === undefined` by `time.updated` (skipped when a prompt was passed on the CLI).
  Closing and reopening `opencode` must land back in the last conversation.
* Hero copy: **"What can I build for you?"** + *"Interact with Arena Code and explore the
  boundless creative world"*, pills `✦ Deep Think` / `Max`, 5 chips
  (Landing Page · Knowledge/Teaching Material · 3D Modeling · Mini Game · Personal Blog).
  Input placeholder stays **"How can I help you today?"**. Product name stays **Arena Code**.

### 5.5 Common edits (exact, minimal)

**A. Coloured bubble with white text** (indigo bubble, instead of white/black) —
in `routes/session/index.tsx`, inside the user-message box:

```tsx
bg={hover() ? theme.accent : theme.primary}
fg={theme.background}          // keep: bubble text = canvas colour (near-black on indigo)
```
For literally white text on a coloured bubble, use `fg="#FFFFFF"` **and** keep `bg` a dark
enough `primary` (≥ 4.5:1). One edit, one file, one turn.

**B. Bubble width / alignment** — same box: `width="70%"` (try `60%`–`80%`),
`marginRight="auto"` = left. Never set both margins to `auto`.

**C. Hero copy / chips** — `routes/home.tsx`: edit the strings only. Keep the `createEffect`
auto-continue block byte-for-byte.

**D. Column width / padding** — `routes/session/index.tsx`: the outer `<Box paddingX={3}>`
and any `maxWidth`. Full width is intentional; do not re-add a sidebar.

**E. Agent tints** — `~/.config/opencode/agent/*.md` frontmatter:
`color: "#7B6DF6"` (arena `#E07A5F`, brainstorm `#9EBFDF`, critic `#E0C4A2`, verifier `#8FB89A`
are the current values). **Quoted.** Unquoted hex = TUI won't boot.

**F. Baked default palette** — mirror your favourite preset into
`context/theme/arena-code.json` so a fresh install looks right before any custom theme exists.

### 5.6 Build recipe

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

Expected: a size near **153,4xx,xxx** bytes and `~/oc-new-bin --version` → `1.0.0-arena.1`.
bun must be **1.3.5**. `--ignore-scripts` on install, `--skip-install` on build.
Copy the binary out **immediately** (rule 6).

### 5.7 Install (human pastes these — one line each, `/exit` first)

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

Both must print the **same** size. `sudo` must stay interactive — never `sudo -n` in a script
with `set -e`; that is what killed an earlier installer on Kali.

---

## 6. VERIFICATION — MANDATORY BEFORE SHIPPING

Create `tools/pty-test.py` (tested, self-contained, stdlib only). It runs the binary in a real
PTY twice: **run A** types a prompt and waits for the model; **run B** *closes and reopens* and
checks that the last session came back, that **your theme's own colours** are on screen
(it reads the theme JSON and derives the expected ANSI triplets — nothing hard-coded),
that the reply really arrived, that there are no JS errors, and that the renderer paints
across the full terminal width.

```python
#!/usr/bin/env python3
"""pty-test.py — prove an Arena Code TUI build in a real terminal.
   python3 pty-test.py <binary> --theme <theme.json> [--marker TXT] [--cfg DIR]
                       [--cols 180] [--rows 40] [--work DIR] [--wait 70]"""
import fcntl, json, os, pty, re, select, struct, subprocess, sys, termios, time

ANSI = re.compile(rb"\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[=>]|\x1b.")
strip = lambda b: ANSI.sub(b"", b)
hx = lambda s: tuple(int(s.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))

def resolve(tj, key, mode="dark"):
    defs, th = tj.get("defs", {}), tj.get("theme", {})
    def go(v, d=0):
        if d > 8: return None
        if isinstance(v, dict): v = v.get(mode)
        if isinstance(v, str):
            if v.startswith("#"): return hx(v)
            if v in defs: return go(defs[v], d+1)
            if v in th: return go(th[v], d+1)
        return None
    return go(th.get(key))

def session(binary, cfg, work, cols, rows, send, settle, total):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    env = {**os.environ, "TERM": "xterm-256color", "COLUMNS": str(cols), "LINES": str(rows)}
    if cfg: env["XDG_CONFIG_HOME"] = cfg
    p = subprocess.Popen([binary], stdin=slave, stdout=slave, stderr=slave, cwd=work, env=env, close_fds=True)
    os.close(slave); raw = b""; t0 = time.time(); sent = False
    while time.time() - t0 < total:
        if not sent and send and time.time() - t0 > settle:
            os.write(master, send.encode()); sent = True
        r, _, _ = select.select([master], [], [], 0.25)
        if r:
            try: c = os.read(master, 65536)
            except OSError: break
            if not c: break
            raw += c
    try:
        os.write(master, b"\x1b"); time.sleep(0.4); os.write(master, b"/exit\r"); time.sleep(0.8)
    except OSError: pass
    p.terminate()
    try: p.wait(timeout=5)
    except subprocess.TimeoutExpired: p.kill()
    os.close(master); return raw

def main():
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    binary = a[0]
    get = lambda k, d=None: a[a.index(k)+1] if k in a else d
    marker = get("--marker", "ARENAPONG"); cfg = get("--cfg") or None
    cols = int(get("--cols", "180")); rows = int(get("--rows", "40"))
    work = get("--work") or "/tmp/ptywork"; wait = int(get("--wait", "70"))
    theme_path = get("--theme"); os.makedirs(work, exist_ok=True)
    print(f"binary={binary} size={os.path.getsize(binary)} marker={marker} cols={cols}x{rows}")

    rawA = session(binary, cfg, work, cols, rows, f"Reply with exactly: {marker}\r", 10, wait)
    txtA = strip(rawA).decode("utf8", "replace")
    answeredA = marker in txtA.replace(f"Reply with exactly: {marker}", "")   # strip our own echo

    rawB = session(binary, cfg, work, cols, rows, None, 14, 24)               # reopen, type nothing
    txtB = strip(rawB).decode("utf8", "replace")
    open("pty-capture.bin", "wb").write(rawB)

    res = [("reopen continues the last session", marker in txtB), ("model reply arrived", answeredA)]
    if theme_path and os.path.exists(theme_path):
        tj = json.load(open(theme_path))
        for key, label in (("background","canvas/background"), ("backgroundPanel","chat panel"),
                           ("text","main text"), ("textMuted","muted text"), ("secondary","user bubble bg")):
            rgb = resolve(tj, key)
            if not rgb: res.append((f"theme key {key} resolves", False)); continue
            n = rawB.count(f"48;2;{rgb[0]};{rgb[1]};{rgb[2]}".encode()) + rawB.count(f"38;2;{rgb[0]};{rgb[1]};{rgb[2]}".encode())
            res.append((f"{label} = #{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X} on screen (n={n})", n > 0))
        pr = resolve(tj, "primary")
        if pr:
            n = rawB.count(f"48;2;{pr[0]};{pr[1]};{pr[2]}".encode()) + rawB.count(f"38;2;{pr[0]};{pr[1]};{pr[2]}".encode())
            print(f"info  primary #{pr[0]:02X}{pr[1]:02X}{pr[2]:02X} n={n} (paints only on active borders/selection — 0 is normal)")
    else:
        print("info  no --theme given, palette checks skipped")

    errs = [s for s in ("ReferenceError","TypeError","is not defined","Cannot read prop",
                        "undefined is not","panic:","Something went wrong") if s in txtB]
    res.append((f"no JS/render errors {errs if errs else ''}", not errs))
    addr = [int(b) for a2, b in re.findall(rb"\x1b\[(\d+);(\d+)H", rawB)] + [int(c) for c in re.findall(rb"\x1b\[(\d+)G", rawB)]
    widest = max(addr) if addr else 0
    res.append((f"chat column spans full width (paints to column {widest} of {cols})", widest >= int(cols*0.7)))

    print("-"*66); bad = 0
    for name, ok in res:
        print(("PASS  " if ok else "FAIL  ") + name); bad += not ok
    print("-"*66)
    print(f"{'ALL PASS' if not bad else str(bad)+' FAILED'}   capture=pty-capture.bin ({os.path.getsize('pty-capture.bin')} bytes)")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
```

Run it (single line):

```
python3 ~/pty-test.py ~/oc-new-bin --theme ~/.config/opencode/themes/arena-emerald.json --marker ARENAPONG --wait 80
```

**Ship only on `ALL PASS`.** This is the exact result recorded for build 153417358:

```
PASS  reopen continues the last session      PASS  no JS/render errors
PASS  model reply arrived                    PASS  chat column spans full width (paints to column 178 of 180)
PASS  canvas/background = #000000 (n=119)    PASS  chat panel = #121214 (n=125)
PASS  main text = #FFFFFF (n=258)            PASS  muted text = #9B9BA3 (n=64)
PASS  user bubble bg = #FFFFFF (n=258)       →  ALL PASS
```

and for the **runtime palette swap** (Tier 1, emerald, no rebuild):

```
PASS reopen continues last session · PASS reply · PASS canvas #04100C (n=93) · PASS panel #0A1A14 (n=126)
PASS text #EAFFF6 (n=21) · PASS muted #8FBFA9 (n=45) · PASS bubble #DFFFF2 (n=28) · PASS no errors  → ALL PASS
```

Notes on the harness (do not "improve" these away):
* `primary` legitimately shows `n=0` in run B — it only paints on focused borders/selection.
* Never assert layout by measuring stripped-text line length: the renderer writes with cursor
  addressing, so one "line" can be 7000 chars. Use the **max addressed column** instead.
* Free-tier models can be slow: `--wait 80`. A `FAIL model reply arrived` with everything else
  passing is a rate limit, not your build — re-run once before investigating.

---

## 7. SHIP (only after `ALL PASS`)

1. **Package**: `arena-code-1.0.0-arena.1/` = `bin/opencode`, `agent/` (4 files),
   `command/` (4), `opencode.jsonc`, `install.sh`, `README.md`. Then zip it:
   `rm -f arena-code-1.0.0-arena.1-linux-x64.zip && zip -qr arena-code-1.0.0-arena.1-linux-x64.zip arena-code-1.0.0-arena.1`
   — assert the zip is **50–60 MB** (`stat -c%s`). A 7 KB zip means the tree was mangled: abort.
2. **GitHub releases (both)**: list assets → **DELETE every old asset id first** (a re-upload with
   the same name 422s) → POST the new zip as `arena-code-1.0.0-arena.1-linux-x64.zip`.
   `LuciaXCT/arena-code` release **395208634** (token `GH_TOKEN_LUCIA`),
   `k1ruuuu/arena-cli` release **395165172** (token `GH_TOKEN_K1`). Releases target branch **`dev`**.
   The GitHub CDN can serve the previous asset for a minute — re-check the size later.
   The private repo's `releases/download/…` URL 404s even with a token; use
   `GET /releases/assets/<id>` with `Accept: application/octet-stream` there.
3. **VPS**: `scp` the binary to a **unique** remote name (`/tmp/opencode` is a directory there),
   then install to `/usr/local/bin/opencode` and `~/.local/bin/opencode`, copy the zip to `~`,
   and print both `stat -c%s`. Remote sudo needs `echo "$VPS_PASS" | sudo -S … 2>/dev/null`.
4. **git**: commit to `dev` on **both** remotes (`git push origin HEAD:refs/heads/dev`).
   Never `main`, never force-push. If the sandbox lost `.git`, clone `dev` to `/tmp`, `cp -a`
   your changed files in (`rsync` is often missing), commit, push. Set `user.name`/`user.email` first.
5. Push `tools/palette.py` and `tools/pty-test.py` to `dev` too, so the human can curl them.

---

## 8. WHAT YOU MUST REPORT (short — the human reads only this)

Think hard, then answer in exactly this shape:

1. **Palette applied**: name + the 6 headline hexes (canvas, panel, ink, muted, primary, bubble).
2. **Proof table**: the `pty-test.py` PASS/FAIL lines, verbatim, plus the new build size
   (or "no rebuild needed" for Tier 1).
3. **What changed in code**: file → one-line description (or "config only").
4. **Preserved**: confirm the 4 markers from §5.2 still grep `≥1`, the bubble is left-aligned,
   auto-continue works, streaming uses `<Index>`, column is full width.
5. **Human's steps**: at most 4 single-line commands (one per paste) + "`/exit`, then `opencode`".
6. **Explanation**: 3–6 sentences on *why* it looks the way it does now (contrast ratios,
   the background ladder, what each colour is doing). The human asked you to think harder and
   explain the result — do it.
7. **Shipped where**: GitHub release ids + asset size, VPS `stat` sizes, git commit sha on `dev`.

No logs. No multi-line paste blocks. No secrets in any file, commit, or message.

---

## 9. TROUBLESHOOTING

| Symptom | Cause → fix |
|---|---|
| TUI won't start after a theme edit | `Color reference "x" not found` — typo in a `defs`/theme ref name. Also: unquoted `color:` in an `agent/*.md`. |
| Colours didn't change at all | You edited the **built-in** JSON but a custom theme of the same name in `~/.config/opencode/themes/` overrides it — or `"theme"` in `opencode.jsonc` still points elsewhere. Check `grep theme ~/.config/opencode/opencode.jsonc`. |
| Colours changed but bubble is still white | Bubble bg = `secondary`. Set `inkBubble`/`secondary`, not `primary`. |
| Palette reverted after a rebuild | Your sandbox restored an older `arena-code.json` (rule 2). Grep `7B6DF6`, re-fetch from `dev`, rebuild. |
| `ReferenceError: createSignal is not defined` | Two edits to one file raced (rule 1). Restore the file from `dev`, redo as a single scripted rewrite with `assert count == 1`. |
| Messages flicker / tear while streaming | Someone replaced `<Index each={blocks()}>` with `<For>`. Put `<Index>` + `block()` accessors back. |
| Reopening shows an empty home screen | The auto-continue `createEffect` in `routes/home.tsx` is gone. Restore it from `dev`. |
| `stat -c%s` prints a different size on the two paths | One install didn't happen (usually a silent `sudo -n` failure). Re-run the `sudo install` line interactively. |
| New binary seems ignored | The old process was still running. `/exit`, then start `opencode` again. |
| `unable to create text based on template` on shell start | That is **oh-my-posh**, not Arena Code (`oh-my-posh upgrade`). Do not touch the binary for it. |
| Zip is a few KB | The package tree was empty/mangled when zipped. Rebuild the tree, re-check `bin/opencode` size > 150 MB, re-zip. |
