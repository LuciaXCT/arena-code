import { afterAll, expect, test } from "bun:test"
import path from "path"
import fs from "fs/promises"
import { tmpdir } from "../fixture/fixture"

process.env.ARENA = "1"
afterAll(() => delete process.env.ARENA)
const { Skill } = await import("../../src/skill")
const { Instance } = await import("../../src/project/instance")

test("Arena discovers skills from .arena/skills", async () => {
  await using tmp = await tmpdir({
    git: true,
    init: async (dir) => {
      const skillDir = path.join(dir, ".arena", "skills", "arena-skill")
      await fs.mkdir(skillDir, { recursive: true })
      await Bun.write(
        path.join(skillDir, "SKILL.md"),
        `---\nname: arena-skill\ndescription: An Arena project skill.\n---\n\n# Arena Skill\n`,
      )
    },
  })

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const skills = await Skill.all()
      expect(skills.find((skill) => skill.name === "arena-skill")).toBeDefined()
    },
  })
})
