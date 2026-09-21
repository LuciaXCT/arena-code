import { expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"

process.env.ARENA = "1"
const { ArenaPlugin } = await import("../../src/arena/plugin")
const { Instance } = await import("../../src/project/instance")
const { Skill } = await import("../../src/skill/skill")

async function makePlugin(root: string, name = "testplug") {
  const dir = path.join(root, name)
  await fs.mkdir(path.join(dir, ".claude-plugin"), { recursive: true })
  await fs.mkdir(path.join(dir, "skills", "hello"), { recursive: true })
  await fs.mkdir(path.join(dir, "commands"), { recursive: true })
  await Bun.write(
    path.join(dir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name, description: "A test plugin.", version: "1.0.0" }),
  )
  await Bun.write(
    path.join(dir, "skills", "hello", "SKILL.md"),
    `---\nname: hello\ndescription: Say hello from the test plugin. Use when asked to greet.\n---\n\n# Hello\n\nSay hello.\n`,
  )
  await Bun.write(path.join(dir, "commands", "hi.md"), `---\ndescription: Say hi.\n---\n\n# Hi\n\nSay hi $ARGUMENTS.\n`)
  return dir
}

test("validates a well-formed plugin directory", async () => {
  await using tmp = await tmpdir({ git: true })
  const dir = await makePlugin(tmp.path)
  const result = await ArenaPlugin.validate(dir)
  expect(result.errors).toEqual([])
  expect(result.components.skills.map((x) => x.name)).toContain("testplug:hello")
  expect(result.components.commands.map((x) => x.name)).toContain("testplug:hi")
})

test("rejects a skill without description", async () => {
  await using tmp = await tmpdir({ git: true })
  const dir = path.join(tmp.path, "badplug")
  await fs.mkdir(path.join(dir, "skills", "nope"), { recursive: true })
  await Bun.write(path.join(dir, "skills", "nope", "SKILL.md"), `---\nname: nope\n---\n\n# Nope\n\nNo description anywhere in frontmatter.\n`)
  const result = await ArenaPlugin.validate(dir)
  expect(result.errors.length).toBeGreaterThan(0)
})

test("installs from a local folder and discovers namespaced skills", async () => {
  await using tmp = await tmpdir({ git: true })
  const source = await makePlugin(path.join(tmp.path, "sources"))
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const installed = await ArenaPlugin.install(source, { scope: "project", confirm: async () => true })
      expect(installed.name).toBe("testplug")
      expect(installed.enabled).toBe(true)
      const plugins = await ArenaPlugin.installedPlugins()
      expect(plugins["testplug"]).toBeDefined()
      const skills = await Skill.all()
      expect(skills.find((x) => x.name === "testplug:hello")).toBeDefined()
      await ArenaPlugin.setEnabled("testplug", false, { yes: true })
      expect(await ArenaPlugin.isEnabled("testplug")).toBe(false)
      await ArenaPlugin.uninstall("testplug", "project")
      expect(await ArenaPlugin.installedPlugins().then((x) => x["testplug"])).toBeUndefined()
    },
  })
})

test("installs from a local marketplace", async () => {
  await using tmp = await tmpdir({ git: true })
  const marketDir = path.join(tmp.path, "market")
  await fs.mkdir(path.join(marketDir, ".claude-plugin"), { recursive: true })
  await makePlugin(path.join(marketDir, "plugins"))
  await Bun.write(
    path.join(marketDir, ".claude-plugin", "marketplace.json"),
    JSON.stringify({ name: "testmarket", plugins: [{ name: "testplug", source: "./plugins/testplug" }] }),
  )
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const name = await ArenaPlugin.addMarketplace(marketDir, "project")
      expect(name).toBe("testmarket")
      const installed = await ArenaPlugin.install("testplug@testmarket", { scope: "project", confirm: async () => true })
      expect(installed.name).toBe("testplug")
      expect(await ArenaPlugin.isEnabled("testplug")).toBe(true)
    },
  })
})
