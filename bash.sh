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
DEFAULT_TAG="v1.0.0-arena.2"
BIN_DIR="$HOME/.local/bin"
BIN_NAME="opencode"
SYM_NAME="arena"

# single source of truth — defined before any branch reads it
IS_TERMUX=false
if [ -d "/data/data/com.termux" ] || [ "${ARENA_TERMUX:-}" = "1" ]; then
  IS_TERMUX=true
fi

# Termux DNS: musl resolves through the absolute /etc/resolv.conf with no env
# override. If the device exposes one, the binary runs bare (zero extra
# packages). Otherwise a ~1 MB proot binds just that file — still no distro.
#   ARENA_PROOT=1 force proot   ARENA_PROOT=0 force no-proot
NEED_PROOT=false
if [ "$IS_TERMUX" = true ]; then
  NEED_PROOT=true
  if [ "${ARENA_PROOT:-auto}" = "0" ]; then
    NEED_PROOT=false
  elif [ "${ARENA_PROOT:-auto}" != "1" ] && [ -s /etc/resolv.conf ]; then
    NEED_PROOT=false
  fi
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

# never let a TUI take the terminal hostage when we only want --version
if have timeout; then
  TMO="timeout 10"
  # First launch of a ~140 MB bun binary under proot on a phone is SLOW —
  # never cut it off early. Raise it if needed: ARENA_TMO=180
  TMO_RUN="timeout ${ARENA_TMO:-90}"
else
  TMO=""; TMO_RUN=""
fi

# never read stdin implicitly (sha256sum -c - would swallow the script
# in curl|bash mode) — always pass files as arguments.
sha_file() {
  if have sha256sum; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

# any byte outside tab/lf/cr/printable in the first 512 → don't cat it
is_binary() {
  [ "$(LC_ALL=C head -c 512 "$1" 2>/dev/null | tr -d '\11\12\15\40-\176' | wc -c | tr -d ' ')" != "0" ]
}

# ─── help ───────────────────────────────────────────────────
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'HELP'
Arena Code — installer

  curl -fsSL https://raw.githubusercontent.com/LuciaXCT/arena-code/main/bash.sh | bash
      install or upgrade

  ... | bash -s -- --uninstall
      remove the binary, launchers and musl libs

  ... | bash -s -- --doctor
      print a debug report — paste it when something breaks

env knobs:
  ARENA_VERSION=1.0.0-arena.1   pin a specific release
  ARENA_PROOT=1                 termux: force the 1 MB proot DNS lane
  ARENA_PROOT=0                 termux: never use proot (no DNS without it)
  ARENA_TAKE_OPENCODE=1         termux: replace an existing `opencode` command
  ARENA_TMO=240                 termux: seconds to wait for the first launch (default 90)
  ARENA_TERMUX=1                pretend to be termux (testing)
HELP
  exit 0
fi

# ─── doctor ─────────────────────────────────────────────────
if [ "${1:-}" = "--doctor" ] || [ "${1:-}" = "--debug" ]; then
  DOCTMP="$(mktemp -d)"
  trap 'rm -rf "$DOCTMP"' EXIT
  REPORT="${ARENA_DOCTOR_FILE:-$HOME/arena-doctor.txt}"
  LAUNCHER="$BIN_DIR/$BIN_NAME"
  [ "$IS_TERMUX" = true ] && LAUNCHER="$PREFIX/bin/arena"
  # the whole report goes to a file — the phone screen stays clean
  {
  printf '── ARENA CODE DOCTOR ─────────────────────\n'
  printf 'date       : %s\n' "$(date)"
  printf 'uname      : %s\n' "$(uname -srm)"
  printf 'backend    : %s\n' "$([ "$IS_TERMUX" = true ] && printf termux || printf native)"
  [ -n "${PREFIX:-}" ] && printf 'prefix     : %s\n' "$PREFIX"
  printf 'home       : %s\n' "$HOME"
  printf 'dns lane   : %s\n' "$([ "$NEED_PROOT" = true ] && printf 'proot (~1 MB)' || printf 'bare (no proot)')"
  if [ "$IS_TERMUX" = true ]; then
    printf 'android    : %s (sdk %s)\n' "$(getprop ro.build.version.release 2>/dev/null)" "$(getprop ro.build.version.sdk 2>/dev/null)"
    printf 'resolv.conf: %s\n' "$([ -s /etc/resolv.conf ] && printf present || printf MISSING)"
    [ -r /etc/resolv.conf ] && sed 's/^/             /' /etc/resolv.conf
    printf 'dns prop   : %s\n' "$(getprop net.dns1 2>/dev/null)"
  fi
  printf 'tools      : '
  for T in curl unzip tar proot busybox python3; do have "$T" && printf '%s ' "$T"; done
  printf '\nstorage    : '
  df -h "$HOME" 2>/dev/null | tail -1 | awk '{print $4" free of "$2}'
  printf 'version    : %s\n' "$([ -f "$LAUNCHER" ] && $TMO "$LAUNCHER" --version 2>/dev/null | head -1 || true)"
  if [ "$IS_TERMUX" = true ]; then
    printf '\n%s— files —%s\n' "$DM" "$X"
    for F in "$PREFIX/lib/arena-bin/opencode" "$PREFIX/lib/arena-musl/ld-musl-aarch64.so.1" "$PREFIX/lib/arena-musl/libc.musl-aarch64.so.1" "$PREFIX/lib/arena-musl/libstdc++.so.6" "$PREFIX/lib/arena-musl/libgcc_s.so.1"; do
      if [ -e "$F" ]; then
        printf '  ok   %s (%s B)\n' "$F" "$(wc -c < "$F" 2>/dev/null | tr -d ' ')"
      else
        printf '  MISS %s\n' "$F"
      fi
    done
    LEGACY="$PREFIX/var/lib/proot-distro/installed-rootfs/alpine"
    [ -d "$LEGACY" ] && warn "legacy alpine rootfs present ($(du -sh "$LEGACY" 2>/dev/null | cut -f1)) — reclaim: proot-distro remove alpine"
    printf '\n%s— launchers —%s\n' "$DM" "$X"
    for L in "$PREFIX/bin/arena" "$PREFIX/bin/opencode"; do
      if [ ! -e "$L" ]; then printf '  MISS %s\n' "$L"; continue; fi
      if is_binary "$L"; then
        printf '  BIN  %s (%s B, sha256 %s)\n' "$L" "$(wc -c < "$L" | tr -d ' ')" "$(sha_file "$L" | cut -c1-16)"
        printf '       NOT ours — a foreign binary sits there (native build?)\n'
      else
        printf '  text %s\n' "$L"
        head -40 "$L" | sed 's/^/       /'
      fi
    done
  fi
  printf '\n%s— exec test —%s\n' "$DM" "$X"
  if [ "$IS_TERMUX" = true ]; then
    $TMO_RUN sh "$LAUNCHER" --version > "$DOCTMP/out" 2> "$DOCTMP/err"
  else
    $TMO "$LAUNCHER" --version > "$DOCTMP/out" 2> "$DOCTMP/err"
  fi
  RC=$?
  printf 'rc         : %s\n' "$RC"
  printf 'stdout     : %s\n' "$(head -c 300 "$DOCTMP/out" | tr '\n' ' ')"
  if [ "$RC" != "0" ]; then
    if [ -s "$DOCTMP/err" ]; then
      printf 'stderr:\n'
      tail -c 1200 "$DOCTMP/err" | sed 's/^/  /'
    fi
    if [ "$IS_TERMUX" = true ]; then
      printf 'trace (last 12):\n'
      $TMO sh -x "$LAUNCHER" --version 2>&1 | tail -12 | sed 's/^/  /'
    fi
  fi
  if [ "$IS_TERMUX" = true ]; then
    printf '\n— direct exec test (no proot) —\n'
    env -u LD_PRELOAD LD_LIBRARY_PATH="$PREFIX/lib/arena-musl" $TMO_RUN "$PREFIX/lib/arena-bin/opencode" --version 2>&1 | head -8 | sed 's/^/  /'
    printf 'interp     : %s\n' "$(grep -ao '[^[:cntrl:]]*/arena-musl/ld-musl-aarch64.so.1' "$PREFIX/lib/arena-bin/opencode" 2>/dev/null | head -1)"
    printf 'env preload: %s\n' "${LD_PRELOAD:-（none）}"
  fi
  printf '\n— net test —\n'
  printf 'api.github.com: %s\n' "$(curl -s -o /dev/null -w '%{http_code}' -m 8 https://api.github.com 2>/dev/null || printf FAIL)"
  printf '\nreport end.\n'
  } > "$REPORT" 2>&1

  printf '\n%s  doctor report saved%s\n' "$G" "$X"
  printf '  %s\n' "$REPORT"
  if [ "${RC:-1}" = "0" ]; then
    printf '%s  exec test: OK%s\n' "$G" "$X"
  else
    printf '%s  exec test: FAILED%s\n' "$R" "$X"
  fi
  printf '%s  send that file to the rat  (view: cat %s)%s\n\n' "$DM" "$REPORT" "$X"
  exit 0
fi

# ─── uninstall ──────────────────────────────────────────────
if [ "${1:-}" = "--uninstall" ]; then
  step "0/5" "Uninstall"
  if [ "$IS_TERMUX" = true ]; then
    [ -f "$PREFIX/bin/arena" ] && rm -f "$PREFIX/bin/arena" && ok "removed $PREFIX/bin/arena"
    OC="$PREFIX/bin/opencode"
    if [ -e "$OC" ] && grep -q "arena-musl" "$OC" 2>/dev/null; then
      rm -f "$OC" && ok "removed $OC"
    elif [ -e "$OC" ]; then
      warn "left $OC alone — that one isn't ours"
    fi
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
  ok "Termux (Android) detected — musl runtime, no distro"
  if [ "$NEED_PROOT" = true ]; then
    ok "device hides /etc/resolv.conf → proot (~1 MB) wires DNS"
  else
    ok "device exposes /etc/resolv.conf → runs bare, no proot"
  fi
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
  # Prefer Arena Code's own releases — the repo also carries upstream leftover
  # tags (v1.18.32-unguarded) and older arena tags whose assets are named
  # differently. Only accept a tag that actually publishes the asset we need.
  CANDIDATES=$(curl -fsSL -m 15 "https://api.github.com/repos/$REPO/releases?per_page=30" \
    | grep -o '"tag_name": *"v[0-9.]*-arena[^"]*"' \
    | cut -d'"' -f4 | head -6)
  for CAND in $CANDIDATES; do
    CVER=${CAND#v}
    if [ "$IS_TERMUX" = true ]; then
      CASSET="arena-code-$CVER-termux-arm64.zip"
    else
      CASSET="arena-code-$CVER-$OS-$ARCH.zip"
    fi
    if curl -fsIL -o /dev/null -m 15 "https://github.com/$REPO/releases/download/$CAND/$CASSET" 2>/dev/null; then
      TAG="$CAND"
      break
    fi
    warn "skipping $CAND — no $CASSET published"
  done
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
  # This build has PT_INTERP rewritten to the Termux loader path, so the
  # kernel runs it straight off the shelf — no loader invocation needed.
  ASSET="arena-code-$VER-termux-arm64.zip"
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
  if [ "$NEED_PROOT" = true ]; then
    printf '  runtime   : musl libs + proot (~5 MB) — NO distro\n'
  else
    printf '  runtime   : musl libs only (~4 MB) — NO proot, NO distro\n'
  fi
  printf '  launchers : $PREFIX/bin/arena  (opencode too, if the name was free)\n'
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

  # proot (~1 MB) — used ONLY when the device hides /etc/resolv.conf.
  # No distro, no rootfs — see NEED_PROOT above.
  if [ "$NEED_PROOT" = true ]; then
    if ! have proot; then
      if ask_yn "install proot via pkg? (~1 MB — wires up DNS only)" Y; then
        pkg install -y proot >/dev/null 2>&1 \
          && ok "proot installed" \
          || { err "pkg install failed — run manually: pkg install proot"; exit 1; }
      else
        err "this device hides /etc/resolv.conf, so DNS needs proot — aborting"
        err "(only ~1 MB, no distro — set ARENA_PROOT=0 to force no-proot)"
        exit 1
      fi
    else
      ok "proot present"
    fi

    # proot binds $PREFIX/etc/resolv.conf into the sandbox — make sure it exists
    if [ ! -f "$PREFIX/etc/resolv.conf" ]; then
      if ask_yn "install resolv-conf via pkg? (DNS source for the proot bind)" Y; then
        pkg install -y resolv-conf >/dev/null 2>&1 \
          && ok "resolv-conf installed" \
          || warn "resolv-conf failed — run manually: pkg install resolv-conf"
      else
        warn "no $PREFIX/etc/resolv.conf — DNS may fail; fix: pkg install resolv-conf"
      fi
    else
      ok "$PREFIX/etc/resolv.conf present"
    fi
  else
    ok "no proot needed — /etc/resolv.conf is readable"
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
  if grep -aq "/arena-musl/ld-musl-aarch64.so.1" "$ARENA_BIN/opencode" 2>/dev/null; then
    ok "interpreter → $ARENA_LIB/ld-musl-aarch64.so.1 (direct exec)"
  else
    warn "this asset isn't Termux-patched — tell the rat, don't just run it"
  fi

  write_launcher() {
    local pre=""
    if [ "$NEED_PROOT" = true ]; then
      pre='proot -0 -b "$PREFIX/etc/resolv.conf:/etc/resolv.conf" -b "$PREFIX/etc/hosts:/etc/hosts" -b "$PREFIX/tmp:/tmp" -b "$HOME:/root" '
    fi
    {
      echo '#!/data/data/com.termux/files/usr/bin/sh'
      # termux-exec preloads a bionic shim that musl's loader can't relocate
      # ("Error relocating ... __system_property_get: symbol not found").
      echo 'unset LD_PRELOAD LD_LIBRARY_PATH'
      echo 'LIB="$PREFIX/lib/arena-musl"'
      echo 'export LD_LIBRARY_PATH="$LIB"'
      echo 'export TMPDIR="$PREFIX/tmp"'
      echo 'mkdir -p "$TMPDIR" 2>/dev/null'
      echo "exec ${pre}\"\$PREFIX/lib/arena-bin/opencode\" \"\$@\""
    } > "$1"
    chmod +x "$1"
  }

  # 'arena' always. 'opencode' only when it's free or already ours — never
  # stomp a working opencode the phone already has (native termux builds exist)
  write_launcher "$PREFIX/bin/arena"
  ok "launcher → \$PREFIX/bin/arena"

  OC="$PREFIX/bin/opencode"
  if [ ! -e "$OC" ] || grep -q "arena-musl" "$OC" 2>/dev/null || [ "${ARENA_TAKE_OPENCODE:-}" = "1" ]; then
    write_launcher "$OC"
    ok "launcher → \$PREFIX/bin/opencode"
  else
    OCV=$($TMO "$OC" --version 2>/dev/null | head -1)
    OC_KEPT=1
    warn "kept your existing opencode${OCV:+ ($OCV)} — arena lives at 'arena'"
    warn "to take the name over: ARENA_TAKE_OPENCODE=1 rerun the installer"
  fi

  printf '  %s  first start can take a while on a phone — waiting up to %ss%s\n' "$DM" "${ARENA_TMO:-90}" "$X"
  VOUT="$TMP/vout"; VERR="$TMP/verr"
  $TMO_RUN "$PREFIX/bin/arena" --version > "$VOUT" 2> "$VERR"
  VRC=$?
  V=$(head -1 "$VOUT" 2>/dev/null)
  if [ -n "$V" ]; then
    ok "verified: $V"
  else
    err "launcher failed (rc=$VRC) — here's what it said:"
    if [ -s "$VERR" ]; then
      head -8 "$VERR" | sed 's/^/     /'
    else
      printf '     (no output at all — it hung or died silently)\n'
    fi
    # full context to a file so one paste is enough
    AUTO="$HOME/arena-doctor.txt"
    {
      printf '── ARENA CODE — install failure ────────────\n'
      printf 'date       : %s\n' "$(date)"
      printf 'uname      : %s\n' "$(uname -srm)"
      printf 'android    : %s (sdk %s)\n' "$(getprop ro.build.version.release 2>/dev/null)" "$(getprop ro.build.version.sdk 2>/dev/null)"
      printf 'prefix     : %s\n' "$PREFIX"
      printf 'dns lane   : %s\n' "$([ "$NEED_PROOT" = true ] && printf 'proot' || printf bare)"
      printf 'resolv.conf: %s\n' "$([ -s /etc/resolv.conf ] && printf present || printf MISSING)"
      printf 'rc         : %s\n' "$VRC"
      printf 'stdout     : %s\n' "$(head -c 300 "$VOUT" | tr '\n' ' ')"
      printf 'stderr     :\n'; head -20 "$VERR" | sed 's/^/  /'
      printf 'launcher   :\n'; head -20 "$PREFIX/bin/arena" | sed 's/^/  /'
      printf 'direct exec test (no proot):\n'
      env -u LD_PRELOAD LD_LIBRARY_PATH="$PREFIX/lib/arena-musl" $TMO_RUN "$PREFIX/lib/arena-bin/opencode" --version 2>&1 | head -8 | sed 's/^/  /'
      printf 'trace (last 15):\n'
      $TMO_RUN sh -x "$PREFIX/bin/arena" --version 2>&1 | tail -15 | sed 's/^/  /'
      printf 'report end.\n'
    } > "$AUTO" 2>&1
    err "full report → $AUTO"
    err "longer wait to try again: ARENA_TMO=240 rerun the installer"
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

V=$($TMO "$BIN_DIR/$BIN_NAME" --version 2>/dev/null | head -1)
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
  if [ "${OC_KEPT:-}" = "1" ]; then
    printf '%s   run:  arena   (your old `opencode` was left alone)%s\n' "$G" "$X"
  else
    printf '%s   run:  opencode   (launches the musl runtime directly)%s\n' "$G" "$X"
  fi
  printf '%s   config: ~/.config/opencode — same as desktop%s\n' "$DM" "$X"
  if [ "$NEED_PROOT" = true ]; then
    printf '%s   overhead: ~5 MB (musl libs + 1 MB proot) — no distro, no rootfs%s\n' "$DM" "$X"
  else
    printf '%s   overhead: ~4 MB (musl libs only) — no proot, no distro%s\n' "$DM" "$X"
  fi
else
  printf '%s   run:  opencode   (or: arena)%s\n' "$G" "$X"
  printf '%s   config lives at ~/.config/opencode — untouched by this installer%s\n' "$DM" "$X"
fi
printf '%s   version: %s · no npm involved%s\n' "$DM" "$TAG" "$X"
printf '%s   uninstall: this script with --uninstall%s\n' "$DM" "$X"
printf '%s  ██████████████████████████████████%s\n\n' "$G" "$X"
