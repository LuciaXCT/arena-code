#!/usr/bin/env node

/**
 * Arena CLI entrypoint.
 *
 * A tiny dependency-free wrapper (except `yaml`, installed with the package)
 * that prepares the Arena environment and delegates to the self-contained
 * Arena runtime binary. Resolution order:
 *
 *   1. ARENA_BIN_PATH env var (explicit path to the runtime binary)
 *   2. OPENCODE_BIN_PATH env var (legacy alias of the above)
 *   3. Platform package (@pawbxj/arena-cli-<os>-<arch>, an optionalDependency)
 *   4. Sibling `arena` binary (bundled distribution)
 *   5. Source checkout via bun (development: ../packages/opencode/src/index.ts)
 *
 * The wrapper intentionally does NOT depend on any opencode installation on
 * PATH: published distributions are self-contained. `--version` and `--help`
 * are answered locally without spawning the runtime.
 */

import childProcess from "node:child_process"
import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import { loadConfig, toOpenCodeConfig } from "./config"
import { ARENA_AGENT_TYPES } from "./modes"

// Injected by build.ts from package.json; falls back for `bun run src/cli.ts`.
const VERSION = process.env.ARENA_VERSION ?? "0.0.0-dev"

const HELP = `Arena CLI v${VERSION} — AI coding agent that works inside local repositories.

Usage:
  arena [options] [command] [message...]
  arena "fix the failing tests in src/auth"
  arena --model openrouter/qwen/qwen3-coder "refactor the API layer"

Commands:
  run            run with a message (default)
  battle         blind side-by-side battle between two models
  leaderboard    show local model Elo rankings
  plugin         manage Arena plugins
  models         list available models
  agent          manage agents
  auth           manage credentials

Options:
  -m, --model <provider/model>  model to use
  --auto                        auto-approve safe actions
  --json                        output JSON for run
  --resume <session>            continue a session
  -v, --version                 show version
  -h, --help                    show this help

Config: ~/.config/arena/config.yaml (override with ARENA_CONFIG).
Docs: https://github.com/k1ruuuu/arena-cli#readme
`

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Activate arena branding
process.env.ARENA = "1"
const projectDirectory = process.cwd()

// ─── Local flags (answered without the runtime) ──────────────────────────────

const rawArgs = process.argv.slice(2)
if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
  process.stdout.write(`${VERSION}\n`)
  process.exit(0)
}
if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  process.stdout.write(HELP)
  process.exit(0)
}

const arenaConfig = await loadConfig()
process.env.OPENCODE_CONFIG_CONTENT = JSON.stringify(toOpenCodeConfig(arenaConfig.config))
delete process.env.OPENCODE_CONFIG
process.env.ARENA_AGENT_TYPES = JSON.stringify(ARENA_AGENT_TYPES)

// ─── Argument parsing ──────────────────────────────────────────────────────────

const args = rawArgs
const auto = args.includes("--auto")
const json = args.includes("--json")
const resumeIndex = args.indexOf("--resume")
if (resumeIndex >= 0 && (!args[resumeIndex + 1] || args[resumeIndex + 1].startsWith("-"))) {
  console.error("Arena: --resume requires a session ID")
  process.exit(1)
}
const resume = resumeIndex >= 0 ? args[resumeIndex + 1] : undefined
const filtered = args.filter((arg, index) => {
  if (arg === "--auto" || arg === "--json") return false
  if (resumeIndex >= 0 && (index === resumeIndex || index === resumeIndex + 1)) return false
  return true
})

// Model resolution (auto-configure ollama/lmstudio providers)
const modelIndex = filtered.findIndex((arg) => arg === "--model" || arg === "-m")
const inlineModelIndex = filtered.findIndex((arg) => arg.startsWith("--model="))
const model =
  modelIndex >= 0 ? filtered[modelIndex + 1] : inlineModelIndex >= 0 ? filtered[inlineModelIndex].slice(8) : undefined
if ((modelIndex >= 0 && (!model || model.startsWith("-"))) || (inlineModelIndex >= 0 && !model)) {
  console.error("Arena: --model requires a model ID")
  process.exit(1)
}
const [requestedProvider, requestedModel] = model?.includes("/") ? model.split(/\/(.+)/) : ["ollama", model]
const localProvider = requestedProvider === "ollama" || requestedProvider === "lmstudio" ? requestedProvider : undefined
const bareModel = localProvider ? requestedModel : undefined
if (localProvider && bareModel) {
  const currentConfig = toOpenCodeConfig(arenaConfig.config) as {
    model?: string
    provider?: Record<string, Record<string, unknown>>
  }
  currentConfig.model = `${localProvider}/${bareModel}`
  currentConfig.provider = {
    ...(currentConfig.provider ?? {}),
    [localProvider]: {
      ...((currentConfig.provider?.[localProvider] as Record<string, unknown> | undefined) ?? {}),
      name: localProvider === "ollama" ? "Ollama" : "LM Studio",
      api:
        (currentConfig.provider?.[localProvider]?.api as string | undefined) ??
        (localProvider === "ollama" ? "http://127.0.0.1:11434/v1" : "http://127.0.0.1:1234/v1"),
      env: (currentConfig.provider?.[localProvider]?.env as string[] | undefined) ?? [],
      models: {
        ...((currentConfig.provider?.[localProvider]?.models as Record<string, unknown> | undefined) ?? {}),
        [bareModel]: {
          id: bareModel,
          name: bareModel,
          tool_call: true,
          reasoning: true,
          temperature: true,
          attachment: false,
          modalities: { input: ["text"], output: ["text"] },
          cost: { input: 0, output: 0 },
          limit: { context: 32768, output: 8192 },
        },
      },
    },
  }
  process.env.OPENCODE_CONFIG_CONTENT = JSON.stringify(currentConfig)
  if (modelIndex >= 0) filtered[modelIndex + 1] = `${localProvider}/${bareModel}`
  if (inlineModelIndex >= 0) filtered[inlineModelIndex] = `--model=${localProvider}/${bareModel}`
}

// ─── Subcommand / message detection ────────────────────────────────────────────

const SUBCOMMANDS = new Set([
  "run",
  "models",
  "agent",
  "auth",
  "acp",
  "mcp",
  "serve",
  "web",
  "stats",
  "export",
  "import",
  "github",
  "pr",
  "session",
  "upgrade",
  "uninstall",
  "completion",
  "debug",
  "attach",
  "battle",
  "leaderboard",
  "plugin",
])

const valueOptions = new Set([
  "--model",
  "-m",
  "--agent",
  "--format",
  "--file",
  "-f",
  "--title",
  "--attach",
  "--port",
  "--variant",
  "--command",
])
let hasMessage = false
let afterSeparator = false
for (let index = 0; index < filtered.length; index++) {
  const arg = filtered[index]
  if (afterSeparator) {
    hasMessage = true
    break
  }
  if (arg === "--") {
    afterSeparator = true
    continue
  }
  if (valueOptions.has(arg)) {
    index++
    continue
  }
  if (arg.startsWith("--") && arg.includes("=")) continue
  if (!arg.startsWith("-")) {
    if (SUBCOMMANDS.has(arg)) break
    hasMessage = true
    break
  }
}

const command = ["run"]
if (json) command.push("--format", "json")
if (resume) command.push("--session", resume)
if (auto) {
  process.env.OPENCODE_PERMISSION = JSON.stringify({
    "*": "allow",
    read: { "*.env": "deny", "*.env.*": "deny", "*.env.local": "deny" },
    bash: {
      "git commit*": "deny",
      "*git commit*": "deny",
      "*git*commit*": "deny",
      "git push*": "deny",
      "*git push*": "deny",
      "*git*push*": "deny",
      "git reset --hard*": "deny",
      "*git reset --hard*": "deny",
      "*git*reset --hard*": "deny",
      "git clean*": "deny",
      "*git clean*": "deny",
      "git checkout --*": "deny",
      "*git checkout --*": "deny",
      "git restore*": "deny",
      "*git restore*": "deny",
    },
  })
}

const forwarded = hasMessage ? command.concat(filtered) : resume ? ["--session", resume, ...filtered] : filtered

// ─── Runtime resolution (self-contained, no PATH dependency) ───────────────────

function platformSlug(): string | null {
  const os = process.platform === "win32" ? "win32" : process.platform
  const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : null
  if ((os !== "linux" && os !== "darwin" && os !== "win32") || !arch) return null
  return `${os}-${arch}`
}

function binaryName(): string {
  return process.platform === "win32" ? "arena.exe" : "arena"
}

function findBun() {
  if (process.env.BUN) return process.env.BUN
  if (process.execPath.endsWith("/bun") || process.execPath.endsWith("\\bun.exe")) return process.execPath
  // Check PATH
  try {
    const which = childProcess.spawnSync("which", ["bun"], { encoding: "utf8" })
    if (which.status === 0 && which.stdout.trim()) return which.stdout.trim()
  } catch {}
  return null
}

function trySpawn(cmd, spawnArgs, opts) {
  const result = childProcess.spawnSync(cmd, spawnArgs, { stdio: "inherit", ...opts })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  process.exit(typeof result.status === "number" ? result.status : 1)
}

// 1. Explicit binary path (ARENA_BIN_PATH preferred, OPENCODE_BIN_PATH legacy)
const explicitBin = process.env.ARENA_BIN_PATH ?? process.env.OPENCODE_BIN_PATH
if (explicitBin && fs.existsSync(explicitBin)) {
  trySpawn(explicitBin, forwarded, { env: process.env })
}

// 2. Platform package (optionalDependency, e.g. @pawbxj/arena-cli-linux-x64)
const slug = platformSlug()
if (slug) {
  try {
    const pkgPath = createRequire(import.meta.url).resolve(`@pawbxj/arena-cli-${slug}/package.json`)
    const candidate = path.join(path.dirname(pkgPath), "bin", binaryName())
    if (fs.existsSync(candidate)) {
      trySpawn(candidate, forwarded, { env: process.env })
    }
  } catch {}
}

// 3. Sibling arena binary (bundled distribution)
const siblingBin = path.join(__dirname, binaryName())
if (fs.existsSync(siblingBin)) {
  trySpawn(siblingBin, forwarded, { env: process.env })
}

// 4. Source checkout (development mode — requires bun)
const sourceCheckout = path.join(__dirname, "../packages/opencode/src/index.ts")
const opencodeDir = path.join(__dirname, "../packages/opencode")
if (fs.existsSync(sourceCheckout)) {
  const bun = findBun()
  if (bun) {
    trySpawn(bun, ["run", "--conditions=browser", sourceCheckout, ...forwarded], {
      cwd: opencodeDir,
      env: { ...process.env, ARENA_CWD: projectDirectory },
    })
  }
}

// Nothing found — the distribution is self-contained, so this means a broken install.
console.error(
  "arena: could not find the Arena runtime.\n\n" +
    "The installed package is missing its runtime binary. Reinstall to repair it:\n" +
    "  npm install -g @pawbxj/arena-cli@latest\n" +
    "or with Bun:\n" +
    "  bun install -g @pawbxj/arena-cli@latest\n\n" +
    "Advanced overrides:\n" +
    "  ARENA_BIN_PATH=/path/to/arena-binary arena ...\n" +
    "  (development) run from the arena-cli checkout with bun installed.",
)
process.exit(1)
