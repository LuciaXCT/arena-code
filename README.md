# Arena Code

**opencode v1.18.30 with the Arena Code session UI baked in.** — CodersTeam

A rebuilt opencode TUI: same engine, new body.

## What's different

| | stock opencode | Arena Code |
|---|---|---|
| User message | left bar, flat | **YOU** card — right-aligned, coral edge, panel fill |
| Assistant reply | anonymous | **ARENA** coral label above the body |
| Composer | plain | coral top edge, placeholder **Ask Arena Code**, agent + `/ critic debate verify` footer |
| Header logo | OPENCODE wordmark | CTCODE banner art |
| Thinking | hidden by default | shown |
| Sidebar | OpenCode wordmark, 42 cols | **• Arena Code**, 28 cols |
| Colors | default theme | rides your `arena-code` theme (warm charcoal + coral) |

## Install (no npm needed)

Grab the binary from [Releases](../../releases):

```bash
curl -L -o opencode https://github.com/LuciaXCT/arena-code/releases/download/v1.18.30-arena.1/arena-code-1.18.30-linux-x64
chmod +x opencode
sudo mv opencode /usr/local/bin/opencode   # or anywhere on PATH
opencode
```

## Build from source

```bash
bun install
cd packages/opencode
MODELS_DEV_API_JSON=$(mktemp) OPENCODE_VERSION=1.18.30 OPENCODE_CHANNEL=latest \
  bun run build --single --skip-embed-web-ui
# → dist/opencode-linux-x64/bin/opencode
```

The arena-code edits live in:

- `packages/tui/src/logo.ts` — CTCODE banner
- `packages/tui/src/routes/session/index.tsx` — YOU card + ARENA label + coral code edge
- `packages/tui/src/component/prompt/index.tsx` — coral prompt edge, placeholder, footer
- `packages/tui/src/context/thinking.ts` — thinking shown
- `packages/tui/src/routes/session/sidebar.tsx` — Arena Code wordmark

Base: [sst/opencode](https://github.com/sst/opencode) v1.18.30 · upstream session renderer.
