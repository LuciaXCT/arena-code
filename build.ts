#!/usr/bin/env bun
import { rm, mkdir, chmod, cp, readdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { $ } from "bun"

const root = import.meta.dir
const outdir = path.join(root, "dist")
const entry = path.join(root, "src/cli.ts")
const noBinary = process.argv.includes("--no-binary")
const matrix = process.argv.includes("--matrix")

const pkg = await Bun.file(path.join(root, "package.json")).json()
const version: string = pkg.version

const PLATFORMS = ["linux-x64", "linux-arm64", "darwin-x64", "darwin-arm64", "win32-x64"] as const

function currentSlug(): string {
  const arch = process.arch === "x64" ? "x64" : "arm64"
  return `${process.platform}-${arch}`
}

function binaryName(): string {
  return process.platform === "win32" ? "arena.exe" : "arena"
}

console.log(`Building Arena CLI v${version}...`)

await mkdir(outdir, { recursive: true })

// 0. Keep platform packages version-locked with the root package.
for (const slug of PLATFORMS) {
  const file = path.join(root, "platforms", slug, "package.json")
  if (!existsSync(file)) continue
  const platformPkg = await Bun.file(file).json()
  if (platformPkg.version !== version) {
    platformPkg.version = version
    await Bun.write(file, JSON.stringify(platformPkg, null, 2) + "\n")
    console.log(`Synced version for platforms/${slug}`)
  }
}

// 1. Runtime binary (self-contained distribution).
// With --no-binary (used by `prepack`), ensure no stale binary leaks into
// the published tarball: the runtime ships via platform packages instead.
const staleBin = path.join(outdir, process.platform === "win32" ? "arena.exe" : "arena")
if (matrix || noBinary) {
  await rm(staleBin, { force: true }).catch(() => {})
  const staleExe = staleBin.endsWith(".exe") ? staleBin.slice(0, -4) : `${staleBin}.exe`
  await rm(staleExe, { force: true }).catch(() => {})
  // Legacy artifact name from before the runtime was renamed to `arena`.
  await rm(path.join(outdir, "opencode"), { force: true }).catch(() => {})
  await rm(path.join(outdir, "opencode.exe"), { force: true }).catch(() => {})
}
const opencodeDir = path.join(root, "packages/opencode")
if (matrix) {
  console.log("Building full runtime matrix via opencode build...")
  await $`bun run script/build.ts`.cwd(opencodeDir)
  for (const slug of PLATFORMS) {
    const [os, arch] = slug.split("-")
    const buildName = `opencode-${os === "win32" ? "windows" : os}-${arch}`
    const candidates = [
      path.join(opencodeDir, "dist", buildName, "bin", "opencode"),
      path.join(opencodeDir, "dist", buildName, "bin", "opencode.exe"),
    ]
    const found = candidates.find((c) => existsSync(c))
    if (!found) {
      console.error(`Matrix build missing output for ${slug} (looked in ${buildName}/bin)`)
      process.exit(1)
    }
    const destDir = path.join(root, "platforms", slug, "bin")
    await mkdir(destDir, { recursive: true })
    const dest = path.join(destDir, slug.startsWith("win32") ? "arena.exe" : "arena")
    await cp(found, dest)
    await chmod(dest, 0o755)
    console.log(`Packed runtime: platforms/${slug}/bin/${path.basename(dest)}`)
  }
} else if (!noBinary) {
  const slug = currentSlug()
  const buildName = `opencode-${process.platform}-${process.arch}`
  const opencodeBinary = path.join(opencodeDir, "dist", buildName, "bin", "opencode")
  if (!existsSync(opencodeBinary)) {
    console.log(`Compiling standalone runtime for ${slug}...`)
    await $`bun run script/build.ts --single`.cwd(opencodeDir)
  }
  const outBin = path.join(outdir, binaryName())
  await cp(opencodeBinary, outBin)
  await chmod(outBin, 0o755)
  console.log(`Included runtime: dist/${binaryName()}`)
}

// 2. Wrapper entrypoint (tiny ESM bundle, runs on node >= 18 and bun >= 1).
const result = await Bun.build({
  entrypoints: [entry],
  outdir,
  format: "esm",
  target: "node",
  sourcemap: "none",
  minify: false,
  naming: "cli.js",
  external: ["yaml"],
  define: {
    "process.env.ARENA_VERSION": JSON.stringify(version),
  },
})

if (!result.success) {
  console.error("Build failed")
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

const outPath = path.join(outdir, "cli.js")
let content = await Bun.file(outPath).text()

if (!content.startsWith("#!/usr/bin/env node")) {
  content = "#!/usr/bin/env node\n" + content
  await Bun.write(outPath, content)
}

await chmod(outPath, 0o755)
console.log(`Built ${outPath}`)
console.log("Build complete")
