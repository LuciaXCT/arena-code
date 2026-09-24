# TUI v6 — Old Banner Compact + Workstation Realistic

## Goal
Restore OLD banner `ARENA CODE` block ASCII (3 lines) for outside (home), but make it COMPACT not too much, with realistic workstation circles/shadows. Inside (session) should match outside realism.

## Old Banner
```
 ▄▄▄  ▄▄▄▄  ▄▄▄▄▄ ▄▄  ▄▄  ▄▄▄     ▄▄▄▄  ▄▄▄  ▄▄▄▄  ▄▄▄▄▄
██▀██ ██▄█▄ ██▄▄  ███▄██ ██▀██   ██▀▀▀ ██▀██ ██▀██ ██▄▄
██▀██ ██ ██ ██▄▄▄ ██ ▀██ ██▀██   ▀████ ▀███▀ ████▀ ██▄▄▄
```
- Keep 3 lines, bold, fg text #F5F5F7
- Compact: gap 0 between lines, marginBottom 1, centered, maxWidth 78 not 90, no extra padding
- Below banner: `○ What can I build for you? ○` + subtitle `Interact with Arena Code and explore the boundless world · 1.0.0-arena.1`

## Outside (Home) - Workstation Realistic
- Sidebar (wide >105): width 34, bg panel #111113, border right subtle #1E1E22
  - Header: traffic lights ● ● ● red #F87171 yellow #F5C87A green #4ADE80 + `arena code` + version
  - New Chat: double layer shadow (bg #08080A offset 1) + main pill rounded ╭─╮ bg primary #7B6DF6 fg background bold `✦ New Chat`
  - Search: rounded pill ╭─╮ border subtle bg element #1A1A1E `○ Search ⌘P`
  - Sessions: `● Sessions · {count} /s`, rows with ● recent / ○ old, title 22 chars, timeAgo short `52m` + id slice 4-12, alternating bg panel/background
  - Footer: `○ {directory}`
- Main center: maxWidth 78 outer, inner 72, gap 1 (compact)
  - Old banner compact + title + subtitle
  - Prompt: shadow layer bg #08080A + main rounded ╭─╮ border #242428 bg element #1A1A1E, left accent? Keep green left? Use border all rounded.
  - Hint: `○ tab agent · ⌘P search · ⌘L sessions` muted centered
  - Chips: 5 pills Landing Page / Knowledge / 3D Modeling / Mini Game / Personal Blog
    - Each: shadow layer + main rounded pill ╭─╮ border subtle bg element, `○` primary #7B6DF6 + label muted #8A8A93, hover primary
    - Layout flexWrap wrap gap 1 justify center marginTop 2
  - Narrow fallback: Recent 4 with rounded pill border subtle
  - Footer: `○ new chat keeps sessions alive · {version} · workstation`

## Inside (Session) - Like Outside
- Header: traffic lights ● ● ● ○ + title, rounded ╭─╮ border subtle bg panel #111113 shadow behind
- YOU bubble: width 62% marginRight auto, column
  - Row: `● YOU ○`
  - Shadow: bg #08080A rounded border background
  - Main: marginTop -1, rounded ╭─╮ border subtle #1E1E22 or primary on hover, bg panel #111113, padding 1 2, text #F5F5F7 light
  - Files: pill rounded ○ File/Dir
- Assistant: row `● ARENA ○ {modelID}` + parts
- Prompt: shadow + rounded border #242428 bg element
- Footer: LSP MCP status

## Theme
Midnight: canvas #08080A, panel #111113, element #1A1A1E, line #242428, lineSoft #1E1E22, ink #F5F5F7, muted #8A8A93, dim #5A5A64, primary #7B6DF6, blue #A8A0FF, sage #4ADE80, sand #F5C87A, rose #F87171

## Markers
- Logo block 3 lines FOUND, not 6x
- Rounded ╭ FOUND, circle ● ○ FOUND
- New Chat + Search + Sessions FOUND
- Title "What can I build for you?" FOUND
- Version 1.0.0-arena.1 FOUND, no Update popup (patched app.tsx)
- YOU bubble width 62% marginRight auto FOUND, rounded
- No Context sidebar

## Build
- bun 1.3.5, OPENCODE_VERSION=1.0.0-arena.1, bun run script/build.ts --single → 147M binary, zip 50M
- PTY test wide 130: banner block, New Chat, Search, Sessions, chips, circles, rounded, no popup
- Install: curl zip → bin/opencode → ~/.local/bin + /usr/local/bin
