import type { Argv } from "yargs"
import { UI } from "../ui"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { ArenaPlugin } from "@/arena/plugin"

function scopeOption(yargs: Argv) {
  return yargs.option("scope", {
    describe: "installation scope",
    type: "string",
    choices: ["user", "project"] as const,
    default: "user" as const,
  })
}

export const PluginCommand = cmd({
  command: "plugin",
  describe: "manage Arena plugins (Claude Code compatible)",
  builder: (yargs: Argv) =>
    yargs
      .command({
        command: "list",
        describe: "list installed plugins",
        builder: (y: Argv) => y.option("json", { describe: "output as JSON", type: "boolean", default: false }),
        handler: async (args: any) => bootstrap(process.cwd(), () => listPlugins(args.json)),
      })
      .command({
        command: "install <ref>",
        describe: "install a plugin from a marketplace, folder, git repo, or npm package",
        builder: (y: Argv) =>
          scopeOption(y)
            .positional("ref", { describe: "name[@marketplace], path, git URL, or npm:package", type: "string" })
            .option("yes", { describe: "skip the permission prompt", type: "boolean", default: false }),
        handler: async (args: any) => bootstrap(process.cwd(), () => installPlugin(args.ref, args)),
      })
      .command({
        command: "uninstall <name>",
        describe: "uninstall a plugin",
        builder: (y: Argv) =>
          scopeOption(y).positional("name", { describe: "installed plugin name", type: "string" }),
        handler: async (args: any) => bootstrap(process.cwd(), () => uninstallPlugin(args.name, args.scope)),
      })
      .command({
        command: "enable <name>",
        describe: "enable an installed plugin",
        builder: (y: Argv) =>
          y
            .positional("name", { describe: "installed plugin name", type: "string" })
            .option("yes", { describe: "skip the permission prompt", type: "boolean", default: false }),
        handler: async (args: any) => bootstrap(process.cwd(), () => setEnabled(args.name, true, args)),
      })
      .command({
        command: "disable <name>",
        describe: "disable an installed plugin",
        builder: (y: Argv) => y.positional("name", { describe: "installed plugin name", type: "string" }),
        handler: async (args: any) => bootstrap(process.cwd(), () => setEnabled(args.name, false, args)),
      })
      .command({
        command: "update [name]",
        describe: "update one or all plugins from their sources",
        builder: (y: Argv) => y.positional("name", { describe: "installed plugin name", type: "string" }),
        handler: async (args: any) => bootstrap(process.cwd(), () => updatePlugins(args.name)),
      })
      .command({
        command: "validate <path>",
        describe: "validate a plugin directory",
        builder: (y: Argv) =>
          y
            .positional("path", { describe: "plugin directory", type: "string" })
            .option("strict", { describe: "treat warnings as errors", type: "boolean", default: false }),
        handler: async (args: any) => bootstrap(process.cwd(), () => validatePlugin(args.path, args.strict)),
      })
      .command({
        command: "marketplace <action> [target]",
        describe: "manage plugin marketplaces",
        builder: (y: Argv) =>
          scopeOption(y)
            .positional("action", {
              describe: "marketplace action",
              type: "string",
              choices: ["add", "list", "remove", "update"] as const,
            })
            .positional("target", { describe: "marketplace source or name", type: "string" })
            .option("json", { describe: "output as JSON", type: "boolean", default: false }),
        handler: async (args: any) =>
          bootstrap(process.cwd(), () => marketplaceAction(args.action, args.target, args)),
      })
      .demandCommand(1, "Specify a plugin action: list, install, uninstall, enable, disable, update, validate, marketplace."),
  handler: () => {},
})

async function listPlugins(json: boolean) {
  const plugins = await ArenaPlugin.installedPlugins()
  const entries = Object.values(plugins)
  if (json) {
    process.stdout.write(JSON.stringify(entries, null, 2) + "\n")
    return
  }
  if (!entries.length) {
    UI.println("No plugins installed. Add a marketplace or install from a local folder, git repo, or npm package.")
    return
  }
  for (const item of entries) {
    const state = item.enabled ? "enabled" : "disabled"
    UI.println(`- ${item.name} [${state}, ${item.scope}] ${(item.version ?? "").trim()} (${item.source})`.replace("  ", " ").trim())
  }
}

async function installPlugin(ref: string | undefined, args: any) {
  if (!ref) {
    UI.error("Usage: arena plugin install <name[@marketplace]|path|git-url|npm:package> [--scope user|project] [--yes]")
    return
  }
  try {
    const result = await ArenaPlugin.install(ref, { scope: args.scope, yes: args.yes })
    UI.println(`Installed plugin ${result.name}${result.enabled ? "" : " (disabled)"}. Restart your session to load it.`)
  } catch (err) {
    if (err instanceof Error && err.message === "install cancelled") {
      UI.println("Install cancelled.")
      return
    }
    UI.error(err instanceof Error ? err.message : String(err))
  }
}

async function uninstallPlugin(name: string | undefined, scope: ArenaPlugin.Scope | undefined) {
  if (!name) {
    UI.error("Usage: arena plugin uninstall <name> [--scope user|project]")
    return
  }
  try {
    await ArenaPlugin.uninstall(name, scope)
    UI.println(`Uninstalled plugin ${name}.`)
  } catch (err) {
    UI.error(err instanceof Error ? err.message : String(err))
  }
}

async function setEnabled(name: string | undefined, enabled: boolean, args: any) {
  if (!name) {
    UI.error(`Usage: arena plugin ${enabled ? "enable" : "disable"} <name>`)
    return
  }
  try {
    await ArenaPlugin.setEnabled(name, enabled, { yes: args.yes })
    UI.println(`${enabled ? "Enabled" : "Disabled"} plugin ${name}. Restart your session to apply.`)
  } catch (err) {
    if (err instanceof Error && err.message === "enable cancelled") {
      UI.println("Cancelled.")
      return
    }
    UI.error(err instanceof Error ? err.message : String(err))
  }
}

async function updatePlugins(name: string | undefined) {
  try {
    await ArenaPlugin.update(name)
    UI.println(name ? `Updated plugin ${name}.` : "Updated all plugins.")
  } catch (err) {
    UI.error(err instanceof Error ? err.message : String(err))
  }
}

async function validatePlugin(target: string | undefined, strict: boolean) {
  if (!target) {
    UI.error("Usage: arena plugin validate <path> [--strict]")
    return
  }
  try {
    const result = await ArenaPlugin.validate(target)
    for (const warning of result.warnings) UI.println(`warning: ${warning}`)
    if (result.errors.length) {
      for (const error of result.errors) UI.error(error)
      return
    }
    if (strict && result.warnings.length) {
      UI.error("Validation failed in strict mode due to warnings.")
      return
    }
    UI.println("Validation passed" + (result.warnings.length ? " with warnings" : "") + ".")
  } catch (err) {
    UI.error(err instanceof Error ? err.message : String(err))
  }
}

async function marketplaceAction(action: string, target: string | undefined, args: any) {
  switch (action) {
    case "add": {
      if (!target) {
        UI.error("Usage: arena plugin marketplace add <owner/repo|git-url|path|url> [--scope user|project]")
        return
      }
      try {
        const name = await ArenaPlugin.addMarketplace(target, args.scope)
        UI.println(`Added marketplace ${name}.`)
      } catch (err) {
        UI.error(err instanceof Error ? err.message : String(err))
      }
      return
    }
    case "list": {
      const items = await ArenaPlugin.listMarketplaces()
      if (args.json) {
        process.stdout.write(JSON.stringify(items, null, 2) + "\n")
        return
      }
      if (!items.length) {
        UI.println("No marketplaces added.")
        return
      }
      for (const item of items) UI.println(`- ${item.name} (${item.source})`)
      return
    }
    case "remove": {
      if (!target) {
        UI.error("Usage: arena plugin marketplace remove <name>")
        return
      }
      try {
        await ArenaPlugin.removeMarketplace(target)
        UI.println(`Removed marketplace ${target}.`)
      } catch (err) {
        UI.error(err instanceof Error ? err.message : String(err))
      }
      return
    }
    case "update": {
      try {
        await ArenaPlugin.updateMarketplace(target)
        UI.println(target ? `Updated marketplace ${target}.` : "Updated all marketplaces.")
      } catch (err) {
        UI.error(err instanceof Error ? err.message : String(err))
      }
      return
    }
    default:
      UI.error("Usage: arena plugin marketplace <add|list|remove|update> [...]")
  }
}
