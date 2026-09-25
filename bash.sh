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

# single source of truth — defined before any branch reads it
IS_TERMUX=false
if [ -d "/data/data/com.termux" ] || [ "${ARENA_TERMUX:-}" = "1" ]; then
  IS_TERMUX=true
fi
BIN_DIR="${PREFIX:-}/bin"
[ "$IS_TERMUX" = true ] || BIN_DIR="$HOME/.local/bin"

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
  if [ "$IS_TERMUX" = true ]; then
    for F in "$PREFIX/bin/opencode" "$PREFIX/bin/arena"; do
      [ -f "$F" ] && rm -f "$F" && ok "removed $F"
    done
    [ -d "$PREFIX/lib/arena-bin" ] && rm -rf "$PREFIX/lib/arena-bin" && ok "removed $PREFIX/lib/arena-bin"
    [ -d "$PREFIX/lib/arena-musl" ] && rm -rf "$PREFIX/lib/arena-musl" && ok "removed $PREFIX/lib/arena-musl"
    LEGACY="$PREFIX/var/lib/proot-distro/installed-rootfs/alpine"
    if [ -d "$LEGACY" ]; then
      warn "old alpine rootfs found (~300 MB) — reclaim it: proot-distro remove alpine"
    fi
    warn "config left untouched: ~/.config/opencode"
    exit 0
  fi
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

if [ "$IS_TERMUX" = true ]; then
  ok "Termux (Android) detected — musl runtime, no distro needed"
elif grep -qi microsoft /proc/version 2>/dev/null; then
  ok "WSL detected"
else
  ok "$OS-$ARCH detected"
fi

# ─── 2/5 dependencies ───────────────────────────────────────
step "2/5" "Dependencies"

have curl || { err "curl is required — install it first"; exit 1; }

EXTRACT=""
have unzip   && EXTRACT="unzip"
[ -z "$EXTRACT" ] && have bsdtar && EXTRACT="bsdtar"
[ -z "$EXTRACT" ] && have python3 && EXTRACT="python3"
[ -z "$EXTRACT" ] && have busybox && EXTRACT="busybox-unzip"
if [ -z "$EXTRACT" ]; then
  if [ "$IS_TERMUX" = true ] && have pkg && ask_yn "install unzip via pkg?" Y; then
    pkg install -y unzip >/dev/null 2>&1 && EXTRACT="unzip"
  fi
fi
[ -z "$EXTRACT" ] && { err "need one of: unzip, bsdtar, python3, busybox (to unpack the zip)"; exit 1; }
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

if [ "$IS_TERMUX" = true ]; then
  ASSET="arena-code-$VER-linux-arm64-musl.zip"
else
  ASSET="arena-code-$VER-$OS-$ARCH.zip"
fi
BASE="https://github.com/$REPO/releases/download/$TAG"
ok "asset: $ASSET"

# ─── summary ────────────────────────────────────────────────
printf '\n%s── SUMMARY ──────────────────────────────%s\n' "$B" "$X"
printf '  version   : %s\n' "$TAG"
printf '  platform  : %s-%s\n' "$OS" "$ARCH"
if [ "$IS_TERMUX" = true ]; then
  printf '  binary    : $PREFIX/lib/arena-bin/opencode\n'
  printf '  runtime   : musl libs (~4 MB) + proot (~1 MB) — NO distro\n'
  printf '  launchers : $PREFIX/bin/opencode + $PREFIX/bin/arena\n'
else
  printf '  binary    : %s/%s\n' "$BIN_DIR" "$BIN_NAME"
fi
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
  busybox-unzip) mkdir -p "$TMP/x" && busybox unzip -o "$TMP/$ASSET" -d "$TMP/x" >/dev/null ;;
esac
BIN_SRC="$TMP/x/opencode"
[ -f "$BIN_SRC" ] || { err "unexpected zip layout — no opencode binary inside"; exit 1; }
ok "extracted"

# ─── 5/5 install ────────────────────────────────────────────
step "5/5" "Install"

if [ "$IS_TERMUX" = true ]; then
  ARENA_BIN="$PREFIX/lib/arena-bin"
  ARENA_LIB="$PREFIX/lib/arena-musl"

  # proot (~1 MB) — used ONLY to bind the few absolute paths the musl
  # binary expects (/etc/resolv.conf etc.). No distro, no rootfs.
  if ! have proot; then
    if ask_yn "install proot via pkg? (~1 MB — wires up DNS, nothing else)" Y; then
      pkg install -y proot >/dev/null 2>&1 \
        && ok "proot installed" \
        || { err "pkg install failed — run manually: pkg install proot"; exit 1; }
    else
      err "termux needs proot — aborting"; exit 1
    fi
  else
    ok "proot present"
  fi

  # musl runtime straight from alpine's CDN — ~4 MB total, no distro
  CDN="https://dl-cdn.alpinelinux.org/alpine/latest-stable/main/aarch64"
  TAR="tar"; have tar || TAR="busybox tar"
  mkdir -p "$ARENA_LIB" "$TMP/libs"
  for SPEC in "musl:musl-[0-9]" "libstdc++:libstdc\\+\\+-[0-9]" "libgcc:libgcc-[0-9]"; do
    NAME=${SPEC%%:*}; PAT=${SPEC#*:}
    APK=$(curl -fsSL -m 20 "$CDN/" | grep -oE "$PAT[^\"']*\.apk" | sort -Vu | tail -1)
    case "$NAME:$APK" in
      musl:)        APK=musl-1.2.5-r3.apk ;;
      libstdc++:)   APK='libstdc++-13.2.1_git20240309-r1.apk' ;;
      libgcc:)      APK=libgcc-13.2.1_git20240309-r1.apk ;;
    esac
    curl -fsSL -o "$TMP/libs/$NAME.apk" "$CDN/$APK" & SPID=$!
    spin "fetching $APK" $SPID
    wait $SPID || { err "download failed: $CDN/$APK"; exit 1; }
    $TAR -xzf "$TMP/libs/$NAME.apk" -C "$TMP/libs" 2>/dev/null \
      || { err "couldn't unpack $APK"; exit 1; }
  done
  cp -a "$TMP/libs/lib/." "$ARENA_LIB/" \
    && cp -a "$TMP/libs/usr/lib/." "$ARENA_LIB/" \
    && ok "musl runtime → $ARENA_LIB (~4 MB)" \
    || { err "musl runtime setup failed"; exit 1; }

  mkdir -p "$ARENA_BIN"
  if [ -f "$ARENA_BIN/opencode" ]; then
    BAK="$ARENA_BIN/opencode.arena-bak.$(date +%s)"
    cp "$ARENA_BIN/opencode" "$BAK" && warn "backed up old binary → $BAK"
  fi
  install -m 755 "$BIN_SRC" "$ARENA_BIN/opencode"
  ok "binary → $ARENA_BIN/opencode"

  [ -f "$PREFIX/etc/resolv.conf" ] || warn "$PREFIX/etc/resolv.conf missing — if DNS fails: pkg install resolv-conf"

  for L in opencode arena; do
    cat > "$PREFIX/bin/$L" <<LAUNCHER
#!/data/data/com.termux/files/usr/bin/sh
LIB="\$PREFIX/lib/arena-musl"
export TMPDIR="\$PREFIX/tmp"
mkdir -p "\$TMPDIR" 2>/dev/null
exec proot -0 \
  -b "\$PREFIX/etc/resolv.conf:/etc/resolv.conf" \
  -b "\$PREFIX/etc/hosts:/etc/hosts" \
  -b "\$PREFIX/tmp:/tmp" \
  -b "\$HOME:/root" \
  "\$LIB/ld-musl-aarch64.so.1" --library-path "\$LIB" "\$PREFIX/lib/arena-bin/opencode" "\$@"
LAUNCHER
    chmod +x "$PREFIX/bin/$L"
  done
  ok "launchers → \$PREFIX/bin/opencode + \$PREFIX/bin/arena"

  V=$("$PREFIX/bin/opencode" --version 2>/dev/null | head -1)
  if [ -n "$V" ]; then
    ok "verified: $V"
  else
    err "launcher failed — debug: proot -0 -b \"\$PREFIX/etc/resolv.conf:/etc/resolv.conf\" \"\$PREFIX/lib/arena-musl/ld-musl-aarch64.so.1\" --library-path \"\$PREFIX/lib/arena-musl\" \"\$PREFIX/lib/arena-bin/opencode\" --version"
    exit 1
  fi

else

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

fi  # end termux/native branch

# ─── done ───────────────────────────────────────────────────
printf '\n%s  ██████████████████████████████████%s\n' "$G" "$X"
printf '%s   ARENA CODE INSTALLED%s\n' "$B" "$X"
if [ "$IS_TERMUX" = true ]; then
  printf '%s   run:  opencode   (launches the musl runtime directly)%s\n' "$G" "$X"
  printf '%s   config: ~/.config/opencode — same as desktop%s\n' "$DM" "$X"
  printf '%s   overhead beyond the binary: ~6 MB — no distro, no rootfs%s\n' "$DM" "$X"
else
  printf '%s   run:  opencode   (or: arena)%s\n' "$G" "$X"
  printf '%s   config lives at ~/.config/opencode — untouched by this installer%s\n' "$DM" "$X"
fi
printf '%s   version: %s · no npm involved%s\n' "$DM" "$TAG" "$X"
printf '%s   uninstall: this script with --uninstall%s\n' "$DM" "$X"
printf '%s  ██████████████████████████████████%s\n\n' "$G" "$X"
