export const ARENA_AGENT_TYPES = ["Battle", "DeepMode", "Side by side", "Direct"] as const

export type ArenaAgentType = (typeof ARENA_AGENT_TYPES)[number]
