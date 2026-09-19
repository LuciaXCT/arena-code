import { Arena } from "./index"

export namespace ArenaRuntime {
  export const name = Arena.name
  export const core = Arena.runtime
  export const capabilities = {
    agentLoop: true,
    tools: true,
    providers: true,
    sessions: true,
    permissions: true,
    mcp: true,
    skills: true,
    subAgents: true,
    compaction: true,
  } as const
}
