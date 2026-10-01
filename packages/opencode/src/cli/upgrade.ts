import { Bus } from "@/bus"
import { Config } from "@/config/config"
import { Flag } from "@/flag/flag"
import { Installation } from "@/installation"

export async function upgrade() {
  // Arena Code ships its own release channel, so the upstream opencode version
  // is not a valid upgrade target for this build. Skipping the check also keeps
  // the "Update Available" toast from covering the home screen.
  if (Flag.ARENA || Flag.isArena() || Installation.VERSION.includes("arena")) return

  const config = await Config.global()

  // Honour the opt-out before the network round-trip. Fetching `latest` first
  // meant every launch paid for a version check even when updates were turned
  // off, which is the common case for an Arena build.
  if (config.autoupdate === false || Flag.OPENCODE_DISABLE_AUTOUPDATE) {
    return
  }

  const method = await Installation.method()
  const latest = await Installation.latest(method).catch(() => {})
  if (!latest) return
  if (Installation.VERSION === latest) return

  if (config.autoupdate === "notify") {
    await Bus.publish(Installation.Event.UpdateAvailable, { version: latest })
    return
  }

  if (method === "unknown") return
  await Installation.upgrade(method, latest)
    .then(() => Bus.publish(Installation.Event.Updated, { version: latest }))
    .catch(() => {})
}
