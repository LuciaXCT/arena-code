#!/usr/bin/env python3
"""
pty-test.py — proves an Arena Code / OpenCode TUI build in a real terminal.

  python3 pty-test.py <binary> --theme ~/.config/opencode/themes/arena-emerald.json
      [--marker TXT] [--cfg XDG_CONFIG_HOME] [--cols 180] [--rows 40] [--work DIR] [--wait 70]

Run A: opens the TUI, types "Reply with exactly: <MARKER>", waits for the model reply.
Run B: CLOSES it, reopens in the same directory and asserts:
   1 resume   the previous conversation is on screen without typing anything
              (= "continue last session" works)
   2 palette  the exact ANSI true-colour triplets of YOUR theme json are emitted,
              derived from the file itself: background / backgroundPanel / text /
              textMuted / secondary (the user bubble). No hard-coded expectations.
   3 reply    the model answered (sent text stripped before matching)
   4 clean    no JS / render error strings
   5 layout   the chat column spans (almost) the full terminal width
Writes run B's raw capture to ./pty-capture.bin
"""
import fcntl
import json
import os
import pty
import re
import select
import struct
import subprocess
import sys
import termios
import time

ANSI = re.compile(rb"\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[=>]|\x1b.")


def strip(b):
    return ANSI.sub(b"", b)


def hx(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def resolve(theme_json, key, mode="dark"):
    """Follow defs / theme references exactly like the TUI does, return (r,g,b)."""
    defs = theme_json.get("defs", {})
    th = theme_json.get("theme", {})

    def go(v, depth=0):
        if depth > 8:
            return None
        if isinstance(v, dict):
            v = v.get(mode)
        if isinstance(v, str):
            if v.startswith("#"):
                return hx(v)
            if v in defs:
                return go(defs[v], depth + 1)
            if v in th:
                return go(th[v], depth + 1)
        return None

    return go(th.get(key))


def session(binary, cfg, work, cols, rows, send, settle, total):
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    env = {**os.environ, "TERM": "xterm-256color", "COLUMNS": str(cols), "LINES": str(rows)}
    if cfg:
        env["XDG_CONFIG_HOME"] = cfg
    p = subprocess.Popen([binary], stdin=slave, stdout=slave, stderr=slave,
                         cwd=work, env=env, close_fds=True)
    os.close(slave)
    raw = b""
    t0 = time.time()
    sent = False
    while time.time() - t0 < total:
        if not sent and send and time.time() - t0 > settle:
            os.write(master, send.encode())
            sent = True
        r, _, _ = select.select([master], [], [], 0.25)
        if r:
            try:
                chunk = os.read(master, 65536)
            except OSError:
                break
            if not chunk:
                break
            raw += chunk
    try:
        os.write(master, b"\x1b")
        time.sleep(0.4)
        os.write(master, b"/exit\r")
        time.sleep(0.8)
    except OSError:
        pass
    p.terminate()
    try:
        p.wait(timeout=5)
    except subprocess.TimeoutExpired:
        p.kill()
    os.close(master)
    return raw


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    binary = a[0]
    get = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    marker = get("--marker", "ARENAPONG")
    cfg = get("--cfg") or None
    cols = int(get("--cols", "180"))
    rows = int(get("--rows", "40"))
    work = get("--work") or "/tmp/ptywork"
    wait = int(get("--wait", "70"))
    theme_path = get("--theme")
    os.makedirs(work, exist_ok=True)
    print(f"binary={binary} size={os.path.getsize(binary)} marker={marker} cols={cols}x{rows}")

    rawA = session(binary, cfg, work, cols, rows, f"Reply with exactly: {marker}\r", 10, wait)
    txtA = strip(rawA).decode("utf8", "replace")
    answeredA = marker in txtA.replace(f"Reply with exactly: {marker}", "")

    rawB = session(binary, cfg, work, cols, rows, None, 14, 24)
    txtB = strip(rawB).decode("utf8", "replace")
    open("pty-capture.bin", "wb").write(rawB)

    res = []
    res.append(("reopen continues the last session", marker in txtB))
    res.append(("model reply arrived", answeredA))

    if theme_path and os.path.exists(theme_path):
        tj = json.load(open(theme_path))
        for key, label in (("background", "canvas/background"),
                           ("backgroundPanel", "chat panel"),
                           ("text", "main text"),
                           ("textMuted", "muted text"),
                           ("secondary", "user bubble bg")):
            rgb = resolve(tj, key)
            if not rgb:
                res.append((f"theme key {key} resolves", False))
                continue
            pat = f"48;2;{rgb[0]};{rgb[1]};{rgb[2]}".encode()
            pat2 = f"38;2;{rgb[0]};{rgb[1]};{rgb[2]}".encode()
            n = rawB.count(pat) + rawB.count(pat2)
            res.append((f"{label} = #{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X} on screen (n={n})", n > 0))
        pr = resolve(tj, "primary")
        if pr:
            n = rawB.count(f"48;2;{pr[0]};{pr[1]};{pr[2]}".encode()) + \
                rawB.count(f"38;2;{pr[0]};{pr[1]};{pr[2]}".encode())
            print(f"info  primary #{pr[0]:02X}{pr[1]:02X}{pr[2]:02X} n={n} "
                  "(only paints on active borders/selection — 0 is normal here)")
    else:
        print("info  no --theme given, palette checks skipped")

    errs = [s for s in ("ReferenceError", "TypeError", "is not defined", "Cannot read prop",
                        "undefined is not", "panic:", "Something went wrong") if s in txtB]
    res.append((f"no JS/render errors {errs if errs else ''}", not errs))

    addr = [int(b) for a, b in re.findall(rb"\x1b\[(\d+);(\d+)H", rawB)]
    addr += [int(c) for c in re.findall(rb"\x1b\[(\d+)G", rawB)]
    widest = max(addr) if addr else 0
    res.append((f"chat column spans full width (paints to column {widest} of {cols})",
                widest >= int(cols * 0.7)))

    print("-" * 66)
    bad = 0
    for name, ok in res:
        print(("PASS  " if ok else "FAIL  ") + name)
        bad += not ok
    print("-" * 66)
    print(f"{'ALL PASS' if not bad else str(bad) + ' FAILED'}   capture=pty-capture.bin "
          f"({os.path.getsize('pty-capture.bin')} bytes)")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
