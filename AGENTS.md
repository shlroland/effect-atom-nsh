# AGENTS.md — effect-atom-nsh

NSH (Native Shell) bindings for Effect Atom — port of `@effect/atom-solid` onto NSH’s Solid-like reactivity (`signal` / `effect` / `cleanup` / `context` / `computed`).

Effect **v4** library scaffolded by `create-effect-t-stack --template library`.

## Learning more about Effect

This repository uses the Effect Typescript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md`
**completely**, and follow the links in the file when required.

If you need to learn more about particular Effect apis and concepts that the
guide doesn't cover, search through the source code in `node_modules/effect/src`.

Atom APIs live under `effect/reactivity` (see `Atom.ts`, `AtomRegistry.ts`, `AtomRef.ts`, `AsyncResult.ts`). Prefer matching patterns from `@effect/atom-solid` when extending this adapter.

When the `skills` addon is present, also see `.agents/skills/effect-ts/SKILL.md`.

## Conventions

- Named exports only (no `export default` in library code)
- PascalCase modules; `Context.Service`, `Schema.TaggedError`, `Effect.fn`
- `.ts` extensions in relative imports
- Format / lint via **effect-style** (`dprint` + `oxlint` + `packages/effect-oxc`) when that addon is enabled
- Import reactive primitives from `nsh` (not `solid-js` — NSH forbids it)
- Local typecheck/tests resolve `nsh` via `dev/nsh.ts` shim; real NSH apps use generated `.nsh/types`

## Scripts

- `bun run check` — lint, typecheck, test
- `bun run test` — `bun test` (harness: `test/harness.ts`)
- `bun run test:coverage` — `bun test --coverage`
- `bun run check-types` — `tsc --noEmit`
- `bun run pack:dry` — preview npm pack contents before publish
- `bun run prepublishOnly` — runs `check` (also hooked for `npm publish`)
