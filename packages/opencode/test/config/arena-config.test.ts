import { afterAll, expect, test } from "bun:test"
import path from "path"
import { tmpdir } from "../fixture/fixture"

process.env.ARENA = "1"
afterAll(() => delete process.env.ARENA)
const { Config } = await import("../../src/config/config")
const { Instance } = await import("../../src/project/instance")

test("Arena loads YAML config from project .arena", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, ".arena", "config.yaml"),
        ["model: test/arena-model", "username: arena-user"].join("\n"),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await Config.get()
      expect(config.model).toBe("test/arena-model")
      expect(config.username).toBe("arena-user")
      expect(await Bun.file(path.join(tmp.path, ".arena", "package.json")).exists()).toBe(false)
    },
  })
})

test("Config accepts boolean value for lsp", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, ".arena", "config.json"),
        JSON.stringify({
          lsp: true,
          username: "lsp-tester",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await Config.get()
      expect(config.lsp).toBeTruthy()
      expect(config.username).toBe("lsp-tester")
    },
  })
})

