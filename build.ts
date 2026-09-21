#!/usr/bin/env bun
import { rm, mkdir, chmod, cp } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { $ } from "bun"

const outdir = "dist"
const entry = "./src/cli.ts"

console.log("Building Arena CLI...")

await mkdir(outdir, { recursive: true })

// 1. Compile opencode binary if needed
const opencodeBinary = path.join("packages/opencode/dist/opencode-linux-x64/bin/opencode")
if (!existsSync(opencodeBinary)) {
  console.log("Compiling standalone opencode binary...")
  await $`cd packages/opencode && bun run script/build.ts --single`
}

if (existsSync(opencodeBinary)) {
  await cp(opencodeBinary, path.join(outdir, "opencode"))
  await chmod(path.join(outdir, "opencode"), 0o755)
  console.log("Included binary: dist/opencode")
}

// 2. Build entrypoint CLI
const result = await Bun.build({
  entrypoints: [entry],
  outdir,
  format: "esm",
  target: "node",
  sourcemap: "none",
  minify: false,
  naming: "cli.js",
  external: ["yaml"],
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
