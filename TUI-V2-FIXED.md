# TUI v2.2 FIXED - crash fixed, title full, no Update popup, Recent Sessions cards clean

Fixed from screenshot:
- Title "What can I build for you?" was cut to "What can I build" -> fixed maxWidth 90, width 100% title box, full subtitle "Interact with Arena Code and explore the boundless creative world"
- Update Available popup overlapping title -> fixed by bumping OPENCODE_VERSION to 1.18.32-arena.1 (same as upstream 1.18.32, no update)
- Chips overlapping Recent Sessions header "Recent Sessions · 5 · /sessions -ctrl+xa l-Blog" -> fixed marginTop 2 chips, marginTop 3 recent, maxWidth 90, flexWrap wrap, shortened labels
- Cards garbled "ContinueNopencodeo-s-ses_...0kago" -> fixed column layout, Row1 Session + title 24chars, Row2 timeAgo · Continue opencode -s id 16... with proper gap and marginTop
- Left sidebar Context/LSP/Todo removed -> new minimal design, no sidebar, full chat centered
- Bubble 65% left, Index glitch fix, midnight #08080A #111113 #F5F5F7 #7B6DF6, full width 179/180, no JS errors

Binary 153374523 version 1.18.32-arena.1 verified via PTY:
- FOUND full title "What can I build for you?" (not cut)
- NO Update Available popup (GOOD)
- FOUND Recent Sessions, Landing Page, Personal Blog separate, opencode -s, NO GARBLED ContinueNopencodeo
- NO Context sidebar GOOD
- Full width 179/180 PASS, no errors PASS

Install: rm -rf /tmp/opencode /tmp/arena.zip && curl -sfL -o /tmp/arena.zip https://github.com/LuciaXCT/arena-code/releases/download/v1.0.0-arena.1/arena-code-1.0.0-arena.1-linux-x64.zip && unzip -oj /tmp/arena.zip "arena-code-1.0.0-arena.1/bin/opencode" -d /tmp/ && install -m 0755 /tmp/opencode ~/.local/bin/opencode && sudo install -m 0755 /tmp/opencode /usr/local/bin/opencode && ~/.local/bin/opencode --version
Then /exit + opencode
