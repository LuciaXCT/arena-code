import path from "path"
import os from "os"
import fs from "fs/promises"
import z from "zod"
import { Config } from "../config/config"
import { Instance } from "../project/instance"
import { Global } from "@/global"
import { Log } from "../util/log"
import { ConfigMarkdown } from "../config/markdown"

export namespace ArenaPlugin {
  const log = Log.create({ service: "arena-plugin" })

  export const Scope = z.enum(["user", "project"])
  export type Scope = z.infer<typeof Scope>

  const Author = z
    .object({ name: z.string().optional(), email: z.string().optional(), url: z.string().optional() })
    .catchall(z.any())

  export const Manifest = z
    .object({
      name: z.string().optional(),
      displayName: z.string().optional(),
      version: z.string().optional(),
      description: z.string().optional(),
      author: z.union([z.string(), Author]).optional(),
      homepage: z.string().optional(),
      repository: z.string().optional(),
      license: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      skills: z.union([z.string(), z.array(z.string())]).optional(),
      commands: z.union([z.string(), z.array(z.string())]).optional(),
      agents: z.union([z.string(), z.array(z.string())]).optional(),
      hooks: z.any().optional(),
      mcpServers: z.any().optional(),
      defaultEnabled: z.boolean().optional(),
    })
    .catchall(z.any())
  export type Manifest = z.infer<typeof Manifest>

  const MarketplaceSource = z.union([
    z.string(),
    z.object({ github: z.string(), ref: z.string().optional(), sha: z.string().optional() }),
    z.object({ url: z.string(), ref: z.string().optional(), sha: z.string().optional() }),
    z.object({ npm: z.string(), version: z.string().optional() }),
  ])

  export const MarketplaceEntry = z
    .object({ name: z.string(), source: MarketplaceSource, description: z.string().optional(), version: z.string().optional() })
    .catchall(z.any())
  export type MarketplaceEntry = z.infer<typeof MarketplaceEntry>

  export const MarketplaceFile = z
    .object({ name: z.string(), owner: z.any().optional(), plugins: z.array(MarketplaceEntry) })
    .catchall(z.any())
  export type MarketplaceFile = z.infer<typeof MarketplaceFile>

  const RegistryMarketplace = z.object({ source: z.string(), localPath: z.string() }).catchall(z.any())
  const RegistryPlugin = z
    .object({
      name: z.string(),
      scope: Scope,
      path: z.string(),
      enabled: z.boolean(),
      version: z.string().optional(),
      marketplace: z.string().optional(),
      source: z.string(),
    })
    .catchall(z.any())
  const RegistryFile = z.object({ marketplaces: z.record(z.string(), RegistryMarketplace).optional(), plugins: z.record(z.string(), RegistryPlugin).optional() }).catchall(z.any())
  type Registry = { marketplaces: Record<string, z.infer<typeof RegistryMarketplace>>; plugins: Record<string, z.infer<typeof RegistryPlugin>> }

  export function userDir() {
    return path.join(Global.Path.config, "plugins")
  }

  export function projectDir() {
    return path.join(Instance.worktree, ".arena", "plugins")
  }

  function userRegistryFile() {
    return path.join(Global.Path.config, "plugins.json")
  }

  function projectRegistryFile() {
    return path.join(Instance.worktree, ".arena", "plugins.json")
  }

  async function readRegistryFile(file: string): Promise<Registry> {
    const text = await Bun.file(file).text().catch(() => "")
    if (!text.trim()) return { marketplaces: {}, plugins: {} }
    const parsed = RegistryFile.safeParse(JSON.parse(text))
    if (!parsed.success) return { marketplaces: {}, plugins: {} }
    return { marketplaces: parsed.data.marketplaces ?? {}, plugins: parsed.data.plugins ?? {} }
  }

  export async function readRegistry(): Promise<Registry> {
    const user = await readRegistryFile(userRegistryFile())
    const project = await readRegistryFile(projectRegistryFile()).catch(() => ({ marketplaces: {}, plugins: {} }))
    return {
      marketplaces: { ...user.marketplaces, ...project.marketplaces },
      plugins: { ...user.plugins, ...project.plugins },
    }
  }

  async function writeRegistryFile(file: string, registry: Registry) {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await Bun.write(file, JSON.stringify(registry, null, 2))
  }

  async function writeRegistryEntry(scope: Scope, fn: (r: Registry) => void) {
    const file = scope === "user" ? userRegistryFile() : projectRegistryFile()
    const registry = await readRegistryFile(file)
    fn(registry)
    await writeRegistryFile(file, registry)
  }

  export async function manifestFor(dir: string): Promise<{ manifest: Manifest; file: string | null }> {
    for (const name of [".arena-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
      const file = path.join(dir, name)
      const text = await Bun.file(file).text().catch(() => "")
      if (!text.trim()) continue
      const parsed = Manifest.safeParse(JSON.parse(text))
      if (parsed.success) return { manifest: parsed.data, file }
    }
    return { manifest: {}, file: null }
  }

  function asList(value: string | string[] | undefined): string[] {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }

  function resolveDirs(root: string, entries: string[], fallback: string): string[] {
    const list = entries.length ? entries : [fallback]
    return list
      .map((x) => (path.isAbsolute(x) ? x : path.join(root, x)))
      .filter((x) => !x.includes(".."))
  }

  export interface Component {
    name: string
    file: string
    plugin: string
  }

  export interface Components {
    skills: Component[]
    commands: Component[]
    agents: Component[]
  }

  async function collectFiles(dirs: string[], glob: Bun.Glob): Promise<string[]> {
    const out: string[] = []
    for (const dir of dirs) {
      if (!(await fs.stat(dir).catch(() => undefined))) continue
      const matches = await Array.fromAsync(
        glob.scan({ cwd: dir, absolute: true, onlyFiles: true, followSymlinks: true, dot: true }),
      ).catch(() => [] as string[])
      out.push(...matches)
    }
    return out
  }

  const SKILL_GLOB = new Bun.Glob("*/SKILL.md")
  const MD_GLOB = new Bun.Glob("*.md")

  export async function componentsFor(pluginPath: string, pluginName: string): Promise<Components> {
    const { manifest } = await manifestFor(pluginPath)
    const skills: Component[] = []
    const commands: Component[] = []
    const agents: Component[] = []
    for (const dir of resolveDirs(pluginPath, asList(manifest.skills), "./skills")) {
      for (const file of await collectFiles([dir], SKILL_GLOB)) {
        skills.push({ name: `${pluginName}:${path.basename(path.dirname(file))}`, file, plugin: pluginName })
      }
    }
    for (const dir of resolveDirs(pluginPath, asList(manifest.commands), "./commands")) {
      for (const file of await collectFiles([dir], MD_GLOB)) {
        commands.push({ name: `${pluginName}:${path.basename(file, ".md")}`, file, plugin: pluginName })
      }
    }
    for (const dir of resolveDirs(pluginPath, asList(manifest.agents), "./agents")) {
      for (const file of await collectFiles([dir], MD_GLOB)) {
        agents.push({ name: `${pluginName}:${path.basename(file, ".md")}`, file, plugin: pluginName })
      }
    }
    return { skills, commands, agents }
  }

  export async function isEnabled(pluginName: string): Promise<boolean> {
    const registry = await readRegistry().catch(() => undefined)
    const entry = registry?.plugins[pluginName]
    return entry ? entry.enabled : true
  }

  export async function installedPlugins(): Promise<Registry["plugins"]> {
    return readRegistry().then((r) => r.plugins)
  }

  export interface Validation {
    errors: string[]
    warnings: string[]
    manifest: Manifest
    components: Components
  }

  export async function validate(dir: string, name?: string): Promise<Validation> {
    const errors: string[] = []
    const warnings: string[] = []
    const stat = await fs.stat(dir).catch(() => undefined)
    if (!stat || !stat.isDirectory()) return { errors: [`not a directory: ${dir}`], warnings, manifest: {}, components: { skills: [], commands: [], agents: [] } }
    const { manifest, file } = await manifestFor(dir)
    const pluginName = manifest.name ?? name ?? path.basename(dir)
    if (!file) warnings.push("missing .claude-plugin/plugin.json (or .arena-plugin/plugin.json); name derived from directory")
    if (manifest.name && !/^[a-z0-9-]+$/.test(manifest.name)) warnings.push(`manifest name "${manifest.name}" should be kebab-case`)
    const components = await componentsFor(dir, pluginName)
    if (!components.skills.length && !components.commands.length && !components.agents.length) {
      warnings.push("no skills, commands, or agents found in default locations")
    }
    for (const skill of components.skills) {
      const md = await ConfigMarkdown.parse(skill.file).catch(() => undefined)
      const description = typeof md?.data?.description === "string" ? md.data.description.trim() : ""
      if (!description) errors.push(`skill "${skill.name}" is missing a description`)
    }
    if (manifest.hooks) warnings.push("hooks are parsed but not executed by Arena yet")
    if (manifest.mcpServers) warnings.push("mcpServers are parsed but not registered by Arena yet")
    return { errors, warnings, manifest, components }
  }

  function githubUrl(repo: string) {
    return `https://github.com/${repo}.git`
  }

  function parseGithubShorthand(spec: string): { repo: string; ref?: string } | undefined {
    const match = spec.match(/^[\w.-]+\/[\w.-]+(@.+)?$/)
    if (!match) return undefined
    const at = spec.lastIndexOf("@")
    if (at > spec.indexOf("/")) return { repo: spec.slice(0, at), ref: spec.slice(at + 1) || undefined }
    return { repo: spec }
  }

  function isGitUrl(spec: string) {
    return spec.endsWith(".git") || spec.startsWith("git@") || spec.startsWith("ssh://") || /^https?:\/\/.+\.git(#.+)?$/.test(spec)
  }

  async function copyDir(from: string, to: string) {
    await fs.rm(to, { recursive: true, force: true })
    await fs.cp(from, to, { recursive: true })
  }

  async function run(cmd: string[], cwd?: string): Promise<{ code: number; out: string; err: string }> {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", cwd })
    const code = await proc.exited
    const out = proc.stdout && typeof proc.stdout !== "number" ? await new Response(proc.stdout).text() : ""
    const err = proc.stderr && typeof proc.stderr !== "number" ? await new Response(proc.stderr).text() : ""
    return { code, out, err }
  }

  async function cloneGit(url: string, ref: string | undefined, to: string) {
    await fs.rm(to, { recursive: true, force: true })
    const args = ["clone", "--depth", "1"]
    if (ref) args.push("--branch", ref)
    args.push(url, to)
    const result = await run(["git", ...args])
    if (result.code !== 0) throw new Error(`git clone failed: ${result.err.trim()}`)
    await fs.rm(path.join(to, ".git"), { recursive: true, force: true }).catch(() => {})
  }

  async function fetchNpm(spec: string, to: string) {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "arena-plugin-"))
    try {
      const packed = await run(["npm", "pack", spec, "--pack-destination", tmp])
      if (packed.code !== 0) throw new Error(`npm pack failed: ${packed.err.trim()}`)
      const entries = (await fs.readdir(tmp)).filter((x) => x.endsWith(".tgz"))
      if (!entries.length) throw new Error("npm pack produced no tarball")
      const extracted = await run(["tar", "-xzf", path.join(tmp, entries[0]), "-C", tmp])
      if (extracted.code !== 0) throw new Error("failed to extract npm tarball (tar required)")
      await copyDir(path.join(tmp, "package"), to)
    } finally {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => {})
    }
  }

  export type Fetched = { path: string; version?: string }

  async function fetchSource(source: string, workdir: string): Promise<Fetched> {
    const expanded = source.startsWith("~/") ? path.join(Global.Path.home, source.slice(2)) : source
    const stat = await fs.stat(expanded).catch(() => undefined)
    if (stat?.isDirectory()) return { path: expanded }
    if (specIsNpm(expanded)) {
      const to = path.join(workdir, "npm")
      await fetchNpm(expanded.replace(/^npm:/, ""), to)
      return { path: to }
    }
    const shorthand = parseGithubShorthand(expanded)
    if (shorthand && !expanded.includes("://")) {
      const to = path.join(workdir, "git")
      await cloneGit(githubUrl(shorthand.repo), shorthand.ref, to)
      return { path: to }
    }
    if (isGitUrl(expanded)) {
      const hash = expanded.lastIndexOf("#")
      const url = hash >= 0 ? expanded.slice(0, hash) : expanded
      const ref = hash >= 0 ? expanded.slice(hash + 1) || undefined : undefined
      const to = path.join(workdir, "git")
      await cloneGit(url, ref, to)
      return { path: to }
    }
    if (/^https?:\/\//.test(expanded)) {
      const res = await fetch(expanded)
      if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`)
      const to = path.join(workdir, "marketplace.json")
      await fs.mkdir(workdir, { recursive: true })
      await Bun.write(to, await res.text())
      return { path: to }
    }
    throw new Error(`unsupported plugin source: ${source}`)
  }

  function specIsNpm(spec: string) {
    return spec.startsWith("npm:") || /^@?[\w.-]+(\/[\w.-]+)?@[\w.-]+$/.test(spec)
  }

  async function readMarketplaceFile(file: string): Promise<MarketplaceFile> {
    const text = await Bun.file(file).text()
    const parsed = MarketplaceFile.safeParse(JSON.parse(text))
    if (!parsed.success) throw new Error(`invalid marketplace.json: ${file}`)
    return parsed.data
  }

  export async function marketplaceCatalog(name: string): Promise<{ file: MarketplaceFile; localPath: string } | undefined> {
    const registry = await readRegistry()
    const entry = registry.marketplaces[name]
    if (!entry) return undefined
    const stat = await fs.stat(entry.localPath).catch(() => undefined)
    if (!stat) return undefined
    const file = stat.isDirectory() ? path.join(entry.localPath, ".claude-plugin", "marketplace.json") : entry.localPath
    const alt = stat.isDirectory() ? path.join(entry.localPath, ".arena-plugin", "marketplace.json") : entry.localPath
    const resolved = (await fs.stat(file).catch(() => undefined)) ? file : alt
    return { file: await readMarketplaceFile(resolved), localPath: entry.localPath }
  }

  export async function addMarketplace(source: string, scope: Scope): Promise<string> {
    const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "arena-marketplace-"))
    try {
      const fetched = await fetchSource(source, workdir)
      const stat = await fs.stat(fetched.path)
      const dir = stat.isDirectory() ? fetched.path : path.dirname(fetched.path)
      const direct = stat.isDirectory() ? undefined : fetched.path.endsWith(".json") ? fetched.path : undefined
      const candidates = direct ? [direct] : [
        path.join(dir, ".claude-plugin", "marketplace.json"),
        path.join(dir, ".arena-plugin", "marketplace.json"),
      ]
      let catalog: MarketplaceFile | undefined
      let catalogPath: string | undefined
      for (const cand of candidates) {
        if (!(await fs.stat(cand).catch(() => undefined))) continue
        catalog = await readMarketplaceFile(cand)
        catalogPath = cand
        break
      }
      if (!catalog || !catalogPath) throw new Error(`no marketplace.json found in ${source}`)
      const cacheBase = scope === "user" ? path.join(Global.Path.config, "marketplaces") : path.join(Instance.worktree, ".arena", "marketplaces")
      const cache = path.join(cacheBase, catalog.name)
      if (stat.isDirectory() && !/^https?:\/\//.test(source) && !isGitUrl(source) && !parseGithubShorthand(source)) {
        await writeRegistryEntry(scope, (r) => {
          r.marketplaces[catalog!.name] = { source, localPath: path.resolve(dir) }
        })
      } else {
        await fs.mkdir(cacheBase, { recursive: true })
        if (stat.isDirectory()) await copyDir(dir, cache)
        else {
          await fs.mkdir(cache, { recursive: true })
          await copyDir(path.dirname(catalogPath), cache)
        }
        await writeRegistryEntry(scope, (r) => {
          r.marketplaces[catalog!.name] = { source, localPath: cache }
        })
      }
      return catalog.name
    } finally {
      await fs.rm(workdir, { recursive: true, force: true }).catch(() => {})
    }
  }

  export async function listMarketplaces() {
    const registry = await readRegistry()
    return Object.entries(registry.marketplaces).map(([name, entry]) => ({ name, ...entry }))
  }

  export async function removeMarketplace(name: string) {
    for (const scope of ["user", "project"] as Scope[]) {
      const file = scope === "user" ? userRegistryFile() : projectRegistryFile()
      const registry = await readRegistryFile(file)
      if (!registry.marketplaces[name]) continue
      const cached = registry.marketplaces[name].localPath
      const scopeBase = scope === "user" ? path.join(Global.Path.config, "marketplaces") : path.join(Instance.worktree, ".arena", "marketplaces")
      if (cached.startsWith(scopeBase)) await fs.rm(cached, { recursive: true, force: true }).catch(() => {})
      delete registry.marketplaces[name]
      await writeRegistryFile(file, registry)
      return
    }
    throw new Error(`marketplace not found: ${name}`)
  }

  export async function updateMarketplace(name?: string) {
    const registry = await readRegistry()
    const names = name ? [name] : Object.keys(registry.marketplaces)
    for (const item of names) {
      const entry = registry.marketplaces[item]
      if (!entry) throw new Error(`marketplace not found: ${item}`)
      if (entry.localPath.includes(`${path.sep}marketplaces${path.sep}`)) {
        const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "arena-marketplace-"))
        try {
          const fetched = await fetchSource(entry.source, workdir)
          await copyDir(fetched.path, entry.localPath)
        } finally {
          await fs.rm(workdir, { recursive: true, force: true }).catch(() => {})
        }
      }
    }
  }

  interface ResolvedPlugin {
    name: string
    entry?: MarketplaceEntry
    marketplace?: string
    directSource?: string
  }

  async function resolveRef(ref: string): Promise<ResolvedPlugin> {
    const at = ref.lastIndexOf("@")
    const hasMarketplace = at > 0 && !ref.startsWith("@") && !ref.slice(at + 1).includes("/")
    if (hasMarketplace) {
      const name = ref.slice(0, at)
      const marketplace = ref.slice(at + 1)
      const catalog = await marketplaceCatalog(marketplace)
      if (!catalog) throw new Error(`marketplace not found: ${marketplace}`)
      const entry = catalog.file.plugins.find((x) => x.name === name)
      if (!entry) throw new Error(`plugin "${name}" not found in marketplace "${marketplace}"`)
      return { name, entry, marketplace }
    }
    const registry = await readRegistry()
    const matches: { entry: MarketplaceEntry; marketplace: string }[] = []
    for (const m of Object.keys(registry.marketplaces)) {
      const catalog = await marketplaceCatalog(m).catch(() => undefined)
      const entry = catalog?.file.plugins.find((x) => x.name === ref)
      if (entry) matches.push({ entry, marketplace: m })
    }
    if (matches.length === 1) return { name: ref, entry: matches[0].entry, marketplace: matches[0].marketplace }
    if (matches.length > 1) {
      throw new Error(`"${ref}" is in multiple marketplaces (${matches.map((x) => x.marketplace).join(", ")}); use name@marketplace`)
    }
    return { name: path.basename(ref.replace(/\/$/, "")), directSource: ref }
  }

  async function fetchEntrySource(entry: MarketplaceEntry, marketplacePath: string, workdir: string): Promise<Fetched> {
    const source = entry.source
    if (typeof source === "string") {
      if (source.startsWith("./") || source.startsWith("../")) {
        return { path: path.join(marketplacePath, source), version: entry.version }
      }
      return fetchSource(source, workdir)
    }
    if ("github" in source) {
      const to = path.join(workdir, "git")
      await cloneGit(githubUrl(source.github), source.ref, to)
      return { path: to, version: entry.version ?? source.ref }
    }
    if ("url" in source) {
      const to = path.join(workdir, "git")
      await cloneGit(source.url, source.ref, to)
      return { path: to, version: entry.version ?? source.ref }
    }
    if ("npm" in source) {
      const to = path.join(workdir, "npm")
      await fetchNpm(source.version ? `${source.npm}@${source.version}` : source.npm, to)
      return { path: to, version: source.version ?? entry.version }
    }
    throw new Error(`unsupported marketplace source for "${entry.name}"`)
  }

  export interface InstallOptions {
    scope?: Scope
    yes?: boolean
    confirm?: (summary: string) => Promise<boolean>
  }

  export async function install(ref: string, opts?: InstallOptions): Promise<{ name: string; path: string; enabled: boolean }> {
    const scope = opts?.scope ?? "user"
    const resolved = await resolveRef(ref)
    const target = path.join(scope === "user" ? userDir() : projectDir(), resolved.name)
    if (await fs.stat(target).catch(() => undefined)) {
      throw new Error(`plugin already installed: ${resolved.name} (use plugin update instead)`)
    }
    const workdir = await fs.mkdtemp(path.join(require("os").tmpdir(), "arena-plugin-"))
    try {
      let fetched: Fetched
      if (resolved.entry) {
        const catalog = await marketplaceCatalog(resolved.marketplace!)
        fetched = await fetchEntrySource(resolved.entry, catalog!.localPath, workdir)
      } else {
        fetched = await fetchSource(resolved.directSource!, workdir)
      }
      const validation = await validate(fetched.path, resolved.name)
      if (validation.errors.length) throw new Error(`plugin validation failed:\n- ${validation.errors.join("\n- ")}`)
      const manifestName = validation.manifest.name ?? resolved.name
      const finalTarget = path.join(scope === "user" ? userDir() : projectDir(), manifestName)
      if (await fs.stat(finalTarget).catch(() => undefined)) throw new Error(`plugin already installed: ${manifestName}`)
      const parts = [
        `Plugin: ${manifestName}${validation.manifest.version ? ` (${validation.manifest.version})` : ""}`,
        `Source: ${resolved.marketplace ? `${resolved.name}@${resolved.marketplace}` : resolved.directSource ?? ref}`,
        `Scope: ${scope} (${finalTarget})`,
        `Skills: ${validation.components.skills.map((x) => x.name).join(", ") || "none"}`,
        `Commands: ${validation.components.commands.map((x) => x.name).join(", ") || "none"}`,
        `Agents: ${validation.components.agents.map((x) => x.name).join(", ") || "none"}`,
        ...validation.warnings.map((x) => `Warning: ${x}`),
      ]
      if (!(await confirmInstall(parts.join("\n"), opts))) {
        throw new Error("install cancelled")
      }
      await fs.mkdir(path.dirname(finalTarget), { recursive: true })
      await copyDir(fetched.path, finalTarget)
      const enabled = validation.manifest.defaultEnabled ?? true
      await writeRegistryEntry(scope, (r) => {
        r.plugins[manifestName] = {
          name: manifestName,
          scope,
          path: finalTarget,
          enabled,
          ...(fetched.version ? { version: fetched.version } : validation.manifest.version ? { version: validation.manifest.version } : {}),
          ...(resolved.marketplace ? { marketplace: resolved.marketplace } : {}),
          source: resolved.marketplace ? `${resolved.name}@${resolved.marketplace}` : resolved.directSource ?? ref,
        }
      })
      return { name: manifestName, path: finalTarget, enabled }
    } finally {
      await fs.rm(workdir, { recursive: true, force: true }).catch(() => {})
    }
  }

  async function confirmInstall(summary: string, opts?: InstallOptions): Promise<boolean> {
    if (opts?.confirm) return opts.confirm(summary)
    if (opts?.yes) return true
    if (!process.stdin.isTTY) return false
    const { confirm, isCancel } = await import("@clack/prompts")
    const answer = await confirm({ message: `${summary}\n\nInstall this plugin?` })
    return !isCancel(answer) && answer === true
  }

  export async function uninstall(name: string, scope?: Scope) {
    const scopes = scope ? [scope] : (["user", "project"] as Scope[])
    for (const item of scopes) {
      const file = item === "user" ? userRegistryFile() : projectRegistryFile()
      const registry = await readRegistryFile(file)
      const entry = registry.plugins[name]
      if (entry) {
        await fs.rm(entry.path, { recursive: true, force: true }).catch(() => {})
        delete registry.plugins[name]
        await writeRegistryFile(file, registry)
        return
      }
      const fallback = path.join(item === "user" ? userDir() : projectDir(), name)
      if (await fs.stat(fallback).catch(() => undefined)) {
        await fs.rm(fallback, { recursive: true, force: true }).catch(() => {})
        return
      }
    }
    throw new Error(`plugin not installed: ${name}`)
  }

  export async function setEnabled(name: string, enabled: boolean, opts?: InstallOptions) {
    const registry = await readRegistry()
    const entry = registry.plugins[name]
    if (!entry) throw new Error(`plugin not installed: ${name}`)
    if (enabled && !opts?.yes) {
      const validation = await validate(entry.path, name)
      const ok = await confirmInstall(
        `Plugin: ${name}\nSource: ${entry.source}\nSkills: ${validation.components.skills.map((x) => x.name).join(", ") || "none"}\nCommands: ${validation.components.commands.map((x) => x.name).join(", ") || "none"}\nAgents: ${validation.components.agents.map((x) => x.name).join(", ") || "none"}`,
        opts,
      )
      if (!ok) throw new Error("enable cancelled")
    }
    const scope = entry.scope
    await writeRegistryEntry(scope, (r) => {
      if (r.plugins[name]) r.plugins[name].enabled = enabled
    })
  }

  export async function update(name?: string) {
    const registry = await readRegistry()
    const names = name ? [name] : Object.keys(registry.plugins)
    for (const item of names) {
      const entry = registry.plugins[item]
      if (!entry) throw new Error(`plugin not installed: ${item}`)
      if (entry.source.startsWith("./") || entry.source.startsWith("/") || entry.source.startsWith("~/") || entry.source.startsWith("../")) continue
      const workdir = await fs.mkdtemp(path.join(require("os").tmpdir(), "arena-plugin-"))
      try {
        let fetched: Fetched
        if (entry.marketplace) {
          const catalog = await marketplaceCatalog(entry.marketplace)
          const pluginEntry = catalog?.file.plugins.find((x) => x.name === item)
          if (!pluginEntry) throw new Error(`plugin "${item}" no longer in marketplace "${entry.marketplace}"`)
          fetched = await fetchEntrySource(pluginEntry, catalog!.localPath, workdir)
        } else {
          fetched = await fetchSource(entry.source, workdir)
        }
        const validation = await validate(fetched.path, item)
        if (validation.errors.length) throw new Error(`plugin validation failed:\n- ${validation.errors.join("\n- ")}`)
        await copyDir(fetched.path, entry.path)
        log.info("plugin updated", { name: item })
      } finally {
        await fs.rm(workdir, { recursive: true, force: true }).catch(() => {})
      }
    }
  }

  export async function summary(name: string) {
    const registry = await readRegistry()
    const entry = registry.plugins[name]
    if (!entry) throw new Error(`plugin not installed: ${name}`)
    const validation = await validate(entry.path, name)
    return { entry, validation }
  }

  export async function allComponents(): Promise<Components & { disabled: string[] }> {
    const registry = await readRegistry()
    const skills: Component[] = []
    const commands: Component[] = []
    const agents: Component[] = []
    const disabled: string[] = []
    const roots = [userDir(), projectDir()]
    try {
      const cfgDirs = await Config.directories().catch(() => [] as string[])
      for (const dir of cfgDirs) {
        const candidate = path.join(dir, "plugins")
        if (!roots.includes(candidate)) roots.push(candidate)
      }
    } catch {
      // Config unavailable (bare CLI context); fall back to default roots.
    }
    for (const root of roots) {
      const entries = await fs.readdir(root).catch(() => [] as string[])
      for (const item of entries) {
        const pluginPath = path.join(root, item)
        if (!(await fs.stat(pluginPath).catch(() => undefined))) continue
        const { manifest } = await manifestFor(pluginPath)
        const pluginName = manifest.name ?? item
        const record = registry.plugins[pluginName] ?? registry.plugins[item]
        if (record && !record.enabled) {
          disabled.push(pluginName)
          continue
        }
        const parts = await componentsFor(pluginPath, pluginName)
        skills.push(...parts.skills)
        commands.push(...parts.commands)
        agents.push(...parts.agents)
      }
    }
    return { skills, commands, agents, disabled }
  }
}
