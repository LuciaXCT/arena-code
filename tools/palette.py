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

# ── 15 base colours control 90% of the look ────────────────────────────────
# canvas=app bg, panel=chat col bg, element=boxes/chips/input bg
# line=borders, lineSoft=subtle borders, ink=main text, mut=labels, dim=faint
# primary=brand (active borders/selection), accent=links/code, ok/warn/err=status
# lil=emphasis/italic, inkBubble=USER bubble bg, surface=diff ctx bg, addBg/delBg=diff bg, fn=code text
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
    return val.strip().upper() if val.strip().lower() != val.strip() else val.strip()


def get_config_dir():
    # Respect XDG_CONFIG_HOME if set, else ~/.config/opencode
    xdg = os.environ.get("XDG_CONFIG_HOME", "").strip()
    if xdg:
        base = pathlib.Path(xdg).expanduser()
        # If XDG points to a file, fallback
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
    # Validate all 15 inputs first
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
    # Find existing config: opencode.jsonc preferred, then opencode.json
    candidates = [cfgdir / "opencode.jsonc", cfgdir / "opencode.json"]
    f = None
    for c in candidates:
        if c.exists() and c.is_file():
            f = c
            break
    if f is None:
        f = candidates[0]  # create jsonc by default

    try:
        txt = f.read_text(encoding="utf-8") if f.exists() else "{\n}\n"
    except Exception as e:
        die(f"cannot read {f}: {e}")

    if not txt.strip():
        txt = "{\n}\n"

    # If file doesn't start with {, wrap it
    if not re.search(r"^\s*\{", txt):
        txt = "{\n" + txt + "\n}\n"

    # Patch or insert "theme"
    if re.search(r'"theme"\s*:', txt):
        txt = re.sub(r'"theme"\s*:\s*"[^"]*"', f'"theme": "{theme_name}"', txt, count=1)
    else:
        # Insert after first {
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
    # Check each essential key resolves to hex
    for k in ESSENTIAL_KEYS:
        v = data["theme"].get(k)
        if isinstance(v, dict):
            v = v.get("dark") or v.get("light")
        if isinstance(v, str) and v.startswith("#"):
            continue
        # If it's a defs ref, resolve one level
        if isinstance(v, str) and v in data.get("defs", {}):
            continue
        # Allow but warn if not hex
        if not (isinstance(v, str) and (v.startswith("#") or v in data.get("defs", {}))):
            # Not fatal, but report
            print(f"WARN  key {k} value '{v}' is not direct hex — will be resolved at runtime")
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

    # Determine preset
    if args.restore:
        preset_name = "noir"
    else:
        preset_name = os.environ.get("ARENA_PALETTE", "noir").strip().lower() or "noir"

    if preset_name not in PRESETS:
        die(f"unknown palette '{preset_name}'. options: {', '.join(PRESETS.keys())} — try --list")

    base = dict(PRESETS[preset_name])

    # Apply overrides from args and env
    overrides = {}
    if args.canvas:
        overrides["canvas"] = args.canvas
    if args.panel:
        overrides["panel"] = args.panel
    if args.primary:
        overrides["primary"] = args.primary
    if args.accent:
        overrides["accent"] = args.accent
    if args.bubble:
        overrides["inkBubble"] = args.bubble

    # Env overrides if --custom or any ARENA_* set
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

    # Merge
    for k, v in overrides.items():
        if k in base:
            base[k] = v

    # Validate merged
    for k, v in base.items():
        if not HEX_RE.match(v):
            die(f"after overrides, {k}='{v}' is not #RRGGBB")

    theme_name = args.name.strip() if args.name else f"arena-{preset_name}"
    # Sanitize theme name: no path separators, no spaces
    theme_name = re.sub(r"[^a-zA-Z0-9._-]", "-", theme_name)
    if not theme_name:
        theme_name = f"arena-{preset_name}"

    out_path = themes_dir / f"{theme_name}.json"
    theme_data = build_theme(base)

    try:
        out_path.write_text(json.dumps(theme_data, indent=2) + "\n", encoding="utf-8")
    except Exception as e:
        die(f"cannot write theme {out_path}: {e}")

    # Self-check
    self_check(out_path)

    cfg_file = patch_config(theme_name, cfgdir)

    # Extract primary RGB for proof
    try:
        r = int(base["primary"][1:3], 16)
        g = int(base["primary"][3:5], 16)
        b = int(base["primary"][5:7], 16)
    except Exception:
        r, g, b = 123, 111, 246

    ok(f"theme '{theme_name}' -> {out_path} ({out_path.stat().st_size}B)")
    ok(f"config {cfg_file} (\"theme\": \"{theme_name}\")")
    print(f"OK  preset {preset_name} canvas={base['canvas']} panel={base['panel']} ink={base['ink']} primary={base['primary']} bubble={base['inkBubble']}")
    print(f"PROOF  expect ANSI 48;2;{r};{g};{b} (primary) and 48;2;{int(base['canvas'][1:3],16)};{int(base['canvas'][3:5],16)};{int(base['canvas'][5:7],16)} (canvas) after restart")
    print(f"NEXT  1) /exit inside opencode  2) opencode")

    # Also warn if binary missing (not fatal)
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
