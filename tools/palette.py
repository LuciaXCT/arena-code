#!/usr/bin/env python3
"""
palette.py — Arena Code / OpenCode TUI palette switcher (NO REBUILD NEEDED).

OpenCode loads custom themes at runtime from:
    ~/.config/opencode/themes/<name>.json          (global)
    <project>/.opencode/themes/<name>.json         (per-project; .arena/ if ARENA=1)
and activates the one named by "theme" in ~/.config/opencode/opencode.jsonc

Usage:
    python3 palette.py                 # apply the default preset (noir)
    ARENA_PALETTE=emerald python3 palette.py
    python3 palette.py --list
Then: /exit inside opencode, and start `opencode` again.
"""
import json
import os
import pathlib
import re
import sys

# ── presets: 15 hex values each ──────────────────────────────────────────────
#  canvas  = app background        panel   = chat column background
#  element = boxes / chips          line    = borders          lineSoft = subtle borders
#  ink     = main text              mut     = labels/muted     dim    = faint text/timestamps
#  primary = brand accent (borders, links, selected)
#  accent  = secondary accent (code, markdown links)
#  ok/warn/err = success/warning/error   lil = emphasis   inkBubble = user bubble bg
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
                surface="#060B14", addBg="#0B2A1C", delBg="#2A1214", fn="#EAF4FF"),
}


def build(p):
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
            "syntaxString": V(p["ok"]), "syntaxNumber": V(p["warn"]), "syntaxType": V(p["lil"]),
            "syntaxOperator": V(p["mut"]), "syntaxPunctuation": V(p["mut"]),
            "thinkingOpacity": 0.6,
        },
    }


def patch_config(name, cfgdir):
    """Set "theme": "<name>" in opencode.jsonc without destroying comments."""
    f = cfgdir / "opencode.jsonc"
    if not f.exists():
        alt = cfgdir / "opencode.json"
        f = alt if alt.exists() else f
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
    r, g, b = (int(name and PRESETS[name]["primary"][i:i + 2], 16) for i in (1, 3, 5))
    print(f"OK  theme '{theme_name}' -> {out}")
    print(f"OK  config  {cfg}  (\"theme\": \"{theme_name}\")")
    print(f"PROOF  expect ANSI triplet 48;2;{r};{g};{b} (primary) on screen after restart")


if __name__ == "__main__":
    main()
