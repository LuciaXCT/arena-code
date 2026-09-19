import { expect, test } from "bun:test"
import { chmod, mkdtemp, readFile, writeFile } from "fs/promises"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"

async function runArena(args: string[]) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "arena-cli-"))
  const fakeBun = path.join(dir, "bun")
  const output = path.join(dir, "args")
  await writeFile(
    fakeBun,
    `#!/bin/sh
printf '%s\\n' "$@" > "$ARENA_TEST_OUTPUT"
printf 'PERM=%s\\n' "$OPENCODE_PERMISSION" >> "$ARENA_TEST_OUTPUT"
`,
  )
  await chmod(fakeBun, 0o755)
  const result = spawnSync(process.execPath, [path.resolve(import.meta.dir, "../../bin/arena"), ...args], {
    env: { ...process.env, OPENCODE_BIN_PATH: fakeBun, ARENA_TEST_OUTPUT: output },
    encoding: "utf8",
  })
  expect(result.error).toBeUndefined()
  return readFile(output, "utf8")
}

test("maps bare model to local Ollama", async () => {
  const output = await runArena(["--model", "qwen", "fix bug"])
  expect(output).toContain("--model\nollama/qwen")
  expect(output).toContain("fix bug")
})

test("maps LM Studio model and preserves task", async () => {
  const output = await runArena(["--model=lmstudio/qwen", "refactor API"])
  expect(output).toContain("--model=lmstudio/qwen")
  expect(output).toContain("refactor API")
})

test("resume skips one-shot run command", async () => {
  const output = await runArena(["--resume", "session-1"])
  expect(output).not.toContain("\nrun\n")
  expect(output).toContain("--session\nsession-1")
})

test("auto mode blocks destructive git commands", async () => {
  const output = await runArena(["--auto", "task"])
  expect(output).toContain('"git commit*":"deny"')
  expect(output).toContain('"*git commit*":"deny"')
  expect(output).toContain('"*git*commit*":"deny"')
  expect(output).toContain('"git push*":"deny"')
  expect(output).toContain('"*git push*":"deny"')
  expect(output).toContain('"*.env":"deny"')
})

test("does not treat model option value as task", async () => {
  const output = await runArena(["--model", "qwen"])
  expect(output).not.toContain("\nrun\n")
  expect(output).toContain("--model\nollama/qwen")
})

test("maps json output to runtime format", async () => {
  const output = await runArena(["--json", "task"])
  expect(output).toContain("run\n--format\njson")
  expect(output).toContain("task")
})

test("published wrapper package uses ESM mode", async () => {
  const publish = await Bun.file(path.resolve(process.cwd(), "script/publish.ts")).text()
  expect(publish).toContain('type: "module"')
  expect(publish).toContain('arena: "./bin/arena"')
  expect(publish).toContain('bin/arena --version')
})

test("source fallback keeps caller project directory", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "arena-cwd-"))
  const result = spawnSync(process.execPath, [path.resolve(import.meta.dir, "../../bin/arena"), "--help"], {
    cwd: dir,
    env: { ...process.env, ARENA_CWD: undefined, OPENCODE_BIN_PATH: undefined, BUN: undefined, PATH: "" },
    encoding: "utf8",
  })
  expect(result.status).toBe(0)
  expect(result.stdout + result.stderr).toContain("arena completion")
}, 45000)
