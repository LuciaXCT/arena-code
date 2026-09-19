import { expect, test } from "bun:test"
import { Log } from "../../src/util/log"
import { Global } from "../../src/global"

test("redacts credentials from log fields and messages", async () => {
  process.env.ARENA_TEST_SECRET = "secret-environment-value"
  try {
    await Log.init({ print: false, dev: true, level: "INFO" })
    Log.create({ service: "arena-redaction-test" }).info("Bearer secret-message api_key=inline-key", {
      apiKey: "secret-key",
      headers: { authorization: "Bearer secret-header" },
      nested: { password: "secret-password" },
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    const content = await Bun.file(`${Global.Path.log}/dev.log`).text()
    expect(content).not.toContain("secret-key")
    expect(content).not.toContain("secret-header")
    expect(content).not.toContain("secret-password")
    expect(content).not.toContain("secret-message")
    expect(content).not.toContain("secret-environment-value")
    expect(content).not.toContain("inline-key")
    expect(content).toContain("[REDACTED]")
  } finally {
    delete process.env.ARENA_TEST_SECRET
  }
})
