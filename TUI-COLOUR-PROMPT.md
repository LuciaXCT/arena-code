# ARENA CODE — TUI COLOUR & LOOK · COMPLETE AGENT PROMPT (v4 ZERO-ERROR)

**How to use:** paste everything below the `=====` line into your AI agent (Ct002).
It is self-contained: tells the agent what to change, where the code lives, how to
build, how to *prove* the result in a real terminal, and how to ship it. Nothing else needed.

Proven on build **153417358** (`opencode --version` → `1.0.0-arena.1`), Kali WSL + Linux x64.
v4 adds auto-validation, custom overrides, graceful FAIL messages, no multi-line paste.

=====================================================================

## 0. MISSION

You are restyling the **Arena Code** TUI (a build of OpenCode). The human wants to change
the **colours** and "so on" — i.e. the whole look: palette, bubbles, layout, spacing,
labels, hero screen. You must:

1. Ship a **new palette** the human can switch in seconds, **without rebuilding** (Tier 1).
2. Keep every look-and-feel fix already in the product, and be able to change the
   **shape/layout/copy** too, by rebuilding (Tier 2).
3. **Prove** it in a real PTY terminal with exact ANSI colour evidence — not by eye.
4. Ship it to the two places the human uses: the **GitHub release** and the **VPS**.
5. **ZERO ERRORS** — every tool must self-validate, auto-create missing dirs, and print
   clear OK/WARN/FAIL. Never crash on missing file.

Work silently. Do not paste giant logs at the human. Report the short table in §8.

---

## 1. MACHINE FACTS (do not re-discover these)

| Thing | Value |
|---|---|
| Human's machine | Kali Linux **WSL**, home `/home/nijam`, PATH prefers `/usr/local/bin` |
| Binary (2 copies, both must match) | `~/.local/bin/opencode` **and** `/usr/local/bin/opencode` |
| Current good build size | **153417358** bytes — verify with `stat -c%s` |
| Zip size | **51840090** bytes (50–60 MB) — `stat -c%s *.zip` |
| Source (public, full tree) | `https://github.com/LuciaXCT/arena-code` branch **`dev`** |
| Public no-token download | `https://github.com/LuciaXCT/arena-code/releases/download/v1.0.0-arena.1/arena-code-1.0.0-arena.1-linux-x64.zip` |
| Release ids | `LuciaXCT/arena-code` → **395208634**; `k1ruuuu/arena-cli` (private) → **395165172** |
| VPS | host/user/port/password: **ask the human** (never print, never commit them) |
| Config dir | `~/.config/opencode/` (`opencode.jsonc`, `agent/`, `command/`, `themes/`) — honours `$XDG_CONFIG_HOME` |
| Model in use | `opencode/big-pickle` (free tier) + `9router` provider on `http://localhost:20128/v1` |
| Agents (exactly 4, never add/remove) | `arena` `brainstorm` `critic` `verifier` |
| Command palette | **Ctrl+P** · theme picker: **Ctrl+X then T** (`<leader>t`) · new session: `<leader>n` |
| WSL rule | Run `opencode` directly, **without tmux**. If you see `alwaysSeparate is not defined`, you are in a tmux wrapper — exit tmux and run `opencode` directly. |

Secrets you need from the human (5 values): `GH_TOKEN_LUCIA`, `GH_TOKEN_K1`,
`VPS_HOST`, `VPS_USER`, `VPS_PASS`. Ask once, keep them out of every file and every log.

---

## 2. THE 8 RULES THAT PREVENT 90% OF THE FAILURES (ZERO-ERROR)

These were all learned the hard way. Breaking any one has already broken a release.

1. **One edit per file per turn.** Never issue two edits to the same file in the same
   response — they race and silently clobber each other. If a file needs several changes,
   rewrite it with a script that asserts each replacement happened exactly once:
   `assert s.count(old) == 1`.

2. **Source trees roll back.** Sandboxes/snapshots silently restore older copies of files.
   **Before every build**, grep-assert the 4 markers (§5.2). If any is missing, re-fetch that
   file from `dev` and re-assert. **Never build until all four pass.**

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

7. **Self-validate everything.** Every script must check its inputs, auto-create missing
   dirs, and print clear OK/WARN/FAIL — never crash with a Python traceback on missing file.
   If a binary is <10 MB, FAIL fast with "too small, probably broken download".

8. **No secrets in files.** Never write GH tokens or VPS passwords into any file that gets
   pushed to the public repo. Use `${VAR}` placeholders in scripts, ask human for values at runtime.

Also: never touch `logo.tsx`, never reword the welcome banner (human tuned it),
never push to `main` (always `dev`), never ship `MODELS_DEV_API_JSON={}`,
and an agent's `color:` in its markdown **must be a quoted hex** (`"#7B6DF6"`) or the TUI won't boot.

---

## 3. TIER 1 — CHANGE THE COLOURS **WITHOUT REBUILDING** (≈2 minutes) ← do this first

### 3.1 Why this works (no rebuild needed)

OpenCode reads **custom theme JSON at runtime** and merges it over built-in themes
(`getCustomThemes()` in `src/cli/cmd/tui/context/theme.tsx`, glob `themes/*.json`):

* global: `~/.config/opencode/themes/<name>.json` (honours `$XDG_CONFIG_HOME`)
* per-project: `<project>/.opencode/themes/<name>.json` (or `.arena/themes/` when `ARENA=1`)

A file named `arena-emerald.json` becomes theme named `arena-emerald`. A custom theme
**overrides a built-in theme of the same name** — so you can overwrite `arena-code`.
Active theme = `"theme"` in `opencode.jsonc` (or picker: Ctrl+X → T).

**Nothing in the TUI hard-codes a hex colour** (verified: zero `#RRGGBB` in `routes/` and
`component/`). Every colour on screen comes from these keys → a JSON file is a complete repaint.

### 3.2 Create `tools/palette.py` — ZERO-ERROR v4

Write this file exactly (tested, self-validating, stdlib only). It builds a full 51-key theme
from 15 hex values, writes it to config dir, and patches `"theme"` in `opencode.jsonc`
**without destroying JSONC comments** (regex, never `json.load`).

```python
#!/usr/bin/env python3
"""
palette.py — Arena Code / OpenCode TUI palette switcher — ZERO-ERROR v4

What it does:
  • Builds a full 51-key OpenCode theme JSON from 15 hex values
  • Writes it to ~/.config/opencode/themes/arena-<name>.json (auto-creates dirs)
  • Patches "theme": "arena-<name>" in opencode.jsonc WITHOUT destroying JSONC comments
  • Self-validates: reloads the JSON, resolves defs, checks essential keys
  • Never needs a rebuild — OpenCode loads themes at runtime

Why zero-error:
  • Auto-finds config dir (XDG_CONFIG_HOME or ~/.config/opencode)
  • Creates missing dirs/files instead of crashing
  • Validates every hex before writing
  • Handles both opencode.jsonc and opencode.json
  • Prints clear OK/FAIL and the exact ANSI triplet to expect on screen

Usage (ONE LINE PER PASTE — no multi-line blocks):
  python3 ~/palette.py --list
  ARENA_PALETTE=emerald python3 ~/palette.py
  python3 ~/palette.py --check
  python3 ~/palette.py --restore

Custom colours without editing the file:
  ARENA_CANVAS=#0A0A0A ARENA_PRIMARY=#FF5A5A ARENA_PALETTE=noir python3 ~/palette.py --custom
Or:
  python3 ~/palette.py --canvas #0A0A0A --primary #FF5A5A --name my-dark

Then inside opencode: /exit  and run:  opencode
"""
import json
import os
import pathlib
import re
import sys
import argparse

PRESETS = {
    "noir": dict(canvas="#000000", panel="#121214", element="#1A1A1D", line="#2E2E33",
                 lineSoft="#232328", ink="#FFFFFF", mut="#9B9BA3", dim="#6E6E76",
                 primary="#7B6DF6", accent="#A8A0FF", ok="#4ADE80", warn="#F5C87A",
                 err="#F87171", lil="#B9A5FF", inkBubble="#FFFFFF",
                 surface="#0A0A0B", addBg="#0D1F14", delBg="#241010", fn="#EDEDF2"),
    "emerald": dict(canvas="#04100C", panel="#0A1A14", element="#10241C", line="#1D3A2E",
                    lineSoft="#16301F", ink="#EAFFF6", mut="#8FBFA9", dim="#5F8C79",
                    primary="#34D399", accent="#6EE7B7", ok="#4ADE80", warn="#F5C87A",
                    err="#FB7185", lil="#A7F3D0", inkBubble="#DFFFF2",
                    surface="#071510", addBg="#0B2A1C", delBg="#2A1214", fn="#E8FFF6"),
    "amber": dict(canvas="#100B04", panel="#1A1309", element="#241B0E", line="#3A2C16",
                  lineSoft="#2E2311", ink="#FFF6E6", mut="#BFA98F", dim="#8C7A5F",
                  primary="#F59E0B", accent="#FCD34D", ok="#4ADE80", warn="#FBBF24",
                  err="#FB7185", lil="#FDE68A", inkBubble="#FFF3DC",
                  surface="#150E06", addBg="#16240E", delBg="#2A1410", fn="#FFF8EA"),
    "rose": dict(canvas="#100409", panel="#1A0912", element="#240E19", line="#3A1628",
                 lineSoft="#2E1120", ink="#FFEAF2", mut="#BF8FA6", dim="#8C5F76",
                 primary="#FB7185", accent="#FDA4AF", ok="#4ADE80", warn="#F5C87A",
                 err="#F43F5E", lil="#FBCFE8", inkBubble="#FFE3EC",
                 surface="#15060C", addBg="#0E2416", delBg="#2A1018", fn="#FFF0F5"),
    "ice": dict(canvas="#04080F", panel="#0A1220", element="#0F1A2C", line="#1B2A42",
                lineSoft="#152238", ink="#EAF2FF", mut="#8FA9BF", dim="#5F768C",
                primary="#38BDF8", accent="#7DD3FC", ok="#4ADE80", warn="#F5C87A",
                err="#FB7185", lil="#BAE6FD", inkBubble="#E3F2FF",
                surface="#060B14", addBg="#0B2A1C", delBg="#2A1410", fn="#EAF4FF"),
}

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
ESSENTIAL_KEYS = ["primary", "secondary", "background", "backgroundPanel", "text", "textMuted", "border"]

def die(msg, code=1):
    print(f"FAIL  {msg}", file=sys.stderr)
    sys.exit(code)

def ok(msg):
    print(f"OK  {msg}")

def validate_hex(name, val):
    if not isinstance(val, str) or not HEX_RE.match(val.strip()):
        die(f"invalid hex for {name}: '{val}' — must be #RRGGBB")
    return val.strip()

def get_config_dir():
    xdg = os.environ.get("XDG_CONFIG_HOME", "").strip()
    if xdg:
        base = pathlib.Path(xdg).expanduser()
        if base.is_file():
            base = pathlib.Path.home() / ".config"
    else:
        base = pathlib.Path.home() / ".config"
    cfg = base / "opencode"
    try:
        cfg.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        die(f"cannot create config dir {cfg}: {e}")
    return cfg

def build_theme(p):
    for k, v in p.items():
        validate_hex(k, v)
    V = lambda d, l=None: {"dark": d, "light": l or d}
    return {
        "$schema": "https://opencode.ai/theme.json",
        "defs": {k: v for k, v in p.items()},
        "theme": {
            "primary": V(p["primary"]), "secondary": V(p["inkBubble"]), "accent": V(p["accent"]),
            "error": V(p["err"]), "warning": V(p["warn"]), "success": V(p["ok"]), "info": V(p["accent"]),
            "text": V(p["ink"]), "textMuted": V(p["mut"]),
            "background": V(p["canvas"]), "backgroundPanel": V(p["panel"]),
            "backgroundElement": V(p["element"]),
            "border": V(p["line"]), "borderActive": V(p["primary"]), "borderSubtle": V(p["lineSoft"]),
            "diffAdded": V(p["ok"]), "diffRemoved": V(p["err"]), "diffContext": V(p["dim"]),
            "diffHunkHeader": V(p["mut"]), "diffHighlightAdded": V(p["ok"]),
            "diffHighlightRemoved": V(p["err"]), "diffAddedBg": V(p["addBg"]),
            "diffRemovedBg": V(p["delBg"]), "diffContextBg": V(p["surface"]),
            "diffLineNumber": V(p["dim"]), "diffAddedLineNumberBg": V(p["addBg"]),
            "diffRemovedLineNumberBg": V(p["delBg"]),
            "markdownText": V(p["ink"]), "markdownHeading": V(p["ink"]),
            "markdownLink": V(p["accent"]), "markdownLinkText": V(p["accent"]),
            "markdownCode": V(p["accent"]), "markdownBlockQuote": V(p["mut"]),
            "markdownEmph": V(p["lil"]), "markdownStrong": V(p["ink"]),
            "markdownHorizontalRule": V(p["line"]), "markdownListItem": V(p["accent"]),
            "markdownListEnumeration": V(p["primary"]), "markdownImage": V(p["accent"]),
            "markdownImageText": V(p["mut"]), "markdownCodeBlock": V(p["ink"]),
            "syntaxComment": V(p["dim"]), "syntaxKeyword": V(p["accent"]),
            "syntaxFunction": V(p["fn"]), "syntaxVariable": V(p["ink"]),
            "syntaxString": V(p["ok"]), "syntaxNumber": V(p["warn"]),
            "syntaxType": V(p["lil"]), "syntaxOperator": V(p["mut"]),
            "syntaxPunctuation": V(p["mut"]),
            "thinkingOpacity": 0.6,
        },
    }

def patch_config(theme_name, cfgdir):
    candidates = [cfgdir / "opencode.jsonc", cfgdir / "opencode.json"]
    f = None
    for c in candidates:
        if c.exists() and c.is_file():
            f = c
            break
    if f is None:
        f = candidates[0]
    try:
        txt = f.read_text(encoding="utf-8") if f.exists() else "{\n}\n"
    except Exception as e:
        die(f"cannot read {f}: {e}")
    if not txt.strip():
        txt = "{\n}\n"
    if not re.search(r"^\s*\{", txt):
        txt = "{\n" + txt + "\n}\n"
    if re.search(r'"theme"\s*:', txt):
        txt = re.sub(r'"theme"\s*:\s*"[^"]*"', f'"theme": "{theme_name}"', txt, count=1)
    else:
        txt = re.sub(r"^(\s*\{)", rf'\1\n  "theme": "{theme_name}",', txt, count=1, flags=re.MULTILINE)
    try:
        f.write_text(txt, encoding="utf-8")
    except Exception as e:
        die(f"cannot write {f}: {e}")
    return f

def self_check(theme_path):
    try:
        data = json.loads(theme_path.read_text(encoding="utf-8"))
    except Exception as e:
        die(f"written theme {theme_path} is not valid JSON: {e}")
    if "theme" not in data or "defs" not in data:
        die(f"theme {theme_path} missing 'theme' or 'defs'")
    missing = [k for k in ESSENTIAL_KEYS if k not in data["theme"]]
    if missing:
        die(f"theme {theme_path} missing essential keys: {missing}")
    return data

def main():
    parser = argparse.ArgumentParser(description="Arena Code TUI palette switcher (zero-error)")
    parser.add_argument("--list", action="store_true", help="list presets")
    parser.add_argument("--check", action="store_true", help="check current theme files")
    parser.add_argument("--restore", action="store_true", help="restore to noir")
    parser.add_argument("--custom", action="store_true", help="use env ARENA_* overrides on top of selected preset")
    parser.add_argument("--name", help="custom theme name (default arena-<preset>)")
    parser.add_argument("--canvas", help="#RRGGBB override")
    parser.add_argument("--panel", help="#RRGGBB override")
    parser.add_argument("--primary", help="#RRGGBB override")
    parser.add_argument("--accent", help="#RRGGBB override")
    parser.add_argument("--bubble", help="#RRGGBB user bubble")
    args = parser.parse_args()

    cfgdir = get_config_dir()
    themes_dir = cfgdir / "themes"
    try:
        themes_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        die(f"cannot create {themes_dir}: {e}")

    if args.list:
        for k, v in PRESETS.items():
            print(f"{k:9} canvas={v['canvas']} primary={v['primary']} accent={v['accent']} bubble={v['inkBubble']}")
        print(f"\nconfig dir: {cfgdir}")
        print(f"themes dir: {themes_dir}")
        return

    if args.check:
        print(f"config dir: {cfgdir} exists={cfgdir.exists()}")
        print(f"themes dir: {themes_dir} exists={themes_dir.exists()}")
        if themes_dir.exists():
            for f in sorted(themes_dir.glob("*.json")):
                try:
                    sz = f.stat().st_size
                    data = json.loads(f.read_text())
                    keys = len(data.get("theme", {}))
                    print(f"  {f.name:30} {sz:6}B  {keys} keys  OK")
                except Exception as e:
                    print(f"  {f.name:30} FAIL {e}")
        cfg_file = cfgdir / "opencode.jsonc"
        if not cfg_file.exists():
            cfg_file = cfgdir / "opencode.json"
        if cfg_file.exists():
            txt = cfg_file.read_text()
            m = re.search(r'"theme"\s*:\s*"([^"]+)"', txt)
            print(f"active theme in {cfg_file.name}: {m.group(1) if m else 'NOT SET'}")
        else:
            print(f"no config file yet at {cfgdir}")
        return

    preset_name = "noir" if args.restore else (os.environ.get("ARENA_PALETTE", "noir").strip().lower() or "noir")
    if preset_name not in PRESETS:
        die(f"unknown palette '{preset_name}'. options: {', '.join(PRESETS.keys())} — try --list")

    base = dict(PRESETS[preset_name])
    overrides = {}
    if args.canvas: overrides["canvas"] = args.canvas
    if args.panel: overrides["panel"] = args.panel
    if args.primary: overrides["primary"] = args.primary
    if args.accent: overrides["accent"] = args.accent
    if args.bubble: overrides["inkBubble"] = args.bubble

    env_map = {
        "ARENA_CANVAS": "canvas", "ARENA_PANEL": "panel", "ARENA_ELEMENT": "element",
        "ARENA_LINE": "line", "ARENA_INK": "ink", "ARENA_MUTED": "mut", "ARENA_DIM": "dim",
        "ARENA_PRIMARY": "primary", "ARENA_ACCENT": "accent", "ARENA_BUBBLE": "inkBubble",
        "ARENA_OK": "ok", "ARENA_WARN": "warn", "ARENA_ERR": "err",
    }
    if args.custom or any(k in os.environ for k in env_map):
        for env_k, preset_k in env_map.items():
            if env_k in os.environ and os.environ[env_k].strip():
                overrides[preset_k] = os.environ[env_k].strip()

    for k, v in overrides.items():
        if k in base:
            base[k] = v

    for k, v in base.items():
        if not HEX_RE.match(v):
            die(f"after overrides, {k}='{v}' is not #RRGGBB")

    theme_name = args.name.strip() if args.name else f"arena-{preset_name}"
    theme_name = re.sub(r"[^a-zA-Z0-9._-]", "-", theme_name)
    if not theme_name:
        theme_name = f"arena-{preset_name}"

    out_path = themes_dir / f"{theme_name}.json"
    theme_data = build_theme(base)
    try:
        out_path.write_text(json.dumps(theme_data, indent=2) + "\n", encoding="utf-8")
    except Exception as e:
        die(f"cannot write theme {out_path}: {e}")

    self_check(out_path)
    cfg_file = patch_config(theme_name, cfgdir)

    try:
        r = int(base["primary"][1:3], 16); g = int(base["primary"][3:5], 16); b = int(base["primary"][5:7], 16)
    except Exception:
        r, g, b = 123, 111, 246

    ok(f"theme '{theme_name}' -> {out_path} ({out_path.stat().st_size}B)")
    ok(f"config {cfg_file} (\"theme\": \"{theme_name}\")")
    print(f"OK  preset {preset_name} canvas={base['canvas']} panel={base['panel']} ink={base['ink']} primary={base['primary']} bubble={base['inkBubble']}")
    print(f"PROOF  expect ANSI 48;2;{r};{g};{b} (primary) and 48;2;{int(base['canvas'][1:3],16)};{int(base['canvas'][3:5],16)};{int(base['canvas'][5:7],16)} (canvas) after restart")
    print(f"NEXT  1) /exit inside opencode  2) opencode")

    for bp in [pathlib.Path.home() / ".local/bin/opencode", pathlib.Path("/usr/local/bin/opencode")]:
        if not bp.exists():
            print(f"WARN  binary not found at {bp} — will be installed on next ship")
        else:
            try:
                sz = bp.stat().st_size
                if sz < 10_000_000:
                    print(f"WARN  binary at {bp} looks too small ({sz}B) — may be broken")
            except Exception:
                pass

if __name__ == "__main__":
    main()
```

The human can also fetch it in one line (once you have pushed it to `dev`):

```
curl -sfL -o ~/palette.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/palette.py
```

### 3.3 Apply a palette (single lines, one per paste — ZERO-ERROR)

List what's available:

```
python3 ~/palette.py --list
```

Check what's active right now:

```
python3 ~/palette.py --check
```

Apply emerald (or noir/amber/rose/ice):

```
ARENA_PALETTE=emerald python3 ~/palette.py
```

Custom colours without editing file — example dark with red brand:

```
python3 ~/palette.py --canvas #0A0A0A --primary #FF5A5A --name my-red --panel #111111
```

Or via env:

```
ARENA_CANVAS=#0A0A0A ARENA_PRIMARY=#FF5A5A ARENA_PALETTE=noir python3 ~/palette.py --custom --name my-red
```

Then, inside opencode: `/exit` — and start it again:

```
opencode
```

If it still shows old colours: `python3 ~/palette.py --check` and verify `grep theme ~/.config/opencode/opencode.jsonc`

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

### 5.6 Build recipe (single lines, zero-error)

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

## 6. VERIFICATION — MANDATORY BEFORE SHIPPING — ZERO-ERROR v4

Create `tools/pty-test.py` (tested, self-contained, stdlib only). It runs the binary in a real
PTY twice: **run A** types a prompt and waits for the model; **run B** *closes and reopens* and
checks that the last session came back, that **your theme's own colours** are on screen
(it reads the theme JSON and derives the expected ANSI triplets — nothing hard-coded),
that the reply really arrived, that there are no JS errors, and that the renderer paints
across the full terminal width. Now with binary size check and graceful FAIL.

```python
#!/usr/bin/env python3
"""
pty-test.py — ZERO-ERROR v4 — prove Arena Code TUI in a real PTY

What it does:
  Run A: opens binary in PTY, types "Reply with exactly: <MARKER>", waits for model
  Run B: closes, reopens same workdir, types NOTHING, checks:
    1 resume   last session is on screen (auto-continue)
    2 palette  exact ANSI triplets from YOUR theme JSON are on screen (no hard-code)
    3 reply    model answered (sent text stripped)
    4 clean    no JS errors
    5 layout   full-width paint (max cursor column >= 70% of cols)

Zero-error improvements:
  • Checks binary exists, size >10MB, executable before starting
  • Checks theme JSON exists and is valid before using it
  • Creates workdir if missing
  • Handles PTY errors gracefully with clear FAIL messages
  • Strips own echo before matching reply
  • Uses max cursor-addressed column, not raw line length (which is 7000+ due to TUI rendering)
  • Primary n=0 is INFO, not FAIL (paints only on active borders)

Usage (single lines):
  python3 ~/pty-test.py ~/oc-new-bin --theme ~/.config/opencode/themes/arena-noir.json --marker ARENAPONG --wait 80
  python3 ~/pty-test.py /usr/local/bin/opencode --theme ~/.config/opencode/themes/arena-emerald.json

Exit 0 = ALL PASS, 1 = FAILED
Writes pty-capture.bin (run B raw) for debugging
"""
import fcntl
import json
import os
import pathlib
import pty
import re
import select
import struct
import subprocess
import sys
import termios
import time

ANSI_RE = re.compile(rb"\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[=>]|\x1b.")
strip_ansi = lambda b: ANSI_RE.sub(b"", b)

def die(msg):
    print(f"FAIL  {msg}", file=sys.stderr)
    sys.exit(2)

def hx(s):
    s = s.lstrip("#")
    try:
        return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return None

def resolve_theme(theme_json, key, mode="dark"):
    defs = theme_json.get("defs", {})
    th = theme_json.get("theme", {})
    def go(v, depth=0):
        if depth > 10:
            return None
        if isinstance(v, dict):
            v = v.get(mode) or v.get("dark") or v.get("light")
        if isinstance(v, str):
            if v.startswith("#"):
                return hx(v)
            if v in defs:
                return go(defs[v], depth+1)
            if v in th:
                return go(th[v], depth+1)
        return None
    return go(th.get(key))

def check_binary(path):
    p = pathlib.Path(path).expanduser()
    if not p.exists():
        die(f"binary not found: {p}")
    if not p.is_file():
        die(f"not a file: {p}")
    try:
        sz = p.stat().st_size
    except Exception as e:
        die(f"cannot stat {p}: {e}")
    if sz < 10_000_000:
        die(f"binary too small ({sz}B) at {p} — expected >10MB, probably broken download")
    if not os.access(p, os.X_OK):
        print(f"WARN  {p} not executable — trying chmod +x")
        try:
            p.chmod(0o755)
        except Exception as e:
            die(f"cannot chmod +x {p}: {e}")
    return p, sz

def check_theme(path):
    if not path:
        return None
    p = pathlib.Path(path).expanduser()
    if not p.exists():
        print(f"WARN  theme not found: {p} — palette checks will be skipped")
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"WARN  theme {p} invalid JSON: {e} — palette checks skipped")
        return None
    if "theme" not in data:
        print(f"WARN  theme {p} missing 'theme' key — palette checks skipped")
        return None
    return data, p

def session(binary, cfg_dir, work_dir, cols, rows, send_text, settle, total):
    pathlib.Path(work_dir).mkdir(parents=True, exist_ok=True)
    try:
        master, slave = pty.openpty()
    except Exception as e:
        die(f"pty.openpty failed: {e}")
    try:
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    except Exception as e:
        print(f"WARN  TIOCSWINSZ failed: {e}")
    env = {**os.environ, "TERM": "xterm-256color", "COLUMNS": str(cols), "LINES": str(rows)}
    if cfg_dir:
        env["XDG_CONFIG_HOME"] = str(cfg_dir)
    try:
        proc = subprocess.Popen([str(binary)], stdin=slave, stdout=slave, stderr=slave,
                                cwd=str(work_dir), env=env, close_fds=True)
    except Exception as e:
        die(f"cannot start {binary}: {e}")
    os.close(slave)
    raw = b""
    t0 = time.time()
    sent = False
    while time.time() - t0 < total:
        if not sent and send_text and time.time() - t0 > settle:
            try:
                os.write(master, send_text.encode("utf-8", "replace"))
                sent = True
            except OSError:
                break
        r, _, _ = select.select([master], [], [], 0.25)
        if r:
            try:
                chunk = os.read(master, 65536)
            except OSError:
                break
            if not chunk:
                break
            raw += chunk
    try:
        os.write(master, b"\x1b")
        time.sleep(0.35)
        os.write(master, b"/exit\r")
        time.sleep(0.9)
    except OSError:
        pass
    try:
        proc.terminate()
        proc.wait(timeout=4)
    except subprocess.TimeoutExpired:
        try:
            proc.kill()
        except Exception:
            pass
    try:
        os.close(master)
    except Exception:
        pass
    return raw

def main():
    args = sys.argv[1:]
    if not args or "--help" in args or "-h" in args:
        print(__doc__)
        sys.exit(0)
    binary = args[0]
    def get(k, d=None):
        return args[args.index(k)+1] if k in args and args.index(k)+1 < len(args) else d
    marker = get("--marker", "ARENAPONG")
    cfg = get("--cfg")
    cols = int(get("--cols", "180"))
    rows = int(get("--rows", "40"))
    work = get("--work", "/tmp/ptywork")
    wait = int(get("--wait", "70"))
    theme_path = get("--theme")
    bin_path, bin_size = check_binary(binary)
    theme_data = None
    theme_file = None
    if theme_path:
        res = check_theme(theme_path)
        if res:
            theme_data, theme_file = res
    print(f"binary={bin_path} size={bin_size} marker={marker} cols={cols}x{rows} work={work}")
    if theme_file:
        print(f"theme={theme_file}")
    print(f"RUN A: typing 'Reply with exactly: {marker}' and waiting {wait}s for model...")
    rawA = session(bin_path, cfg, work, cols, rows, f"Reply with exactly: {marker}\r", 10, wait)
    txtA = strip_ansi(rawA).decode("utf-8", "replace")
    txtA_no_echo = txtA.replace(f"Reply with exactly: {marker}", "")
    answeredA = marker in txtA_no_echo
    print(f"RUN B: reopening (no typing) to check auto-continue...")
    rawB = session(bin_path, cfg, work, cols, rows, None, 12, 24)
    txtB = strip_ansi(rawB).decode("utf-8", "replace")
    cap_path = pathlib.Path("pty-capture.bin")
    try:
        cap_path.write_bytes(rawB)
    except Exception as e:
        print(f"WARN  cannot write {cap_path}: {e}")
        cap_path = pathlib.Path("/tmp/pty-capture.bin")
        cap_path.write_bytes(rawB)
    results = []
    results.append(("reopen continues the last session", marker in txtB))
    results.append(("model reply arrived", answeredA))
    if theme_data:
        for key, label in (("background", "canvas/background"),
                           ("backgroundPanel", "chat panel"),
                           ("text", "main text"),
                           ("textMuted", "muted text"),
                           ("secondary", "user bubble bg")):
            rgb = resolve_theme(theme_data, key)
            if not rgb:
                results.append((f"theme key {key} resolves", False))
                continue
            r, g, b = rgb
            pat_bg = f"48;2;{r};{g};{b}".encode()
            pat_fg = f"38;2;{r};{g};{b}".encode()
            n = rawB.count(pat_bg) + rawB.count(pat_fg)
            results.append((f"{label} = #{r:02X}{g:02X}{b:02X} on screen (n={n})", n > 0))
        pr = resolve_theme(theme_data, "primary")
        if pr:
            r, g, b = pr
            n = rawB.count(f"48;2;{r};{g};{b}".encode()) + rawB.count(f"38;2;{r};{g};{b}".encode())
            print(f"info  primary #{r:02X}{g:02X}{b:02X} n={n} (paints only on active borders/selection — 0 is normal)")
    bad_strings = ["ReferenceError", "TypeError", "is not defined", "Cannot read prop",
                   "undefined is not", "panic:", "Something went wrong", "Color reference"]
    found_errs = [s for s in bad_strings if s in txtB]
    results.append((f"no JS/render errors {found_errs if found_errs else ''}", not found_errs))
    cols_addr = [int(b) for a, b in re.findall(rb"\x1b\[(\d+);(\d+)H", rawB)]
    cols_addr += [int(c) for c in re.findall(rb"\x1b\[(\d+)G", rawB)]
    widest = max(cols_addr) if cols_addr else 0
    results.append((f"chat column spans full width (paints to column {widest} of {cols})",
                    widest >= int(cols * 0.7)))
    print("-" * 70)
    fails = 0
    for name, ok in results:
        print(("PASS  " if ok else "FAIL  ") + name)
        fails += 0 if ok else 1
    print("-" * 70)
    try:
        cap_size = cap_path.stat().st_size
    except Exception:
        cap_size = len(rawB)
    print(f"{'ALL PASS' if fails == 0 else f'{fails} FAILED'}   capture={cap_path} ({cap_size} bytes)")
    if fails:
        print("\nHINTS:")
        if not results[0][1]:
            print("  - resume FAIL: check routes/home.tsx auto-continue effect is intact")
        if not results[1][1]:
            print("  - reply FAIL: free-tier may be slow/rate-limited — re-run with --wait 90")
        if any("canvas" in n and not ok for n, ok in results):
            print("  - palette FAIL: theme JSON not loaded? Check ~/.config/opencode/opencode.jsonc has \"theme\": \"arena-...\"")
            print("  - also check: ls ~/.config/opencode/themes/ and cat the JSON")
    sys.exit(0 if fails == 0 else 1)

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

## 9. TROUBLESHOOTING — ZERO-ERROR EDITION

| Symptom | Cause → fix |
|---|---|
| TUI won't start after a theme edit | `Color reference "x" not found` — typo in a `defs`/theme ref name. Also: unquoted `color:` in an `agent/*.md`. Run `python3 ~/palette.py --check` to list broken JSON. |
| Colours didn't change at all | You edited the **built-in** JSON but a custom theme of the same name in `~/.config/opencode/themes/` overrides it — or `"theme"` in `opencode.jsonc` still points elsewhere. Check `grep theme ~/.config/opencode/opencode.jsonc` and `python3 ~/palette.py --check`. |
| Colours changed but bubble is still white | Bubble bg = `secondary`. Set `inkBubble`/`secondary`, not `primary`. Use `--bubble #RRGGBB`. |
| Palette reverted after a rebuild | Your sandbox restored an older `arena-code.json` (rule 2). Grep `7B6DF6`, re-fetch from `dev`, rebuild. |
| `ReferenceError: createSignal is not defined` | Two edits to one file raced (rule 1). Restore the file from `dev`, redo as a single scripted rewrite with `assert count == 1`. |
| Messages flicker / tear while streaming | Someone replaced `<Index each={blocks()}>` with `<For>`. Put `<Index>` + `block()` accessors back. |
| Reopening shows an empty home screen | The auto-continue `createEffect` in `routes/home.tsx` is gone. Restore it from `dev`. |
| `stat -c%s` prints a different size on the two paths | One install didn't happen (usually a silent `sudo -n` failure). Re-run the `sudo install` line interactively. |
| New binary seems ignored | The old process was still running. `/exit`, then start `opencode` again. |
| `unable to create text based on template` on shell start | That is **oh-my-posh**, not Arena Code (`oh-my-posh upgrade`). Do not touch the binary for it. |
| Zip is a few KB | The package tree was empty/mangled when zipped. Rebuild the tree, re-check `bin/opencode` size > 150 MB, re-zip. |
| `FAIL binary too small` from pty-test.py | Your download was truncated. Re-download: `curl -sfL -o /tmp/...zip <url> && unzip -oj ... && stat -c%s`. |
| `FAIL binary not found` | You didn't copy `~/oc-new-bin` out before snapshot wiped it. Restore from release zip. |
| `python3 palette.py` says `invalid hex` | You typed `#FFF` or `FF0000` — must be exactly `#RRGGBB` (7 chars). |
| `alwaysSeparate is not defined` | You are inside tmux. `exit` tmux, then run `opencode` directly. WSL must run without tmux. |
| Theme JSON exists but not applied | `opencode.jsonc` still points to old name. `python3 ~/palette.py` auto-patches it, or edit manually: `"theme": "arena-..."`. |
| `syntax error near unexpected token` when pasting | You pasted a multi-line block. This prompt uses **one line per paste only**. Copy one line at a time. |

### Quick zero-error checklist before you ship:

```
python3 ~/palette.py --check
```

```
stat -c%s ~/.local/bin/opencode
```

```
stat -c%s /usr/local/bin/opencode
```

```
python3 ~/pty-test.py ~/.local/bin/opencode --theme ~/.config/opencode/themes/arena-noir.json --wait 80
```

All must be OK and ALL PASS. If any FAIL, do not ship — fix first.
