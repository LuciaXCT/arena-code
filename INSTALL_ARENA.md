# Arena Code 1.18.30 — Linux x64

Do not install the GitHub release `v1.18.30-arena.1`. That binary still boxes every
assistant reply in a coral stripe. This build does not. Linux x64 only.

## Install

```bash
unzip arena-code-1.18.30-linux-x64.zip
cd arena-code-1.18.30-linux-x64
install -m 755 opencode "$HOME/.local/bin/opencode"   # or any dir on PATH
hash -r
opencode --version    # expect: 1.18.30
```

Replace the OpenCode binary they launch. Keep the product name; the TUI already says
Arena Code. `arena-tui.patch` in this zip is the source change if a rebuild is ever needed.

## Behavior kit (Ctrl+P commands)

```bash
mkdir -p "$HOME/.config/opencode/agent" "$HOME/.config/opencode/command"
cp agents/*    "$HOME/.config/opencode/agent/"
cp commands/*  "$HOME/.config/opencode/command/"
```

Debate, critic, thinking, and brainstorm open from the command palette.

## Theme

The built-in theme `arena-code` is the default. `themes/arena-code.json` is only needed
as an override copy — move it aside if an older custom theme file exists under the
OpenCode config directory.

## What changed vs stock OpenCode

- Home keeps the existing welcome banner, then adds "What can I build for you?",
  "Interact with Arena Code", and chips Magic Design / Full-Stack / Write Code.
  A chip fills the composer; it never submits.
- Composer placeholder is "How can I help you today?"
- Session column is centered (max 78 columns). The rail is on the left and lists the
  six newest root sessions plus "+ New".
- A user message is a full right-aligned card at 70% width, labeled YOU.
- Assistant prose is open text, labeled ARENA on the latest part. Coral is only the
  left edge of a fenced code block.
- Thinking follows the palette toggle and starts hidden on new installs.

A terminal cannot do the serif type, rounded corners, or shadows of https://chat.z.ai/.
This is that layout translated into boxes, borders, and padding — about 70–90% likeness.

## Rebuild from source (Linux x64)

`arena-tui.patch` applies to commit `2536108379066d76d51d691b08c2984ee8630940` of
https://github.com/LuciaXCT/arena-code — not to a newer commit.

```bash
git clone https://github.com/LuciaXCT/arena-code && cd arena-code
git checkout 2536108379066d76d51d691b08c2984ee8630940
git apply /path/to/arena-tui.patch
curl -fsSL https://bun.sh/install | bash
export PATH="$HOME/.bun/bin:$PATH"
bun install --ignore-scripts
curl -fsSL -o /tmp/models.json https://models.dev/api.json
cd packages/opencode
MODELS_DEV_API_JSON=/tmp/models.json OPENCODE_VERSION=1.18.30 OPENCODE_CHANNEL=latest \
  bun run build --single --skip-embed-web-ui
install -m 755 dist/opencode-linux-x64/bin/opencode "$HOME/.local/bin/opencode"
```

`--single` builds the current machine only. `--skip-embed-web-ui` skips the browser app.
This task is the TUI, not a website.

## Do not

- Do not download `arena-code-1.18.30-linux-x64` from the GitHub release and call it this build.
- Do not start `arena-web` or any browser shell.
- Do not edit `packages/tui/src/logo.ts`. The banner stays as it is.
