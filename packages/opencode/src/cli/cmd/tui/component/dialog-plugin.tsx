import { createMemo, createSignal } from "solid-js"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect } from "@tui/ui/dialog-select"
import { DialogPrompt } from "@tui/ui/dialog-prompt"
import { DialogConfirm } from "@tui/ui/dialog-confirm"
import { useToast } from "@tui/ui/toast"
import { ArenaPlugin } from "@/arena/plugin"

type Scope = "user" | "project"
type Registry = Awaited<ReturnType<typeof ArenaPlugin.installedPlugins>>

function ScopePicker(props: { onPick: (scope: Scope) => void }) {
  return (
    <DialogSelect
      title="Install scope"
      options={[
        { title: "user", value: "user", description: "Available in every project" },
        { title: "project", value: "project", description: "Shared with this project" },
      ]}
      onSelect={(option) => props.onPick(option.value as Scope)}
    />
  )
}

export function DialogPlugin() {
  const dialog = useDialog()
  const toast = useToast()
  const [plugins, setPlugins] = createSignal<Registry | null>(null)

  const load = async () => {
    try {
      setPlugins(await ArenaPlugin.installedPlugins())
    } catch (error) {
      toast.error(error)
      setPlugins({})
    }
  }
  void load()

  const options = createMemo(() => {
    const installed = plugins() ?? {}
    return [
      ...Object.values(installed).map((item) => ({
        value: `plugin:${item.name}`,
        title: item.name,
        description: [item.version, item.scope].filter(Boolean).join(" · ") || undefined,
        footer: item.enabled ? "Enabled" : "Disabled",
        category: "Installed",
        onSelect: () => dialog.replace(() => <PluginDetail name={item.name} enabled={item.enabled} onDone={load} />),
      })),
      {
        value: "action:install",
        title: "Install plugin…",
        description: "From a marketplace, folder, git repo, or npm package",
        category: "Actions",
        onSelect: () => dialog.replace(() => <InstallFlow onDone={load} />),
      },
      {
        value: "action:update",
        title: "Update all",
        description: "Re-fetch every installed plugin from its source",
        category: "Actions",
        onSelect: async () => {
          try {
            await ArenaPlugin.update()
            toast.show({ message: "Plugins updated. Restart the session to load changes.", variant: "info" })
          } catch (error) {
            toast.error(error)
          }
          await load()
          dialog.replace(() => <DialogPlugin />)
        },
      },
      {
        value: "action:marketplaces",
        title: "Marketplaces…",
        description: "Add, list, update, or remove catalogs",
        category: "Actions",
        onSelect: () => dialog.replace(() => <MarketplaceFlow onDone={load} />),
      },
    ]
  })

  return <DialogSelect title="Plugins" options={options()} />
}

function PluginDetail(props: { name: string; enabled: boolean; onDone: () => Promise<void> }) {
  const dialog = useDialog()
  const toast = useToast()
  return (
    <DialogSelect
      title={props.name}
      options={[
        {
          title: props.enabled ? "Disable" : "Enable",
          value: "toggle",
          description: props.enabled ? "Hide its skills, commands, and agents" : "Show a permission summary first",
          onSelect: async () => {
            try {
              if (!props.enabled) {
                const summary = await ArenaPlugin.summary(props.name).catch(() => undefined)
                const detail = summary
                  ? `Skills: ${summary.validation.components.skills.map((x) => x.name).join(", ") || "none"}\nCommands: ${summary.validation.components.commands.map((x) => x.name).join(", ") || "none"}`
                  : props.name
                const confirmed = await DialogConfirm.show(dialog, `Enable ${props.name}?`, detail)
                if (!confirmed) return
              }
              await ArenaPlugin.setEnabled(props.name, !props.enabled, { yes: true })
              toast.show({ message: "Restart the session to apply.", variant: "info" })
            } catch (error) {
              toast.error(error)
            }
            await props.onDone()
            dialog.replace(() => <DialogPlugin />)
          },
        },
        {
          title: "Uninstall",
          value: "uninstall",
          description: "Remove files and registry entry",
          onSelect: async () => {
            const confirmed = await DialogConfirm.show(
              dialog,
              `Uninstall ${props.name}?`,
              "Files and registry entry are removed.",
            )
            if (!confirmed) return
            try {
              await ArenaPlugin.uninstall(props.name)
              toast.show({ message: `Uninstalled ${props.name}.`, variant: "info" })
            } catch (error) {
              toast.error(error)
            }
            await props.onDone()
            dialog.replace(() => <DialogPlugin />)
          },
        },
        {
          title: "Back",
          value: "back",
          onSelect: () => dialog.replace(() => <DialogPlugin />),
        },
      ]}
    />
  )
}

function InstallFlow(props: { onDone: () => Promise<void> }) {
  const dialog = useDialog()
  const toast = useToast()
  return (
    <DialogPrompt
      title="Install plugin"
      placeholder="name@marketplace, path, git URL, or npm:package"
      onConfirm={(ref) => {
        if (!ref.trim()) return
        dialog.replace(() => (
          <ScopePicker
            onPick={async (scope) => {
              try {
                const installed = await ArenaPlugin.install(ref.trim(), {
                  scope,
                  confirm: (summaryText) => DialogConfirm.show(dialog, "Install this plugin?", summaryText),
                })
                toast.show({
                  message: installed.enabled
                    ? "Installed. Restart the session to load it."
                    : "Installed disabled. Enable it from the manager.",
                  variant: "info",
                })
              } catch (error) {
                toast.error(error)
              }
              await props.onDone()
              dialog.replace(() => <DialogPlugin />)
            }}
          />
        ))
      }}
    />
  )
}

function MarketplaceFlow(props: { onDone: () => Promise<void> }) {
  const dialog = useDialog()
  const toast = useToast()
  const [catalogs, setCatalogs] = createSignal<Awaited<ReturnType<typeof ArenaPlugin.listMarketplaces>>>([])
  void ArenaPlugin.listMarketplaces().then(setCatalogs).catch(toast.error)
  const options = createMemo(() => [
    ...catalogs().map((item) => ({
      value: `marketplace:${item.name}`,
      title: item.name,
      description: item.source,
      category: "Marketplaces",
      onSelect: () => {},
    })),
    {
      value: "action:add",
      title: "Add marketplace…",
      description: "owner/repo, git URL, path, or JSON URL",
      category: "Actions",
      onSelect: () =>
        dialog.replace(() => (
          <DialogPrompt
            title="Add marketplace"
            placeholder="owner/repo, git URL, ./path, or https://…/marketplace.json"
            onConfirm={(source) => {
              if (!source.trim()) return
              dialog.replace(() => (
                <ScopePicker
                  onPick={async (scope) => {
                    try {
                      const name = await ArenaPlugin.addMarketplace(source.trim(), scope)
                      toast.show({ message: `Added marketplace ${name}.`, variant: "info" })
                    } catch (error) {
                      toast.error(error)
                    }
                    await props.onDone()
                    dialog.replace(() => <DialogPlugin />)
                  }}
                />
              ))
            }}
          />
        )),
    },
    {
      value: "action:update",
      title: "Update all marketplaces",
      description: "Refresh catalogs from their sources",
      category: "Actions",
      onSelect: async () => {
        try {
          await ArenaPlugin.updateMarketplace()
          toast.show({ message: "Marketplaces updated.", variant: "info" })
        } catch (error) {
          toast.error(error)
        }
        dialog.replace(() => <DialogPlugin />)
      },
    },
    {
      value: "action:back",
      title: "Back",
      category: "Actions",
      onSelect: () => dialog.replace(() => <DialogPlugin />),
    },
  ])
  return <DialogSelect title="Marketplaces" options={options()} />
}
