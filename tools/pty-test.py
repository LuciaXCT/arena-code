#!/usr/bin/env python3
"""
pty-test.py — ZERO-ERROR v4 — prove Arena Code TUI in a real PTY

What it does:
  Run A: opens binary in PTY, types "Reply with exactly: <MARKER>", waits for model
  Run B: closes, reopens same workdir, types NOTHING, checks:
    1 resume   last session is on screen (auto-continue)
    2 palette  exact ANSI triplets from YOUR theme JSON are on screen (no hard-code)
    3 reply    model answered (sent text stripped)
    4 clean    no JS errors
    5 layout   full-width paint (max cursor column >= 70% of cols)

Zero-error improvements:
  • Checks binary exists, size >10MB, executable before starting
  • Checks theme JSON exists and is valid before using it
  • Creates workdir if missing
  • Handles PTY errors gracefully with clear FAIL messages
  • Strips own echo before matching reply
  • Uses max cursor-addressed column, not raw line length (which is 7000+ due to TUI rendering)
  • Primary n=0 is INFO, not FAIL (paints only on active borders)

Usage (single lines):
  python3 ~/pty-test.py ~/oc-new-bin --theme ~/.config/opencode/themes/arena-noir.json --marker ARENAPONG --wait 80
  python3 ~/pty-test.py /usr/local/bin/opencode --theme ~/.config/opencode/themes/arena-emerald.json

Exit 0 = ALL PASS, 1 = FAILED
Writes pty-capture.bin (run B raw) for debugging
"""
import fcntl
import json
import os
import pathlib
import pty
import re
import select
import struct
import subprocess
import sys
import termios
import time

ANSI_RE = re.compile(rb"\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[=>]|\x1b.")
strip_ansi = lambda b: ANSI_RE.sub(b"", b)


def die(msg):
    print(f"FAIL  {msg}", file=sys.stderr)
    sys.exit(2)


def hx(s):
    s = s.lstrip("#")
    try:
        return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return None


def resolve_theme(theme_json, key, mode="dark"):
    defs = theme_json.get("defs", {})
    th = theme_json.get("theme", {})

    def go(v, depth=0):
        if depth > 10:
            return None
        if isinstance(v, dict):
            v = v.get(mode) or v.get("dark") or v.get("light")
        if isinstance(v, str):
            if v.startswith("#"):
                return hx(v)
            if v in defs:
                return go(defs[v], depth+1)
            if v in th:
                return go(th[v], depth+1)
        return None
    return go(th.get(key))


def check_binary(path):
    p = pathlib.Path(path).expanduser()
    if not p.exists():
        die(f"binary not found: {p}")
    if not p.is_file():
        die(f"not a file: {p}")
    try:
        sz = p.stat().st_size
    except Exception as e:
        die(f"cannot stat {p}: {e}")
    if sz < 10_000_000:
        die(f"binary too small ({sz}B) at {p} — expected >10MB, probably broken download")
    if not os.access(p, os.X_OK):
        print(f"WARN  {p} not executable — trying chmod +x")
        try:
            p.chmod(0o755)
        except Exception as e:
            die(f"cannot chmod +x {p}: {e}")
    return p, sz


def check_theme(path):
    if not path:
        return None
    p = pathlib.Path(path).expanduser()
    if not p.exists():
        print(f"WARN  theme not found: {p} — palette checks will be skipped")
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"WARN  theme {p} invalid JSON: {e} — palette checks skipped")
        return None
    if "theme" not in data:
        print(f"WARN  theme {p} missing 'theme' key — palette checks skipped")
        return None
    return data, p


def session(binary, cfg_dir, work_dir, cols, rows, send_text, settle, total):
    # Ensure workdir exists
    pathlib.Path(work_dir).mkdir(parents=True, exist_ok=True)

    try:
        master, slave = pty.openpty()
    except Exception as e:
        die(f"pty.openpty failed: {e}")

    try:
        fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    except Exception as e:
        print(f"WARN  TIOCSWINSZ failed: {e}")

    env = {**os.environ, "TERM": "xterm-256color", "COLUMNS": str(cols), "LINES": str(rows)}
    if cfg_dir:
        env["XDG_CONFIG_HOME"] = str(cfg_dir)

    try:
        proc = subprocess.Popen([str(binary)], stdin=slave, stdout=slave, stderr=slave,
                                cwd=str(work_dir), env=env, close_fds=True)
    except Exception as e:
        die(f"cannot start {binary}: {e}")

    os.close(slave)
    raw = b""
    t0 = time.time()
    sent = False

    while time.time() - t0 < total:
        if not sent and send_text and time.time() - t0 > settle:
            try:
                os.write(master, send_text.encode("utf-8", "replace"))
                sent = True
            except OSError:
                break
        r, _, _ = select.select([master], [], [], 0.25)
        if r:
            try:
                chunk = os.read(master, 65536)
            except OSError:
                break
            if not chunk:
                break
            raw += chunk

    # Graceful exit: ESC then /exit
    try:
        os.write(master, b"\x1b")
        time.sleep(0.35)
        os.write(master, b"/exit\r")
        time.sleep(0.9)
    except OSError:
        pass

    try:
        proc.terminate()
        proc.wait(timeout=4)
    except subprocess.TimeoutExpired:
        try:
            proc.kill()
        except Exception:
            pass
    except Exception:
        pass

    try:
        os.close(master)
    except Exception:
        pass

    return raw


def main():
    args = sys.argv[1:]
    if not args or "--help" in args or "-h" in args:
        print(__doc__)
        sys.exit(0)

    binary = args[0]
    def get(k, d=None):
        return args[args.index(k)+1] if k in args and args.index(k)+1 < len(args) else d

    marker = get("--marker", "ARENAPONG")
    cfg = get("--cfg")
    cols = int(get("--cols", "180"))
    rows = int(get("--rows", "40"))
    work = get("--work", "/tmp/ptywork")
    wait = int(get("--wait", "70"))
    theme_path = get("--theme")

    # Zero-error pre-checks
    bin_path, bin_size = check_binary(binary)
    theme_data = None
    theme_file = None
    if theme_path:
        res = check_theme(theme_path)
        if res:
            theme_data, theme_file = res

    print(f"binary={bin_path} size={bin_size} marker={marker} cols={cols}x{rows} work={work}")
    if theme_file:
        print(f"theme={theme_file}")

    # Run A: send prompt
    print(f"RUN A: typing 'Reply with exactly: {marker}' and waiting {wait}s for model...")
    rawA = session(bin_path, cfg, work, cols, rows, f"Reply with exactly: {marker}\r", 10, wait)
    txtA = strip_ansi(rawA).decode("utf-8", "replace")
    # Strip our own echo to avoid false PASS
    txtA_no_echo = txtA.replace(f"Reply with exactly: {marker}", "")
    answeredA = marker in txtA_no_echo

    # Run B: reopen, type nothing, check resume
    print(f"RUN B: reopening (no typing) to check auto-continue...")
    rawB = session(bin_path, cfg, work, cols, rows, None, 12, 24)
    txtB = strip_ansi(rawB).decode("utf-8", "replace")

    # Write capture
    cap_path = pathlib.Path("pty-capture.bin")
    try:
        cap_path.write_bytes(rawB)
    except Exception as e:
        print(f"WARN  cannot write {cap_path}: {e}")
        cap_path = pathlib.Path("/tmp/pty-capture.bin")
        cap_path.write_bytes(rawB)

    results = []
    results.append(("reopen continues the last session", marker in txtB))
    results.append(("model reply arrived", answeredA))

    if theme_data:
        for key, label in (("background", "canvas/background"),
                           ("backgroundPanel", "chat panel"),
                           ("text", "main text"),
                           ("textMuted", "muted text"),
                           ("secondary", "user bubble bg")):
            rgb = resolve_theme(theme_data, key)
            if not rgb:
                results.append((f"theme key {key} resolves", False))
                continue
            r, g, b = rgb
            # Count both bg and fg occurrences
            pat_bg = f"48;2;{r};{g};{b}".encode()
            pat_fg = f"38;2;{r};{g};{b}".encode()
            n = rawB.count(pat_bg) + rawB.count(pat_fg)
            results.append((f"{label} = #{r:02X}{g:02X}{b:02X} on screen (n={n})", n > 0))

        # Primary is informational — only paints on focused borders
        pr = resolve_theme(theme_data, "primary")
        if pr:
            r, g, b = pr
            n = rawB.count(f"48;2;{r};{g};{b}".encode()) + rawB.count(f"38;2;{r};{g};{b}".encode())
            print(f"info  primary #{r:02X}{g:02X}{b:02X} n={n} (paints only on active borders/selection — 0 is normal)")

    # Error strings that should never appear
    bad_strings = ["ReferenceError", "TypeError", "is not defined", "Cannot read prop",
                   "undefined is not", "panic:", "Something went wrong", "Color reference"]
    found_errs = [s for s in bad_strings if s in txtB]
    results.append((f"no JS/render errors {found_errs if found_errs else ''}", not found_errs))

    # Full-width check via cursor addressing
    cols_addr = [int(b) for a, b in re.findall(rb"\x1b\[(\d+);(\d+)H", rawB)]
    cols_addr += [int(c) for c in re.findall(rb"\x1b\[(\d+)G", rawB)]
    widest = max(cols_addr) if cols_addr else 0
    results.append((f"chat column spans full width (paints to column {widest} of {cols})",
                    widest >= int(cols * 0.7)))

    print("-" * 70)
    fails = 0
    for name, ok in results:
        print(("PASS  " if ok else "FAIL  ") + name)
        fails += 0 if ok else 1
    print("-" * 70)
    try:
        cap_size = cap_path.stat().st_size
    except Exception:
        cap_size = len(rawB)
    print(f"{'ALL PASS' if fails == 0 else f'{fails} FAILED'}   capture={cap_path} ({cap_size} bytes)")

    if fails:
        print("\nHINTS:")
        if not results[0][1]:
            print("  - resume FAIL: check routes/home.tsx auto-continue effect is intact")
        if not results[1][1]:
            print("  - reply FAIL: free-tier may be slow/rate-limited — re-run with --wait 90")
        if any("canvas" in n and not ok for n, ok in results):
            print("  - palette FAIL: theme JSON not loaded? Check ~/.config/opencode/opencode.jsonc has \"theme\": \"arena-...\"")
            print("  - also check: ls ~/.config/opencode/themes/ and cat the JSON")

    sys.exit(0 if fails == 0 else 1)


if __name__ == "__main__":
    main()
