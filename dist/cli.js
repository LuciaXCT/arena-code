#!/usr/bin/env node

// src/cli.ts
import childProcess from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
var __dirname2 = path.dirname(fileURLToPath(import.meta.url));
process.env.ARENA = "1";
var projectDirectory = process.cwd();
var args = process.argv.slice(2);
var auto = args.includes("--auto");
var json = args.includes("--json");
var resumeIndex = args.indexOf("--resume");
if (resumeIndex >= 0 && (!args[resumeIndex + 1] || args[resumeIndex + 1].startsWith("-"))) {
  console.error("Arena: --resume requires a session ID");
  process.exit(1);
}
var resume = resumeIndex >= 0 ? args[resumeIndex + 1] : undefined;
var filtered = args.filter((arg, index) => {
  if (arg === "--auto" || arg === "--json")
    return false;
  if (resumeIndex >= 0 && (index === resumeIndex || index === resumeIndex + 1))
    return false;
  return true;
});
var modelIndex = filtered.findIndex((arg) => arg === "--model" || arg === "-m");
var inlineModelIndex = filtered.findIndex((arg) => arg.startsWith("--model="));
var model = modelIndex >= 0 ? filtered[modelIndex + 1] : inlineModelIndex >= 0 ? filtered[inlineModelIndex].slice(8) : undefined;
if (modelIndex >= 0 && (!model || model.startsWith("-")) || inlineModelIndex >= 0 && !model) {
  console.error("Arena: --model requires a model ID");
  process.exit(1);
}
var [requestedProvider, requestedModel] = model?.includes("/") ? model.split(/\/(.+)/) : ["ollama", model];
var localProvider = requestedProvider === "ollama" || requestedProvider === "lmstudio" ? requestedProvider : undefined;
var bareModel = localProvider ? requestedModel : undefined;
if (localProvider && bareModel) {
  const currentConfig = (() => {
    try {
      return JSON.parse(process.env.OPENCODE_CONFIG_CONTENT ?? "{}");
    } catch {
      return {};
    }
  })();
  currentConfig.model = `${localProvider}/${bareModel}`;
  currentConfig.provider = {
    ...currentConfig.provider ?? {},
    [localProvider]: {
      ...currentConfig.provider?.[localProvider] ?? {},
      name: localProvider === "ollama" ? "Ollama" : "LM Studio",
      api: currentConfig.provider?.[localProvider]?.api ?? (localProvider === "ollama" ? "http://127.0.0.1:11434/v1" : "http://127.0.0.1:1234/v1"),
      env: currentConfig.provider?.[localProvider]?.env ?? [],
      models: {
        ...currentConfig.provider?.[localProvider]?.models ?? {},
        [bareModel]: {
          id: bareModel,
          name: bareModel,
          tool_call: true,
          reasoning: true,
          temperature: true,
          attachment: false,
          modalities: { input: ["text"], output: ["text"] },
          cost: { input: 0, output: 0 },
          limit: { context: 32768, output: 8192 }
        }
      }
    }
  };
  process.env.OPENCODE_CONFIG_CONTENT = JSON.stringify(currentConfig);
  if (modelIndex >= 0)
    filtered[modelIndex + 1] = `${localProvider}/${bareModel}`;
  if (inlineModelIndex >= 0)
    filtered[inlineModelIndex] = `--model=${localProvider}/${bareModel}`;
}
var SUBCOMMANDS = new Set([
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
  "leaderboard"
]);
var valueOptions = new Set([
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
  "--command"
]);
var hasMessage = false;
var afterSeparator = false;
for (let index = 0;index < filtered.length; index++) {
  const arg = filtered[index];
  if (afterSeparator) {
    hasMessage = true;
    break;
  }
  if (arg === "--") {
    afterSeparator = true;
    continue;
  }
  if (valueOptions.has(arg)) {
    index++;
    continue;
  }
  if (arg.startsWith("--") && arg.includes("="))
    continue;
  if (!arg.startsWith("-")) {
    if (SUBCOMMANDS.has(arg))
      break;
    hasMessage = true;
    break;
  }
}
var command = ["run"];
if (json)
  command.push("--format", "json");
if (resume)
  command.push("--session", resume);
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
      "*git restore*": "deny"
    }
  });
}
var forwarded = hasMessage ? command.concat(filtered) : resume ? ["--session", resume, ...filtered] : filtered;
function findBun() {
  if (process.env.BUN)
    return process.env.BUN;
  if (process.execPath.endsWith("/bun") || process.execPath.endsWith("\\bun.exe"))
    return process.execPath;
  try {
    const which = childProcess.spawnSync("which", ["bun"], { encoding: "utf8" });
    if (which.status === 0 && which.stdout.trim())
      return which.stdout.trim();
  } catch {}
  return null;
}
function trySpawn(cmd, spawnArgs, opts) {
  const result = childProcess.spawnSync(cmd, spawnArgs, { stdio: "inherit", ...opts });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(typeof result.status === "number" ? result.status : 1);
}
if (process.env.OPENCODE_BIN_PATH && fs.existsSync(process.env.OPENCODE_BIN_PATH)) {
  trySpawn(process.env.OPENCODE_BIN_PATH, forwarded, { env: process.env });
}
var siblingBin = path.join(__dirname2, process.platform === "win32" ? "opencode.exe" : "opencode");
if (fs.existsSync(siblingBin)) {
  trySpawn(siblingBin, forwarded, { env: process.env });
}
var sourceCheckout = path.join(__dirname2, "../packages/opencode/src/index.ts");
var opencodeDir = path.join(__dirname2, "../packages/opencode");
if (fs.existsSync(sourceCheckout)) {
  const bun = findBun();
  if (bun) {
    trySpawn(bun, ["run", "--conditions=browser", sourceCheckout, ...forwarded], {
      cwd: opencodeDir,
      env: { ...process.env, ARENA_CWD: projectDirectory }
    });
  }
}
try {
  const which = childProcess.spawnSync("which", ["opencode"], { encoding: "utf8" });
  if (which.status === 0 && which.stdout.trim()) {
    trySpawn(which.stdout.trim(), forwarded, { env: process.env });
  }
} catch {}
console.error(`arena: could not find the opencode runtime.

` + `To use arena, you need one of:
` + `  1. Run from the arena-cli monorepo with bun installed
` + `  2. Have the opencode binary installed on your PATH
` + `  3. Set OPENCODE_BIN_PATH to the opencode binary

` + `Install bun: curl -fsSL https://bun.sh/install | bash
` + "Then clone and run: git clone https://github.com/k1ruuuu/arena-cli && cd arena-cli && bun dev");
process.exit(1);
