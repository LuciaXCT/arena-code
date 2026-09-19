import type { Argv } from "yargs"
import { UI } from "../ui"
import { cmd } from "./cmd"
import { ArenaLeaderboard } from "@/arena/leaderboard"

export const LeaderboardCommand = cmd({
  command: "leaderboard [category]",
  describe: "display the AI Model Leaderboard inspired by arena.ai (agent, code, overall, local)",
  builder: (yargs: Argv) =>
    yargs
      .positional("category", {
        describe: "leaderboard category: agent, code, overall, or local",
        type: "string",
        choices: ["agent", "code", "overall", "local"],
        default: "agent",
      })
      .option("category", {
        alias: ["c"],
        describe: "category: agent, code, overall, local",
        type: "string",
        choices: ["agent", "code", "overall", "local"],
      })
      .option("format", {
        describe: "output format: table or json",
        type: "string",
        choices: ["table", "json"],
        default: "table",
      }),
  handler: async (args) => {
    const category = (args.category || "agent") as ArenaLeaderboard.Category
    const entries = await ArenaLeaderboard.getLeaderboard(category)

    if (args.format === "json") {
      process.stdout.write(JSON.stringify(entries, null, 2) + "\n")
      return
    }

    const table = ArenaLeaderboard.formatTable(entries, category)
    UI.println(table)
  },
})
