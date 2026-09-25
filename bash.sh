#!/bin/bash
# Arena Code — bash installer (no npm, no node).
#
#   curl -fsSL https://raw.githubusercontent.com/LuciaXCT/arena-code/main/bash.sh | bash
#
# Pin a version:
#   ARENA_VERSION=1.0.0-arena.1 curl -fsSL ... | bash
#
# Uninstall:
#   curl -fsSL https://raw.githubusercontent.com/LuciaXCT/arena-code/main/bash.sh | bash -s -- --uninstall
#
# Installs a single static binary to ~/.local/bin/opencode (+ optional `arena` symlink).
# Does not touch ~/.config/opencode.

set -u

REPO="LuciaXCT/arena-code"
DEFAULT_TAG="v1.0.0-arena.1"
BIN_DIR="$HOME/.local/bin"
BIN_NAME="opencode"
SYM_NAME="arena"

# ─── palette ────────────────────────────────────────────────
if [ -t 1 ]; then
  R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; C=$'\e[36m'; B=$'\e[1m'; DM=$'\e[2m'; X=$'\e[0m'
else
  R=""; G=""; Y=""; C=""; B=""; DM=""; X=""
fi

# ─── helpers ────────────────────────────────────────────────
have() { command -v "$1" &>/dev/null; }

hr()   { printf '%s──────────────────────────────────────────────%s\n' "$DM" "$X"; }
step() { printf '\n%s[%s]%s %s\n' "$C" "$1" "$X" "$2"; }
ok()   { printf '%s  ✓ %s%s\n' "$G" "$1" "$X"; }
warn() { printf '%s  ! %s%s\n' "$Y" "$1" "$X"; }
err()  { printf '%s  ✗ %s%s\n' "$R" "$1" "$X"; }

# curl|bash is non-interactive by nature: stdin is the pipe, so `read`
# would eat the script. ask_yn only truly asks when both fds are a TTY.
INTERACTIVE=0
if [ -t 0 ] && [ -t 1 ]; then INTERACTIVE=1; fi

ask_yn() {
  local q="$1" def="${2:-Y}" a hint
  if [ "$INTERACTIVE" = 0 ]; then
    [ "$(printf '%s' "$def" | tr '[:upper:]' '[:lower:]')" = "y" ]
    return
  fi
  hint=$([ "$def" = "Y" ] && printf 'Y/n' || printf 'y/N')
  while true; do
    printf '%s? %s %s[%s]%s ' "$B" "$q" "$DM" "$hint" "$X"
    read -r a || a=""
    a=$(printf '%s' "$a" | tr '[:upper:]' '[:lower:]')
    [ -z "$a" ] && a=$(printf '%s' "$def" | tr '[:upper:]' '[:lower:]')
    case "$a" in
      y|yes) return 0 ;;
      n|no)  return 1 ;;
    esac
  done
}

spin() {
  local msg="$1" pid="$2" i=0 ch='|/-\' t=0
  while kill -0 "$pid" 2>/dev/null; do
    printf '\r%s [%s] %s' "$C" "${ch:i++%4:1}" "$msg"
    sleep 0.12; t=$((t+1)); [ $t -gt 1000 ] && break
  done
  printf '\r\033[K'
}

# never read stdin implicitly (sha256sum -c - would swallow the script
# in curl|bash mode) — always pass files as arguments.
sha_file() {
  if have sha256sum; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# ─── uninstall ──────────────────────────────────────────────
if [ "${1:-}" = "--uninstall" ]; then
  step "0/5" "Uninstall"
  for F in "$BIN_DIR/$BIN_NAME" "$BIN_DIR/$SYM_NAME"; do
    if [ -L "$F" ] || [ -f "$F" ]; then
      rm -f "$F" && ok "removed $F"
    fi
  done
  warn "config left untouched: ~/.config/opencode"
  exit 0
fi

# ─── banner ─────────────────────────────────────────────────
clear 2>/dev/null || true
COLS=$(tput cols 2>/dev/null || echo 80)
if [ "$COLS" -ge 60 ] 2>/dev/null; then
  printf '%s' "$C"
  cat <<'ART'
  █████╗ ██████╗ ███████╗███╗   ██╗ █████╗
 ██╔══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗
 ███████║██████╔╝█████╗  ██╔██╗ ██║███████║
 ██╔══██║██╔══██╗██╔══╝  ██║╚██╗██║██╔══██║
 ██║  ██║██║  ██║███████╗██║ ╚████║██║  ██║
 ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝
            C  O  D  E
ART
  printf '%s' "$X"
else
  printf '%s' "$C"
  cat <<'ART'
╔═════════════════════════╗
║   ARENA CODE · v1.0     ║
╚═════════════════════════╝
ART
  printf '%s' "$X"
fi
printf '%s   AI coding agent TUI · free-model auto-rotate · no npm%s\n\n' "$B" "$X"

# ─── 1/5 environment ────────────────────────────────────────
step "1/5" "Environment"

if [ -d "/data/data/com.termux" ]; then
  err "Termux is not supported — no prebuilt android binary"; exit 1
fi

OS_RAW=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS_RAW" in
  linux)  OS="linux" ;;
  darwin) OS="darwin" ;;
  *) err "unsupported OS: $OS_RAW (linux + darwin only)"; exit 1 ;;
esac

ARCH_RAW=$(uname -m)
case "$ARCH_RAW" in
  x86_64)          ARCH="x64" ;;
  aarch64|arm64)   ARCH="arm64" ;;
  *) err "unsupported architecture: $ARCH_RAW"; exit 1 ;;
esac

grep -qi microsoft /proc/version 2>/dev/null && ok "WSL detected" || ok "$OS-$ARCH detected"

# ─── 2/5 dependencies ───────────────────────────────────────
step "2/5" "Dependencies"

have curl || { err "curl is required — install it first"; exit 1; }

EXTRACT=""
have unzip   && EXTRACT="unzip"
[ -z "$EXTRACT" ] && have bsdtar && EXTRACT="bsdtar"
[ -z "$EXTRACT" ] && have python3 && EXTRACT="python3"
[ -z "$EXTRACT" ] && { err "need one of: unzip, bsdtar, python3 (to unpack the zip)"; exit 1; }
ok "curl + $EXTRACT ready"

# ─── 3/5 version ────────────────────────────────────────────
step "3/5" "Version"

TAG="${ARENA_VERSION:-}"
if [ -n "$TAG" ]; then
  ok "pinned by ARENA_VERSION: $TAG"
else
  # prefer Arena Code's own releases — the repo also carries upstream
  # leftover tags (v1.18.32-unguarded etc.) that must never win.
  TAG=$(curl -fsSL -m 15 "https://api.github.com/repos/$REPO/releases?per_page=30" \
        | grep -o '"tag_name": *"v[0-9.]*-arena[^"]*"' \
        | head -1 | cut -d'"' -f4)
  if [ -n "$TAG" ]; then
    ok "latest arena release: $TAG"
  else
    TAG="$DEFAULT_TAG"
    warn "couldn't reach the GitHub API — falling back to $DEFAULT_TAG"
  fi
fi
case "$TAG" in v*) ;; *) TAG="v$TAG" ;; esac
VER=${TAG#v}

ASSET="arena-code-$VER-$OS-$ARCH.zip"
BASE="https://github.com/$REPO/releases/download/$TAG"
ok "asset: $ASSET"

# ─── summary ────────────────────────────────────────────────
printf '\n%s── SUMMARY ──────────────────────────────%s\n' "$B" "$X"
printf '  version   : %s\n' "$TAG"
printf '  platform  : %s-%s\n' "$OS" "$ARCH"
printf '  binary    : %s/%s\n' "$BIN_DIR" "$BIN_NAME"
printf '  npm used  : no — single static binary\n'
hr
if [ "$INTERACTIVE" = 1 ]; then
  if ! ask_yn "install Arena Code $TAG?"; then
    err "aborted — nothing was written"; exit 1
  fi
fi

# ─── 4/5 download + verify ──────────────────────────────────
step "4/5" "Download + verify"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL --retry 3 --retry-delay 2 -o "$TMP/$ASSET" "$BASE/$ASSET" & SPID=$!
spin "downloading $ASSET (~50 MB)" $SPID
wait $SPID || { err "download failed — check $BASE"; exit 1; }
ok "zip downloaded"

curl -fsSL --retry 3 -o "$TMP/$ASSET.sha256" "$BASE/$ASSET.sha256" \
  || { err "checksum file missing for $TAG"; exit 1; }

WANT=$(cut -d' ' -f1 "$TMP/$ASSET.sha256" 2>/dev/null)
GOT=$(sha_file "$TMP/$ASSET")
if [ -z "$WANT" ] || [ "$WANT" != "$GOT" ]; then
  err "sha256 mismatch — want ${WANT:-???}, got $GOT"; exit 1
fi
ok "sha256 verified: ${GOT:0:16}…"

case "$EXTRACT" in
  unzip)   unzip -oq "$TMP/$ASSET" -d "$TMP/x" ;;
  bsdtar)  bsdtar -xf "$TMP/$ASSET" -C "$TMP/x" ;;
  python3) mkdir -p "$TMP/x" && python3 -m zipfile -e "$TMP/$ASSET" "$TMP/x" ;;
esac
BIN_SRC="$TMP/x/opencode"
[ -f "$BIN_SRC" ] || { err "unexpected zip layout — no opencode binary inside"; exit 1; }
ok "extracted"

# ─── 5/5 install ────────────────────────────────────────────
step "5/5" "Install"

mkdir -p "$BIN_DIR"

if [ -f "$BIN_DIR/$BIN_NAME" ]; then
  if cmp -s "$BIN_DIR/$BIN_NAME" "$BIN_SRC"; then
    ok "same version already installed — refreshing"
  else
    BAK="$BIN_DIR/$BIN_NAME.arena-bak.$(date +%s)"
    cp "$BIN_DIR/$BIN_NAME" "$BAK" && warn "backed up old binary → $BAK"
  fi
fi

install -m 755 "$BIN_SRC" "$BIN_DIR/$BIN_NAME"
ok "binary → $BIN_DIR/$BIN_NAME"

if ask_yn "also expose it as 'arena' ($BIN_DIR/$SYM_NAME)?" Y; then
  ln -sf "$BIN_DIR/$BIN_NAME" "$BIN_DIR/$SYM_NAME"
  ok "symlink → $BIN_DIR/$SYM_NAME"
fi

case ":$PATH:" in
  *":$BIN_DIR:"*)
    ok "$BIN_DIR already on PATH"
    ;;
  *)
    if ask_yn "add $BIN_DIR to PATH in your shell rc?" Y; then
      RC_ADDED=""
      for RC in "$HOME/.zshrc" "$HOME/.bashrc"; do
        [ -f "$RC" ] || continue
        grep -q "$BIN_DIR" "$RC" 2>/dev/null && continue
        printf '\n# Arena Code\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$RC"
        RC_ADDED="$RC_ADDED $RC"
      done
      if [ -n "$RC_ADDED" ]; then
        ok "PATH added to:$RC_ADDED — restart your shell (exec zsh / exec bash)"
      else
        warn "no rc file matched — add manually: export PATH=\"$BIN_DIR:\$PATH\""
      fi
    else
      warn "skipped — add manually: export PATH=\"$BIN_DIR:\$PATH\""
    fi
    ;;
esac

V=$("$BIN_DIR/$BIN_NAME" --version 2>/dev/null | head -1)
if [ -n "$V" ]; then
  ok "verified: $BIN_NAME $V"
else
  err "binary won't run — check $BIN_DIR/$BIN_NAME"; exit 1
fi

# ─── done ───────────────────────────────────────────────────
printf '\n%s  ██████████████████████████████████%s\n' "$G" "$X"
printf '%s   ARENA CODE INSTALLED%s\n' "$B" "$X"
printf '%s   run:  opencode   (or: arena)%s\n' "$G" "$X"
printf '%s   version: %s · no npm involved%s\n' "$DM" "$TAG" "$X"
printf '%s   uninstall: this script with --uninstall%s\n' "$DM" "$X"
printf '%s   config lives at ~/.config/opencode — untouched by this installer%s\n' "$DM" "$X"
printf '%s  ██████████████████████████████████%s\n\n' "$G" "$X"
