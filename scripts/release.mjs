#!/usr/bin/env node
/**
 * Cut a release tag that triggers Trusted Publishing via GitHub Actions.
 *
 * Does NOT call `npm publish` locally — `.github/workflows/publish.yml`
 * publishes with OIDC after the tag is pushed.
 *
 * Usage:
 *   bun run release              # tag current package.json version
 *   bun run release:patch        # bump patch, commit, tag, push
 *   bun run release:minor
 *   bun run release:major
 *   bun run publish:dry          # check + pack preview only
 *
 * Flags:
 *   --dry        run check + show plan, do not mutate
 *   --no-push    create commit/tag locally only
 */
import { readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const pkgPath = resolve(root, "package.json")
const changelogPath = resolve(root, "CHANGELOG.md")

const args = process.argv.slice(2)
const bump = args.find((a) => ["patch", "minor", "major"].includes(a))
const dry = args.includes("--dry")
const noPush = args.includes("--no-push")

const run = (command, commandArgs) => {
  console.log(`\n$ ${command} ${commandArgs.join(" ")}`)
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const readPkg = () => JSON.parse(readFileSync(pkgPath, "utf8"))

const bumpVersion = (version, type) => {
  const [major, minor, patch] = version.split(".").map((n) => Number(n))
  if ([major, minor, patch].some((n) => !Number.isInteger(n))) {
    throw new Error(`Invalid version: ${version}`)
  }
  if (type === "major") return `${major + 1}.0.0`
  if (type === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const today = () => new Date().toISOString().slice(0, 10)

const ensureChangelog = (version) => {
  const heading = `## [${version}] - ${today()}`
  let text = readFileSync(changelogPath, "utf8")
  if (text.includes(`## [${version}]`)) return
  const marker = "## ["
  const idx = text.indexOf(marker)
  if (idx === -1) {
    text = `${text.trimEnd()}\n\n${heading}\n\n### Changed\n\n- Release ${version}\n`
  } else {
    text = `${text.slice(0, idx)}${heading}\n\n### Changed\n\n- Release ${version}\n\n${text.slice(idx)}`
  }
  writeFileSync(changelogPath, text)
}

const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" })
if ((status.stdout || "").trim()) {
  console.error("Working tree is dirty. Commit or stash before release.")
  process.exit(1)
}

run("bun", ["run", "check"])

const pkg = readPkg()
const nextVersion = bump ? bumpVersion(pkg.version, bump) : pkg.version
const tag = `v${nextVersion}`

console.log(
  `\nRelease plan: ${pkg.name}@${nextVersion} → tag ${tag} → CI Trusted Publish${dry ? " [dry]" : ""}`
)

if (dry) {
  run("npm", ["pack", "--dry-run", "--ignore-scripts"])
  console.log("\nDry run complete. Pushing a v* tag runs .github/workflows/publish.yml.")
  process.exit(0)
}

if (bump) {
  pkg.version = nextVersion
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  ensureChangelog(nextVersion)
  run("git", ["add", "package.json", "CHANGELOG.md"])
  run("git", ["commit", "-m", `chore: release ${tag}`])
}

const existingTag = spawnSync("git", ["rev-parse", tag], { cwd: root, encoding: "utf8" })
if (existingTag.status === 0) {
  console.error(`Tag ${tag} already exists. Bump the version or delete the tag first.`)
  process.exit(1)
}

run("git", ["tag", "-a", tag, "-m", tag])

if (!noPush) {
  run("git", ["push"])
  run("git", ["push", "origin", tag])
  console.log(`\nTagged ${tag}. Watch Trusted Publish: gh run list --workflow=publish.yml`)
} else {
  console.log(`\nCreated local tag ${tag}. Push when ready: git push && git push origin ${tag}`)
}
