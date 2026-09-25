#!/usr/bin/env python3
"""Repoint an ELF's PT_INTERP at an absolute loader path, in place.

Termux has no /lib/ld-musl-*.so.1, so a musl binary can only run there if the
kernel itself is told where the loader lives. Handing the loader the program as
an argument (`ld-musl.so.1 --library-path ... prog`) does not work: the kernel
then reports the *loader* as /proc/self/exe, and bun's single-file payload
lookup silently falls back to plain bun.

So rewrite PT_INTERP instead, and park the longer string in the gap between two
PT_LOAD segments — that file range is never mapped into memory, so the loaded
image is untouched (bun's appended payload, at the very end of the file, stays
exactly where it was).

usage: patch-interp.py <elf> <absolute-interp-path>
"""

import struct
import sys

PT_LOAD = 1
PT_INTERP = 3
PHDR_FMT = "<IIQQQQQQ"


def die(msg):
    sys.exit("patch-interp: " + msg)


def main():
    if len(sys.argv) != 3:
        die("usage: patch-interp.py <elf> <absolute-interp-path>")
    path, interp = sys.argv[1], sys.argv[2]
    if not interp.startswith("/"):
        die("interpreter must be an absolute path")
    payload = interp.encode() + b"\0"

    with open(path, "r+b") as f:
        header = f.read(64)
        if header[:4] != b"\x7fELF":
            die("not an ELF file")
        if header[4] != 2 or header[5] != 1:
            die("only 64-bit little-endian ELF is supported")
        e_phoff, = struct.unpack_from("<Q", header, 0x20)
        e_phentsize, e_phnum = struct.unpack_from("<HH", header, 0x36)
        if e_phentsize != 56:
            die("unexpected program header size %d" % e_phentsize)

        f.seek(e_phoff)
        phdrs = [bytearray(f.read(e_phentsize)) for _ in range(e_phnum)]
        interp_idx = None
        loads = []
        for i, ph in enumerate(phdrs):
            (p_type, _flags, p_offset, p_vaddr, _paddr, p_filesz, _memsz, _align) = struct.unpack(
                PHDR_FMT, ph
            )
            if p_type == PT_INTERP:
                interp_idx = i
            elif p_type == PT_LOAD:
                loads.append((p_offset, p_filesz, p_vaddr))

        if interp_idx is None:
            die("no PT_INTERP — this binary is statically linked")
        if len(loads) < 2:
            die("need at least two PT_LOAD segments to find a gap")

        old = phdrs[interp_idx]
        (_, _, o_off, _, _, o_filesz, _, _) = struct.unpack(PHDR_FMT, old)
        f.seek(o_off)
        old_path = f.read(o_filesz).split(b"\0")[0].decode(errors="replace")
        if old_path == interp:
            print("already points at %s" % interp)
            return

        # Gaps between consecutive PT_LOAD file ranges are alignment padding:
        # never mapped, safe to reuse.
        loads.sort()
        holes = []
        for i in range(len(loads) - 1):
            start = loads[i][0] + loads[i][1]
            holes.append((start, loads[i + 1][0] - start))

        base_off, base_vaddr = loads[0][0], loads[0][2]
        target = None
        for start, size in holes:
            if size < len(payload):
                continue
            f.seek(start)
            if set(f.read(len(payload))) == {0}:
                target = start
                break
        if target is None:
            die("no %d-byte hole between segments for the new path" % len(payload))

        f.seek(target)
        f.write(payload)

        new_vaddr = base_vaddr + (target - base_off)
        struct.pack_into(
            PHDR_FMT, old, 0, PT_INTERP, 4, target, new_vaddr, new_vaddr, len(payload), len(payload), 1
        )
        f.seek(e_phoff + interp_idx * e_phentsize)
        f.write(old)

    print("interp: %s -> %s (%d bytes at file offset 0x%x)" % (old_path, interp, len(payload), target))


if __name__ == "__main__":
    main()
