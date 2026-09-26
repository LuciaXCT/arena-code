import os from "node:os"
import path from "node:path"
import fs from "node:fs"
import { createMemo, createSignal, For } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/solid"
import { useDialog } from "@tui/ui/dialog"
import { useKV } from "@tui/context/kv"
import { useTheme } from "@tui/context/theme"
import { useToast } from "@tui/ui/toast"
import { DialogProvider } from "@tui/component/dialog-provider"

const CATALOG = path.join(os.homedir(), ".config", "opencode", "arena-models.json")

// How many free lanes the rotation has ready. Read straight from the generated
// catalog so the number always matches what the taskbar shows later.
function freeModelCount() {
  try {
    const data = JSON.parse(fs.readFileSync(CATALOG, "utf8")) as {
      providers?: Record<string, Record<string, unknown>>
    }
    return Object.values(data.providers ?? {}).reduce((sum, models) => sum + Object.keys(models).length, 0)
  } catch {
    return 0
  }
}

// One-time welcome. Two ways in, chosen in a single keystroke: start on the
// free lanes, or wire up a provider. Nothing else to configure first.
export function DialogSetup() {
  const dialog = useDialog()
  const kv = useKV()
  const toast = useToast()
  const { theme } = useTheme()
  const free = freeModelCount()
  const [selected, setSelected] = createSignal(0)

  const choices = createMemo(() => [
    {
      title: "Start with free models",
      hint: free > 0 ? `no key · ${free} free models ready` : "no key needed",
    },
    {
      title: "Connect a provider",
      hint: "Claude, GPT, Gemini and 75+ more",
    },
  ])

  const choose = () => {
    kv.set("setup_done", true)
    if (selected() === 0) {
      dialog.clear()
      toast.show({
        message: free > 0 ? `Free models ready — ${free} lanes, just type` : "Free models ready — just type",
        variant: "info",
        duration: 4000,
      })
      return
    }
    dialog.replace(() => <DialogProvider />)
  }

  useKeyboard((evt) => {
    if (evt.name === "up" || evt.name === "k") {
      evt.preventDefault()
      setSelected((s) => (s - 1 + choices().length) % choices().length)
      return
    }
    if (evt.name === "down" || evt.name === "j") {
      evt.preventDefault()
      setSelected((s) => (s + 1) % choices().length)
      return
    }
    if (evt.name === "return" || evt.name === "enter") {
      evt.preventDefault()
      choose()
    }
  })

  return (
    <box paddingLeft={3} paddingRight={3} paddingBottom={1} gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={theme.text} attributes={TextAttributes.BOLD}>
          ◆ Arena Code
        </text>
        <text fg={theme.textMuted}>esc</text>
      </box>
      <box height={1} />
      <text fg={theme.textMuted}>Works out of the box — no API key required to begin.</text>
      <box height={1} />
      <For each={choices()}>
        {(choice, index) => {
          const active = createMemo(() => selected() === index())
          return (
            <box
              flexDirection="row"
              justifyContent="space-between"
              gap={2}
              backgroundColor={active() ? theme.backgroundElement : undefined}
              paddingLeft={1}
              paddingRight={1}
              onMouseOver={() => setSelected(index())}
              onMouseUp={() => {
                setSelected(index())
                choose()
              }}
            >
              <text fg={active() ? theme.primary : theme.text} attributes={active() ? TextAttributes.BOLD : undefined}>
                {choice.title}
              </text>
              <text fg={theme.textMuted}>{choice.hint}</text>
            </box>
          )
        }}
      </For>
      <box height={1} />
      <text fg={theme.textMuted}>
        ↑↓ choose · enter select · <span style={{ fg: theme.text }}>/connect</span> anytime
      </text>
    </box>
  )
}
