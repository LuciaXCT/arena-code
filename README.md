# Arena Code

AI coding agent TUI — an [opencode](https://github.com/sst/opencode) fork with a minimalist
arena-soft interface, free-model auto-rotation, and zero npm involvement.

Current version: **`1.0.0-arena.1`**

---

## Install (bash — no npm)

One line:

```bash
curl -fsSL https://raw.githubusercontent.com/LuciaXCT/arena-code/main/bash.sh | bash
```

What it does:

1. Detects OS/arch (linux/darwin, x64/arm64, WSL-aware, Termux-aware)
2. Downloads `arena-code-<version>-<os>-<arch>.zip` from the latest Arena release
3. Verifies the sha256 checksum against the published `.sha256` file
4. Installs the single static binary to `~/.local/bin/opencode`
5. Optionally exposes it as `arena` and adds `~/.local/bin` to your PATH

Pin a version:

```bash
ARENA_VERSION=1.0.0-arena.1 curl -fsSL https://raw.githubusercontent.com/LuciaXCT/arena-code/main/bash.sh | bash
```

Re-run the same command to upgrade (old binary is backed up first).

Uninstall:

```bash
curl -fsSL https://raw.githubusercontent.com/LuciaXCT/arena-code/main/bash.sh | bash -s -- --uninstall
```

### Termux (Android)

Same one-liner, run inside Termux. The script detects Termux and takes a different lane —
**no distro, no rootfs, no proot-distro**:

1. Grabs just the three musl runtime libs (`ld-musl`, `libstdc++`, `libgcc`, ~4 MB total)
   straight from Alpine's CDN
2. Drops the `linux-arm64-musl` binary in `$PREFIX/lib/arena-bin/` and writes an `arena`
   launcher — and takes the `opencode` name **only if it's free**. An `opencode` you already
   have (a native Termux build, for instance) is left exactly as it is.
3. Only if the device hides `/etc/resolv.conf` (the usual case on Android), installs `proot`
   (~1 MB, asks first) plus `resolv-conf` so DNS can be bound — nothing else uses it

Android's bionic libc can't run the binary directly, so the launcher invokes the musl loader
explicitly: `ld-musl-aarch64.so.1 --library-path … opencode`. Total overhead beyond the
binary is **~4 MB** bare, or ~5 MB with the proot DNS lane — compare ~300 MB for a
proot-distro rootfs. Config lives at the normal `~/.config/opencode`, same as desktop.

Force either lane: `ARENA_PROOT=1` (always proot) or `ARENA_PROOT=0` (never).

Want arena to claim the `opencode` command anyway? `ARENA_TAKE_OPENCODE=1`.

Uninstall removes the `arena` launcher, the binary, and the musl libs — and only removes
`opencode` if that launcher is ours; your own binary is never touched.

### Something broke?

Run the doctor and paste the report file — it captures the environment, DNS setup, installed
files, launcher contents (binaries are fingerprinted, never dumped), an exec test with rc +
stderr, and a connectivity check:

```bash
curl -fsSL https://raw.githubusercontent.com/LuciaXCT/arena-code/main/bash.sh | bash -s -- --doctor
cat ~/arena-doctor.txt
```

It writes `~/arena-doctor.txt` and keeps the terminal to five lines, so it's safe on a phone
screen.

`bash -s -- --help` lists all flags and env knobs (`ARENA_VERSION`, `ARENA_PROOT`,
`ARENA_TAKE_OPENCODE`).

### Why not npm?

The npm `arena` and `opencode` packages are different tools. Installing this project through
npm would collide with them. Arena Code ships as one static binary — no node, no npm, no
package manager. Your `~/.config/opencode` config is never touched by the installer.

---

## Run

```bash
opencode        # or: arena
```

First launch opens the TUI: the ARENA CODE banner, a scrollable session sidebar, and a taskbar
showing the active free model (e.g. `• 33 free my9model-free`).

### Free-model auto-rotation

Arena Code rotates across a catalog of free models when a provider dies mid-turn — rate
limits, overloads, idle timeouts. The turn replays on the next model instead of ending in an
error. Cooldowns per model and per provider keep dead lanes out of the rotation; the catalog
refreshes itself from your configured providers.

---

## Configuration

Arena Code reads standard opencode configuration from `~/.config/opencode/opencode.jsonc` /
`opencode.json`. Point providers at any OpenAI-compatible endpoint (9router, OpenRouter, kilo,
custom gateways), pick a default model, theme (`arena-soft` is the built-in look), and agents.

---

## Build from source

```bash
bun install
cd packages/opencode
OPENCODE_VERSION=1.0.0-arena.1 bun run ../../script/build.ts --single
# output: dist/opencode-linux-x64/bin/opencode
```

---

## Credits

Fork of [opencode](https://github.com/sst/opencode) — see [NOTICE](NOTICE) for attribution.
Licensed under the [MIT license](LICENSE).
