import { Flag } from "@/flag/flag"

export namespace Arena {
  export const enabled: boolean = undefined as any
  export const name = "arena"
  export const runtime = "opencode-core"
}

Object.defineProperty(Arena, "enabled", {
  get() {
    return Flag.ARENA
  },
  enumerable: true,
  configurable: true,
})

export { ArenaBattle } from "./battle"
export { ArenaLeaderboard } from "./leaderboard"
export { ArenaPlugin } from "./plugin"
