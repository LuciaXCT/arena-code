import { createMemo } from "solid-js"
import { useLocal } from "@tui/context/local"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { Flag } from "@/flag/flag"

const ARENA_TYPES = ["Battle", "DeepMode", "Side by side", "Direct"] as const

export function DialogAgent() {
  const local = useLocal()
  const dialog = useDialog()

  const options = createMemo(() =>
    (Flag.ARENA ? ARENA_TYPES.map((name) => ({ name, native: false })) : local.agent.list()).map((item) => {
      return {
        value: item.name,
        title: item.name,
        description: item.native ? "native" : "Arena mode",
      }
    }),
  )

  return (
    <DialogSelect
      title="Select agent"
      current={local.agent.current().name}
      options={options()}
      onSelect={(option) => {
        local.agent.set(option.value)
        dialog.clear()
      }}
    />
  )
}
