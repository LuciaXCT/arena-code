import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import path from "node:path"

const cli = path.join(process.cwd(), "dist/cli.js")
const runtime = process.execPath

function run(...args: string[]) {
  return spawnSync(runtime, [cli, ...args], { encoding: "utf8" })
}

describe("Arena CLI wrapper", () => {
  it("reports version 0.0.9-dev without a runtime", () => {
    const result = run("--version")
    assert.equal(result.status, 0)
    assert.equal(result.stdout.trim(), "0.0.9-dev")
  })

  it("shows help without a runtime", () => {
    const result = run("--help")
    assert.equal(result.status, 0)
    assert.match(result.stdout, /Usage:/)
    assert.match(result.stdout, /arena/)
    assert.match(result.stdout, /Commands:/)
  })

  it("rejects --resume without a session ID", () => {
    const result = run("--resume")
    assert.equal(result.status, 1)
    assert.match(result.stderr, /--resume requires a session ID/)
  })

  it("rejects --model without a model ID", () => {
    const result = run("--model")
    assert.equal(result.status, 1)
    assert.match(result.stderr, /--model requires a model ID/)
  })
})
