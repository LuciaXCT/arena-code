import { expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"

process.env.ARENA = "1"
const { Instance } = await import("../../src/project/instance")
const { Command } = await import("../../src/command/index")

test("skill argument-hint surfaces on slash commands", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".arena", "skills", "deploy")
      await fs.mkdir(skillDir, { recursive: true })
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---\nname: deploy\ndescription: Deploy things. Use when asked to deploy.\nargument-hint: "[env]"\narguments: target\n---\n\n# Deploy\n\nDeploy $target.\n`,
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const cmds = await Command.list()
      const deploy = cmds.find((x) => x.name === "deploy")
      expect(deploy).toBeDefined()
      expect(deploy?.argumentHint).toBe("[env]")
      const template = await deploy!.template
      expect(template).toContain("$1")
    },
  })
})

test("commands without hints omit argumentHint", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".arena", "skills", "plain")
      await fs.mkdir(skillDir, { recursive: true })
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---\nname: plain\ndescription: A plain skill.\n---\n\n# Plain\n`,
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const cmds = await Command.list()
      expect(cmds.find((x) => x.name === "plain")?.argumentHint).toBeUndefined()
    },
  })
})
