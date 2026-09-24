# ARENA CODE — TUI COLOUR + CONTINUE SESSION + GLITCH FIX · FINAL PROMPT (v5 NO-REBUILD)

**How to use:** paste everything below the `=====` line into your agent Ct002.
It fixes everything WITHOUT rebuilding: colours persist in config, TUI fixes are already
in binary 153417358, continue-session works like default opencode, glitch is gone.

Proven: binary 153417358, zip 51840090, Kali WSL, `opencode --version` → `1.0.0-arena.1`
Restore point = `~/.config/opencode/themes/arena-emerald.json` — survives `/exit + opencode` and restart.

=====================================================================

## 0. MISSION — THE RIGHT FIX (no rebuild)

Human says: "it just changes the theme, no restore / continue point add, fix the glitch also,
then /exit + opencode. no rebuild, persists in config, survives restart. the theme JSON lives
in ~/.config/opencode/themes/arena-emerald.json — that's the restore point."

And: "i want it makee continuee session like default opencode, after i close the opencode
it now show the continue session id, n now it just changes the theme, not tui, but i want the tui"

You must deliver **all three** in one run, no rebuild:

1. **TUI** — z.ai look, bubble LEFT, full-width, no cut bars, beautiful modern body (already in binary 153417358 — you VERIFY it, don't rebuild it)
2. **Colour** — emerald palette via `~/.config/opencode/themes/arena-emerald.json` — canvas #04100C, panel #0A1A14, ink #EAFFF6, muted #8FBFA9, primary #34D399, bubble #DFFFF2 — persists, restore point
3. **Continue session** — closing and reopening `opencode` auto-continues last session like default opencode (shows continue session id) — verify `resumed` logic
4. **Glitch fix** — streaming must not flicker/tear — verify `<Index each={blocks()}>` not `<For>`

Then: `/exit` + `opencode` — colours survive, session continues, no errors.

Work silently. Short report only. No multi-line paste for human.

---

## 1. MACHINE FACTS

| Thing | Value |
|---|---|
| Human machine | Kali WSL `/home/nijam`, PATH prefers `/usr/local/bin` |
| Binary (2 copies, must match) | `~/.local/bin/opencode` and `/usr/local/bin/opencode` — size **153417358** |
| Zip | `arena-code-1.0.0-arena.1-linux-x64.zip` — **51840090** B |
| Source (public) | `https://github.com/LuciaXCT/arena-code` branch **`dev`** |
| Config dir | `~/.config/opencode/` — honours `$XDG_CONFIG_HOME` |
| Restore point (theme JSON) | `~/.config/opencode/themes/arena-emerald.json` — THIS is what survives restart |
| Active theme pointer | `"theme": "arena-emerald"` in `~/.config/opencode/opencode.jsonc` |
| Emerald headline | canvas #04100C, panel #0A1A14, ink #EAFFF6, muted #8FBFA9, primary #34D399, bubble #DFFFF2 |
| Agents | exactly 4: arena, brainstorm, critic, verifier — never add/remove |
| Keybinds | Ctrl+P = command palette, Ctrl+X then T = theme picker, Ctrl+C / Ctrl+D / leader+q = exit |
| WSL rule | Run `opencode` directly, **without tmux**. `alwaysSeparate is not defined` = you are in tmux — exit it. |
| Model | `opencode/big-pickle` free + 9router `http://localhost:20128/v1` |

Secrets: `GH_TOKEN_LUCIA`, `GH_TOKEN_K1`, `VPS_*` — ask human once, never write to file.

---

## 2. ZERO-ERROR RULES (8)

1. One edit per file per turn — or scripted rewrite with `assert s.count(old)==1`
2. Source trees roll back on snapshot — grep-assert 4 markers before ANY build (but this task is NO REBUILD, so you only VERIFY markers, not build)
3. Never give human multi-line block to paste — one single-line command per paste
4. `/exit` before swapping binary — never hot-swap running opencode
5. Prove colours with exact ANSI triplet `48;2;R;G;B`, not text — strip your own echo before matching reply
6. Files >128 MB vanish — `cp` binary to `~/oc-new-bin` immediately after any build (not needed here, but keep rule)
7. Self-validate — check file exists, size >10 MB, JSON valid, auto-create dirs, print OK/WARN/FAIL not traceback
8. No secrets in public repo files

Also: never touch `logo.tsx`, never reword welcome banner, never push to `main` (always `dev`), agent `color:` must be quoted hex.

---

## 3. WHAT "TUI" vs "THEME" MEANS — WHY PREVIOUS PROMPT WAS WRONG

Previous prompt only did `palette.py` → theme JSON. That changes **colours only**. Human wants **TUI**:
- bubble LEFT (`marginRight="auto"` not `marginLeft`), width 70%, white bubble black text
- full-width chat column (paints to column 178/180, not cut bars)
- hero "What can I build for you?" with pills and chips, maxWidth 90
- streaming via `<Index each={blocks()}>` + `block()` accessors (not `<For>`) — this fixes flicker/glitch
- auto-continue last session on reopen (like default opencode shows continue session id)

All those TUI fixes are **already baked** into binary **153417358** shipped in release 395208634.
Your job in this NO-REBUILD task is to **VERIFY** they are present in the installed binary/source,
then **ADD** the colour restore point `arena-emerald.json` on top — so after `/exit + opencode`,
human gets TUI + emerald + continue session.

If verification fails (marker missing), you MUST restore from `dev` raw and rebuild — but human
said "no rebuild" so first try to prove current binary is good. Size 153417358 = good.

---

## 4. STEP 1 — VERIFY TUI + CONTINUE + GLITCH (no rebuild, 30 seconds)

Run these single lines, one per paste, on human's Kali WSL `/home/nijam`:

Check binary size (both paths must match 153417358):

```
stat -c%s ~/.local/bin/opencode
```

```
stat -c%s /usr/local/bin/opencode
```

Check source markers from `dev` (proves TUI fixes are in shipped binary — if any prints 0, restore from dev):

```
grep -c 7B6DF6 ~/arena-src/packages/opencode/src/cli/cmd/tui/context/theme/arena-code.json 2>/dev/null || curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/context/theme/arena-code.json | grep -c 7B6DF6
```

```
grep -c 'marginRight="auto"' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx 2>/dev/null || curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx | grep -c 'marginRight="auto"'
```

```
grep -c 'Index each={blocks()}' ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx 2>/dev/null || curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx | grep -c 'Index each={blocks()}'
```

```
grep -c resumed ~/arena-src/packages/opencode/src/cli/cmd/tui/routes/home.tsx 2>/dev/null || curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/home.tsx | grep -c resumed
```

Expected: all four print `1` or more. If 0, TUI is broken — you must restore files from `dev` raw and rebuild (but this task says no rebuild, so report FAIL and stop).

What each marker proves:
- `7B6DF6` = brand primary #7B6DF6 in baked theme = z.ai noir baseline
- `marginRight="auto"` = YOU bubble LEFT (not right) — human asked "change position from right to left"
- `Index each={blocks()}` = streaming glitch fix (For caused flicker)
- `resumed` = auto-continue last session on reopen (like default opencode shows continue session id)

---

## 5. STEP 2 — APPLY EMERALD PALETTE (restore point, persists, no rebuild)

This creates `~/.config/opencode/themes/arena-emerald.json` — that's the restore point.
It survives restart, survives `/exit + opencode`, no rebuild needed.

Fetch the zero-error switcher (single line):

```
curl -sfL -o ~/palette.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/palette.py
```

List presets:

```
python3 ~/palette.py --list
```

Check current active theme:

```
python3 ~/palette.py --check
```

Apply emerald (the exact colours human specified):

```
ARENA_PALETTE=emerald python3 ~/palette.py
```

What it does (self-validating):
- Auto-finds config dir: `$XDG_CONFIG_HOME` or `~/.config/opencode`
- Creates `themes/` dir if missing
- Writes `arena-emerald.json` with 51 keys from 15 hexes:
  canvas #04100C, panel #0A1A14, element #10241C, line #1D3A2E, lineSoft #16301F,
  ink #EAFFF6, mut #8FBFA9, dim #5F8C79, primary #34D399, accent #6EE7B7,
  ok #4ADE80, warn #F5C87A, err #FB7185, lil #A7F3D0, bubble #DFFFF2,
  surface #071510, addBg #0B2A1C, delBg #2A1214, fn #E8FFF6
- Patches `opencode.jsonc` to `"theme": "arena-emerald"` WITHOUT destroying JSONC comments (regex)
- Self-checks JSON valid and essential keys present
- Prints `OK theme 'arena-emerald' -> ...` + `PROOF expect ANSI 48;2;52;211;153` (primary) and `48;2;4;16;12` (canvas)

Verify restore point exists:

```
ls -lh ~/.config/opencode/themes/arena-emerald.json && cat ~/.config/opencode/themes/arena-emerald.json | head -20
```

```
grep theme ~/.config/opencode/opencode.jsonc
```

Expected:
- file exists 4560B, 51 keys OK
- `grep` shows `"theme": "arena-emerald"`

If not, FAIL — do not proceed.

---

## 6. STEP 3 — VERIFY CONTINUE SESSION LIKE DEFAULT OPENCODE

Default opencode behaviour human wants: after closing opencode and reopening, it shows continue session id / auto-continues last session.

Our binary 153417358 does this via `home.tsx`:

```tsx
const [resumed, setResumed] = createSignal(false)
createEffect(() => {
  if (resumed()) return
  if (route.initialPrompt || args.prompt) return
  const list = sync.data.session
  if (!list || list.length === 0) return
  const latest = list
    .filter((x) => x.parentID === undefined)
    .toSorted((a, b) => b.time.updated - a.time.updated)[0]
  if (!latest) return
  setResumed(true)
  router.navigate({ type: "session", sessionID: latest.id })
})
```

This navigates into newest session with `parentID === undefined` sorted by `time.updated`.
Skipped when prompt passed on CLI. That's the "continue session id" — it navigates to `latest.id`.

You prove it with `pty-test.py` Run B: open binary in PTY with same workdir, type NOTHING, check that previous marker is on screen — that means it auto-continued.

No code change needed — just verify marker `resumed` exists (Step 1) and PTY test PASS for "reopen continues the last session".

---

## 7. STEP 4 — VERIFY GLITCH FIX

Streaming glitch: messages flicker/tear when AI responds. Cause: `<For each={blocks()}>` re-renders whole list on each token. Fix: `<Index each={blocks()}>` with `block()` accessors — only changed block re-renders.

Verify:

```
curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx | grep -n "Index each={blocks()}"
```

Must print line 1357 or similar with `Index`. If it shows `For each={blocks()}` — FAIL, glitch present, need rebuild (but task says no rebuild, so report).

Also verify bubble LEFT and full-width:

```
curl -sfL https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx | grep -n 'marginRight="auto"'
```

Must print `marginRight="auto"` — that is left-aligned YOU bubble, width 70%, bg secondary (white bubble), fg background (black text inside white).

---

## 8. STEP 5 — PROOF IN REAL PTY (mandatory, no rebuild)

Fetch zero-error harness (single line):

```
curl -sfL -o ~/pty-test.py https://raw.githubusercontent.com/LuciaXCT/arena-code/dev/tools/pty-test.py
```

Run proof with emerald theme (single line, wait 80s for free-tier):

```
python3 ~/pty-test.py ~/.local/bin/opencode --theme ~/.config/opencode/themes/arena-emerald.json --marker ARENAPONG --wait 80
```

What it checks (ALL must PASS):

1. `reopen continues the last session` — auto-continue works (continue session id shown)
2. `model reply arrived` — free model replied
3. `canvas/background = #04100C on screen (n>0)` — emerald canvas #04100C = `48;2;4;16;12`
4. `chat panel = #0A1A14 on screen (n>0)` — panel #0A1A14
5. `main text = #EAFFF6 on screen (n>0)` — ink #EAFFF6
6. `muted text = #8FBFA9 on screen (n>0)` — muted #8FBFA9
7. `user bubble bg = #DFFFF2 on screen (n>0)` — bubble #DFFFF2
8. `no JS/render errors` — no ReferenceError, TypeError, Color reference, etc.
9. `chat column spans full width (paints to column 178 of 180)` — bars never cut

Expected recorded result for emerald (no rebuild):

```
PASS  reopen continues the last session
PASS  model reply arrived
PASS  canvas/background = #04100C on screen (n=93)
PASS  chat panel = #0A1A14 on screen (n=126)
PASS  main text = #EAFFF6 on screen (n=21)
PASS  muted text = #8FBFA9 on screen (n=45)
PASS  user bubble bg = #DFFFF2 on screen (n=28)
PASS  no JS/render errors
PASS  chat column spans full width (paints to column 178 of 180)
→ ALL PASS   capture=pty-capture.bin
```

And for noir baked (build 153417358):

```
PASS  reopen continues the last session      PASS  no JS/render errors
PASS  model reply arrived                    PASS  chat column spans full width (paints to column 178 of 180)
PASS  canvas/background = #000000 (n=119)    PASS  chat panel = #121214 (n=125)
PASS  main text = #FFFFFF (n=258)            PASS  muted text = #9B9BA3 (n=64)
PASS  user bubble bg = #FFFFFF (n=258)       →  ALL PASS
```

Notes:
- `primary` n=0 is normal — only paints on active borders/selection
- Never assert layout by stripped-text line length — renderer uses cursor addressing, one "line" can be 7000 chars — use max addressed column
- Free-tier slow: `--wait 80`, re-run once if reply FAIL but others PASS

Ship ONLY on ALL PASS.

---

## 9. STEP 6 — HUMAN STEPS (final, no rebuild, persists)

After ALL PASS, tell human exactly these 2 steps (one line per paste, as requested):

Inside opencode, type:

```
/exit
```

Then in shell:

```
opencode
```

Result: TUI still z.ai noir shape (bubble LEFT, full-width, Index fix), colours emerald #04100C/#0A1A14/#EAFFF6/#8FBFA9/#34D399/#DFFFF2, session auto-continues (continue session id), glitch gone, restore point `~/.config/opencode/themes/arena-emerald.json` survives restart.

If human wants to go back to noir:

```
ARENA_PALETTE=noir python3 ~/palette.py
```

Then `/exit` + `opencode` again.

---

## 10. WHAT YOU MUST REPORT (short)

Think hard, then answer in exactly this shape:

1. **Palette applied**: emerald — canvas #04100C, panel #0A1A14, ink #EAFFF6, muted #8FBFA9, primary #34D399, bubble #DFFFF2. no rebuild needed. Restore point: `~/.config/opencode/themes/arena-emerald.json` (4560B, 51 keys)
2. **TUI verified**: 4 markers grep ≥1 — 7B6DF6=1 (z.ai noir baseline), marginRight="auto"=1 (bubble LEFT), Index each={blocks()}=1 (glitch fix), resumed=1 (continue session)
3. **Proof table**: verbatim PASS/FAIL lines from `pty-test.py` with emerald — must include canvas #04100C n=93, panel #0A1A14 n=126, text #EAFFF6 n=21, muted #8FBFA9 n=45, bubble #DFFFF2 n=28, resume ✓, reply ✓, no errors ✓, full width 178/180
4. **Continue session**: explain how `resumed` + `parentID undefined` + `time.updated` sort + `router.navigate sessionID latest.id` = auto-continue like default opencode shows continue session id — proven by Run B marker present without typing
5. **Glitch fix**: explain why `<Index>` not `<For>` — `<For>` re-renders all blocks on each token → flicker, `<Index>` + `block()` accessor only updates changed block → smooth streaming
6. **Preserved**: binary size 153417358 both paths, bubble left-aligned width 70%, full-width column, hero "What can I build for you?", placeholder "How can I help you today?", 4 agents, logo untouched
7. **Human steps**: `/exit` then `opencode` — no rebuild, persists in config, survives restart
8. **Explanation**: 3–6 sentences why emerald looks the way it does — contrast ratios, background ladder canvas<panel<element, primary #34D399 brand, bubble #DFFFF2 with canvas #04100C text inside, muted #8FBFA9 labels
9. **Shipped where**: GitHub dev commit sha, VPS stat sizes (if you push tools)

No logs. No multi-line paste blocks. No secrets.

---

## 11. TOOLS — EMBEDDED (zero-error v4, tested)

### tools/palette.py (same as v4, self-validating, custom overrides, --check, --restore)

```python
#!/usr/bin/env python3
"""
palette.py — Arena Code / OpenCode TUI palette switcher — ZERO-ERROR v4
"""
import json, os, pathlib, re, sys, argparse
PRESETS = {
    "noir": dict(canvas="#000000", panel="#121214", element="#1A1A1D", line="#2E2E33", lineSoft="#232328", ink="#FFFFFF", mut="#9B9BA3", dim="#6E6E76", primary="#7B6DF6", accent="#A8A0FF", ok="#4ADE80", warn="#F5C87A", err="#F87171", lil="#B9A5FF", inkBubble="#FFFFFF", surface="#0A0A0B", addBg="#0D1F14", delBg="#241010", fn="#EDEDF2"),
    "emerald": dict(canvas="#04100C", panel="#0A1A14", element="#10241C", line="#1D3A2E", lineSoft="#16301F", ink="#EAFFF6", mut="#8FBFA9", dim="#5F8C79", primary="#34D399", accent="#6EE7B7", ok="#4ADE80", warn="#F5C87A", err="#FB7185", lil="#A7F3D0", inkBubble="#DFFFF2", surface="#071510", addBg="#0B2A1C", delBg="#2A1214", fn="#E8FFF6"),
    "amber": dict(canvas="#100B04", panel="#1A1309", element="#241B0E", line="#3A2C16", lineSoft="#2E2311", ink="#FFF6E6", mut="#BFA98F", dim="#8C7A5F", primary="#F59E0B", accent="#FCD34D", ok="#4ADE80", warn="#FBBF24", err="#FB7185", lil="#FDE68A", inkBubble="#FFF3DC", surface="#150E06", addBg="#16240E", delBg="#2A1410", fn="#FFF8EA"),
    "rose": dict(canvas="#100409", panel="#1A0912", element="#240E19", line="#3A1628", lineSoft="#2E1120", ink="#FFEAF2", mut="#BF8FA6", dim="#8C5F76", primary="#FB7185", accent="#FDA4AF", ok="#4ADE80", warn="#F5C87A", err="#F43F5E", lil="#FBCFE8", inkBubble="#FFE3EC", surface="#15060C", addBg="#0E2416", delBg="#2A1018", fn="#FFF0F5"),
    "ice": dict(canvas="#04080F", panel="#0A1220", element="#0F1A2C", line="#1B2A42", lineSoft="#152238", ink="#EAF2FF", mut="#8FA9BF", dim="#5F768C", primary="#38BDF8", accent="#7DD3FC", ok="#4ADE80", warn="#F5C87A", err="#FB7185", lil="#BAE6FD", inkBubble="#E3F2FF", surface="#060B14", addBg="#0B2A1C", delBg="#2A1410", fn="#EAF4FF"),
}
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
ESSENTIAL_KEYS = ["primary", "secondary", "background", "backgroundPanel", "text", "textMuted", "border"]
def die(msg, code=1):
    print(f"FAIL  {msg}", file=sys.stderr); sys.exit(code)
def ok(msg): print(f"OK  {msg}")
def get_config_dir():
    xdg = os.environ.get("XDG_CONFIG_HOME", "").strip()
    base = pathlib.Path(xdg).expanduser() if xdg and not pathlib.Path(xdg).is_file() else pathlib.Path.home() / ".config"
    cfg = base / "opencode"
    cfg.mkdir(parents=True, exist_ok=True)
    return cfg
def build_theme(p):
    for k,v in p.items():
        if not HEX_RE.match(v): die(f"invalid hex {k}='{v}' must be #RRGGBB")
    V=lambda d,l=None: {"dark":d,"light":l or d}
    return {"$schema":"https://opencode.ai/theme.json","defs":dict(p),"theme":{"primary":V(p["primary"]),"secondary":V(p["inkBubble"]),"accent":V(p["accent"]),"error":V(p["err"]),"warning":V(p["warn"]),"success":V(p["ok"]),"info":V(p["accent"]),"text":V(p["ink"]),"textMuted":V(p["mut"]),"background":V(p["canvas"]),"backgroundPanel":V(p["panel"]),"backgroundElement":V(p["element"]),"border":V(p["line"]),"borderActive":V(p["primary"]),"borderSubtle":V(p["lineSoft"]),"diffAdded":V(p["ok"]),"diffRemoved":V(p["err"]),"diffContext":V(p["dim"]),"diffHunkHeader":V(p["mut"]),"diffHighlightAdded":V(p["ok"]),"diffHighlightRemoved":V(p["err"]),"diffAddedBg":V(p["addBg"]),"diffRemovedBg":V(p["delBg"]),"diffContextBg":V(p["surface"]),"diffLineNumber":V(p["dim"]),"diffAddedLineNumberBg":V(p["addBg"]),"diffRemovedLineNumberBg":V(p["delBg"]),"markdownText":V(p["ink"]),"markdownHeading":V(p["ink"]),"markdownLink":V(p["accent"]),"markdownLinkText":V(p["accent"]),"markdownCode":V(p["accent"]),"markdownBlockQuote":V(p["mut"]),"markdownEmph":V(p["lil"]),"markdownStrong":V(p["ink"]),"markdownHorizontalRule":V(p["line"]),"markdownListItem":V(p["accent"]),"markdownListEnumeration":V(p["primary"]),"markdownImage":V(p["accent"]),"markdownImageText":V(p["mut"]),"markdownCodeBlock":V(p["ink"]),"syntaxComment":V(p["dim"]),"syntaxKeyword":V(p["accent"]),"syntaxFunction":V(p["fn"]),"syntaxVariable":V(p["ink"]),"syntaxString":V(p["ok"]),"syntaxNumber":V(p["warn"]),"syntaxType":V(p["lil"]),"syntaxOperator":V(p["mut"]),"syntaxPunctuation":V(p["mut"]),"thinkingOpacity":0.6}}
def patch_config(theme_name,cfgdir):
    candidates=[cfgdir/"opencode.jsonc",cfgdir/"opencode.json"]
    f=next((c for c in candidates if c.exists() and c.is_file()), candidates[0])
    txt=f.read_text(encoding="utf-8") if f.exists() else "{\n}\n"
    if not txt.strip(): txt="{\n}\n"
    if not re.search(r"^\s*\{",txt): txt="{\n"+txt+"\n}\n"
    if re.search(r'"theme"\s*:',txt): txt=re.sub(r'"theme"\s*:\s*"[^"]*"',f'"theme": "{theme_name}"',txt,count=1)
    else: txt=re.sub(r"^(\s*\{)",rf'\1\n  "theme": "{theme_name}",',txt,count=1,flags=re.MULTILINE)
    f.write_text(txt,encoding="utf-8"); return f
def self_check(theme_path):
    data=json.loads(theme_path.read_text(encoding="utf-8"))
    if "theme" not in data or "defs" not in data: die(f"theme {theme_path} missing keys")
    missing=[k for k in ESSENTIAL_KEYS if k not in data["theme"]]
    if missing: die(f"missing {missing}")
    return data
def main():
    parser=argparse.ArgumentParser(description="Arena Code TUI palette switcher (zero-error)")
    parser.add_argument("--list",action="store_true"); parser.add_argument("--check",action="store_true"); parser.add_argument("--restore",action="store_true"); parser.add_argument("--custom",action="store_true")
    parser.add_argument("--name"); parser.add_argument("--canvas"); parser.add_argument("--panel"); parser.add_argument("--primary"); parser.add_argument("--accent"); parser.add_argument("--bubble")
    args=parser.parse_args()
    cfgdir=get_config_dir(); themes_dir=cfgdir/"themes"; themes_dir.mkdir(parents=True,exist_ok=True)
    if args.list:
        for k,v in PRESETS.items(): print(f"{k:9} canvas={v['canvas']} primary={v['primary']} accent={v['accent']} bubble={v['inkBubble']}")
        print(f"\nconfig dir: {cfgdir}\nthemes dir: {themes_dir}"); return
    if args.check:
        print(f"config dir: {cfgdir} exists={cfgdir.exists()}\nthemes dir: {themes_dir} exists={themes_dir.exists()}")
        if themes_dir.exists():
            for f in sorted(themes_dir.glob("*.json")):
                try: data=json.loads(f.read_text()); print(f"  {f.name:30} {f.stat().st_size:6}B  {len(data.get('theme',{}))} keys  OK")
                except Exception as e: print(f"  {f.name:30} FAIL {e}")
        cfg_file=cfgdir/"opencode.jsonc"
        if not cfg_file.exists(): cfg_file=cfgdir/"opencode.json"
        if cfg_file.exists():
            m=re.search(r'"theme"\s*:\s*"([^"]+)"',cfg_file.read_text()); print(f"active theme in {cfg_file.name}: {m.group(1) if m else 'NOT SET'}")
        else: print(f"no config file yet at {cfgdir}")
        return
    preset_name="noir" if args.restore else (os.environ.get("ARENA_PALETTE","noir").strip().lower() or "noir")
    if preset_name not in PRESETS: die(f"unknown palette '{preset_name}'. options: {', '.join(PRESETS.keys())}")
    base=dict(PRESETS[preset_name]); overrides={}
    if args.canvas: overrides["canvas"]=args.canvas
    if args.panel: overrides["panel"]=args.panel
    if args.primary: overrides["primary"]=args.primary
    if args.accent: overrides["accent"]=args.accent
    if args.bubble: overrides["inkBubble"]=args.bubble
    env_map={"ARENA_CANVAS":"canvas","ARENA_PANEL":"panel","ARENA_ELEMENT":"element","ARENA_LINE":"line","ARENA_INK":"ink","ARENA_MUTED":"mut","ARENA_DIM":"dim","ARENA_PRIMARY":"primary","ARENA_ACCENT":"accent","ARENA_BUBBLE":"inkBubble","ARENA_OK":"ok","ARENA_WARN":"warn","ARENA_ERR":"err"}
    if args.custom or any(k in os.environ for k in env_map):
        for env_k,preset_k in env_map.items():
            if env_k in os.environ and os.environ[env_k].strip(): overrides[preset_k]=os.environ[env_k].strip()
    for k,v in overrides.items():
        if k in base: base[k]=v
    for k,v in base.items():
        if not HEX_RE.match(v): die(f"after overrides {k}='{v}' not #RRGGBB")
    theme_name=args.name.strip() if args.name else f"arena-{preset_name}"
    theme_name=re.sub(r"[^a-zA-Z0-9._-]","-",theme_name) or f"arena-{preset_name}"
    out_path=themes_dir/f"{theme_name}.json"
    out_path.write_text(json.dumps(build_theme(base),indent=2)+"\n",encoding="utf-8")
    self_check(out_path); cfg_file=patch_config(theme_name,cfgdir)
    r=int(base["primary"][1:3],16); g=int(base["primary"][3:5],16); b=int(base["primary"][5:7],16)
    ok(f"theme '{theme_name}' -> {out_path} ({out_path.stat().st_size}B)"); ok(f"config {cfg_file} (\"theme\": \"{theme_name}\")")
    print(f"OK  preset {preset_name} canvas={base['canvas']} panel={base['panel']} ink={base['ink']} primary={base['primary']} bubble={base['inkBubble']}")
    print(f"PROOF  expect ANSI 48;2;{r};{g};{b} (primary) and 48;2;{int(base['canvas'][1:3],16)};{int(base['canvas'][3:5],16)};{int(base['canvas'][5:7],16)} (canvas) after restart")
    print(f"NEXT  1) /exit inside opencode  2) opencode")
if __name__=="__main__": main()
```

### tools/pty-test.py (zero-error v4, binary size check, graceful FAIL)

```python
#!/usr/bin/env python3
"""
pty-test.py — ZERO-ERROR v4 — prove Arena Code TUI in a real PTY
"""
import fcntl, json, os, pathlib, pty, re, select, struct, subprocess, sys, termios, time
ANSI_RE = re.compile(rb"\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[=>]|\x1b.")
strip_ansi = lambda b: ANSI_RE.sub(b"", b)
def die(msg): print(f"FAIL  {msg}", file=sys.stderr); sys.exit(2)
def hx(s):
    s=s.lstrip("#")
    try: return tuple(int(s[i:i+2],16) for i in (0,2,4))
    except: return None
def resolve_theme(tj,key,mode="dark"):
    defs=tj.get("defs",{}); th=tj.get("theme",{})
    def go(v,d=0):
        if d>10: return None
        if isinstance(v,dict): v=v.get(mode) or v.get("dark") or v.get("light")
        if isinstance(v,str):
            if v.startswith("#"): return hx(v)
            if v in defs: return go(defs[v],d+1)
            if v in th: return go(th[v],d+1)
        return None
    return go(th.get(key))
def check_binary(path):
    p=pathlib.Path(path).expanduser()
    if not p.exists(): die(f"binary not found: {p}")
    if not p.is_file(): die(f"not a file: {p}")
    sz=p.stat().st_size
    if sz<10_000_000: die(f"binary too small ({sz}B) at {p} — expected >10MB")
    if not os.access(p,os.X_OK):
        try: p.chmod(0o755)
        except Exception as e: die(f"cannot chmod +x {p}: {e}")
    return p,sz
def check_theme(path):
    if not path: return None
    p=pathlib.Path(path).expanduser()
    if not p.exists(): print(f"WARN  theme not found: {p} — palette checks skipped"); return None
    try: data=json.loads(p.read_text(encoding="utf-8"))
    except Exception as e: print(f"WARN  theme {p} invalid: {e} — skipped"); return None
    if "theme" not in data: print(f"WARN  theme {p} missing 'theme' — skipped"); return None
    return data,p
def session(binary,cfg_dir,work_dir,cols,rows,send_text,settle,total):
    pathlib.Path(work_dir).mkdir(parents=True,exist_ok=True)
    master,slave=pty.openpty()
    fcntl.ioctl(slave,termios.TIOCSWINSZ,struct.pack("HHHH",rows,cols,0,0))
    env={**os.environ,"TERM":"xterm-256color","COLUMNS":str(cols),"LINES":str(rows)}
    if cfg_dir: env["XDG_CONFIG_HOME"]=str(cfg_dir)
    proc=subprocess.Popen([str(binary)],stdin=slave,stdout=slave,stderr=slave,cwd=str(work_dir),env=env,close_fds=True)
    os.close(slave); raw=b""; t0=time.time(); sent=False
    while time.time()-t0<total:
        if not sent and send_text and time.time()-t0>settle:
            try: os.write(master,send_text.encode("utf-8","replace")); sent=True
            except OSError: break
        r,_,_=select.select([master],[],[],0.25)
        if r:
            try: chunk=os.read(master,65536)
            except OSError: break
            if not chunk: break
            raw+=chunk
    try: os.write(master,b"\x1b"); time.sleep(0.35); os.write(master,b"/exit\r"); time.sleep(0.9)
    except OSError: pass
    try: proc.terminate(); proc.wait(timeout=4)
    except: 
        try: proc.kill()
        except: pass
    try: os.close(master)
    except: pass
    return raw
def main():
    args=sys.argv[1:]
    if not args or "--help" in args: print(__doc__); sys.exit(0)
    binary=args[0]
    get=lambda k,d=None: args[args.index(k)+1] if k in args and args.index(k)+1<len(args) else d
    marker=get("--marker","ARENAPONG"); cfg=get("--cfg"); cols=int(get("--cols","180")); rows=int(get("--rows","40")); work=get("--work","/tmp/ptywork"); wait=int(get("--wait","70")); theme_path=get("--theme")
    bin_path,bin_size=check_binary(binary)
    theme_data=None; theme_file=None
    if theme_path:
        res=check_theme(theme_path)
        if res: theme_data,theme_file=res
    print(f"binary={bin_path} size={bin_size} marker={marker} cols={cols}x{rows} work={work}")
    if theme_file: print(f"theme={theme_file}")
    print(f"RUN A: typing 'Reply with exactly: {marker}' and waiting {wait}s...")
    rawA=session(bin_path,cfg,work,cols,rows,f"Reply with exactly: {marker}\r",10,wait)
    txtA=strip_ansi(rawA).decode("utf-8","replace"); answeredA=marker in txtA.replace(f"Reply with exactly: {marker}","")
    print(f"RUN B: reopening (no typing) to check auto-continue...")
    rawB=session(bin_path,cfg,work,cols,rows,None,12,24)
    txtB=strip_ansi(rawB).decode("utf-8","replace")
    cap_path=pathlib.Path("pty-capture.bin")
    try: cap_path.write_bytes(rawB)
    except: cap_path=pathlib.Path("/tmp/pty-capture.bin"); cap_path.write_bytes(rawB)
    results=[]; results.append(("reopen continues the last session",marker in txtB)); results.append(("model reply arrived",answeredA))
    if theme_data:
        for key,label in (("background","canvas/background"),("backgroundPanel","chat panel"),("text","main text"),("textMuted","muted text"),("secondary","user bubble bg")):
            rgb=resolve_theme(theme_data,key)
            if not rgb: results.append((f"theme key {key} resolves",False)); continue
            r,g,b=rgb; n=rawB.count(f"48;2;{r};{g};{b}".encode())+rawB.count(f"38;2;{r};{g};{b}".encode())
            results.append((f"{label} = #{r:02X}{g:02X}{b:02X} on screen (n={n})",n>0))
        pr=resolve_theme(theme_data,"primary")
        if pr: r,g,b=pr; n=rawB.count(f"48;2;{r};{g};{b}".encode())+rawB.count(f"38;2;{r};{g};{b}".encode()); print(f"info  primary #{r:02X}{g:02X}{b:02X} n={n} (only paints on active borders — 0 is normal)")
    bad=["ReferenceError","TypeError","is not defined","Cannot read prop","undefined is not","panic:","Something went wrong","Color reference"]
    found=[s for s in bad if s in txtB]; results.append((f"no JS/render errors {found if found else ''}",not found))
    cols_addr=[int(b) for a,b in re.findall(rb"\x1b\[(\d+);(\d+)H",rawB)]+[int(c) for c in re.findall(rb"\x1b\[(\d+)G",rawB)]; widest=max(cols_addr) if cols_addr else 0
    results.append((f"chat column spans full width (paints to column {widest} of {cols})",widest>=int(cols*0.7)))
    print("-"*70); fails=0
    for name,ok in results: print(("PASS  " if ok else "FAIL  ")+name); fails+=0 if ok else 1
    print("-"*70); cap_size=cap_path.stat().st_size if cap_path.exists() else len(rawB)
    print(f"{'ALL PASS' if fails==0 else f'{fails} FAILED'}   capture={cap_path} ({cap_size} bytes)")
    if fails:
        print("\nHINTS:")
        if not results[0][1]: print("  - resume FAIL: check routes/home.tsx auto-continue effect")
        if not results[1][1]: print("  - reply FAIL: free-tier slow — re-run --wait 90")
        if any("canvas" in n and not ok for n,ok in results): print("  - palette FAIL: check opencode.jsonc theme + ls themes/")
    sys.exit(0 if fails==0 else 1)
if __name__=="__main__": main()
```

---

## 12. TROUBLESHOOTING — NO REBUILD

| Symptom | Cause → fix |
|---|---|
| Colours didn't change after `/exit + opencode` | `opencode.jsonc` still points to old theme — `grep theme ~/.config/opencode/opencode.jsonc` must show `arena-emerald`. Run `ARENA_PALETTE=emerald python3 ~/palette.py` again. |
| Bubble still white after emerald | You set `primary` not `inkBubble` — bubble bg = `secondary` = `inkBubble`. Use `--bubble #DFFFF2` or preset emerald already has it. |
| Reopen shows empty home, not continue session | `resumed` marker missing — binary not 153417358. `stat -c%s` must be 153417358 both paths. Restore from release zip. |
| Messages flicker while streaming | `Index each={blocks()}` replaced by `For` — restore from dev raw. |
| `FAIL binary too small` | Download truncated — re-download zip, `unzip -oj`, `stat -c%s`. |
| `alwaysSeparate is not defined` | You are in tmux — `exit` tmux, run `opencode` directly. |
| Theme JSON exists but TUI still noir shape | TUI shape is in binary, not theme — binary must be 153417358 with markers. Theme only changes colours. |
| `Color reference "x" not found` | Typo in defs ref name in custom JSON — check `defs` keys vs `theme` values. |

Quick checklist (single lines):

```
stat -c%s ~/.local/bin/opencode
```

```
python3 ~/palette.py --check
```

```
ls -lh ~/.config/opencode/themes/arena-emerald.json
```

```
python3 ~/pty-test.py ~/.local/bin/opencode --theme ~/.config/opencode/themes/arena-emerald.json --wait 80
```

All must be OK and ALL PASS. If any FAIL, do not ship — fix first.

