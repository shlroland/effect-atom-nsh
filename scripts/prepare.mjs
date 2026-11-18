#!/usr/bin/env node
/**
 * Local-repo prepare only. Skips when installing from the published tarball
 * (no .git) so consumers do not run language-service / lefthook hooks.
 */
import { existsSync } from "node:fs"
import { spawnSync } from "node:child_process"

if (!existsSync(".git")) {
  process.exit(0)
}

const run = (command, args, { optional = false } = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" })
  if (result.status === 0) return
  if (optional) {
    console.warn(`[prepare] optional step failed: ${command} ${args.join(" ")}`)
    return
  }
  process.exit(result.status ?? 1)
}

run("effect-language-service", ["patch"])
// May fail in restricted environments (read-only .git/hooks); ignore then.
run("lefthook", ["install"], { optional: true })
