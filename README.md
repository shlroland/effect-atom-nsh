# effect-atom-nsh

NSH (Native Shell) bindings for [Effect Atom](https://effect.website) — a port of [`@effect/atom-solid`](https://www.npmjs.com/package/@effect/atom-solid) onto NSH’s Solid-like reactivity.

## Install

```sh
bun add effect-atom-nsh effect
```

`nsh` is provided by the Native Shell runtime (generated `.nsh/types`). This package imports `signal`, `effect`, `cleanup`, `computed`, and `context` from `nsh`.

## Usage

```tsx
import { RegistryProvider, useAtom } from "effect-atom-nsh"
import * as Atom from "effect/reactivity/Atom"
import { Text, View } from "nsh"

const countAtom = Atom.make(0)

function Counter() {
  const [count, setCount] = useAtom(() => countAtom)
  return (
    <View onPress={() => setCount((n) => n + 1)}>
      <Text>{count()}</Text>
    </View>
  )
}

function App() {
  return (
    <RegistryProvider>
      <Counter />
    </RegistryProvider>
  )
}
```

### Hooks

| Hook                                                    | Role                                    |
| ------------------------------------------------------- | --------------------------------------- |
| `useAtomValue`                                          | Subscribe to an atom as an NSH accessor |
| `useAtomSet`                                            | Write without reading                   |
| `useAtom`                                               | Read + write                            |
| `useAtomMount`                                          | Keep an atom mounted                    |
| `useAtomRefresh`                                        | Remount / refresh                       |
| `useAtomSubscribe`                                      | Callback on change                      |
| `useAtomRef` / `useAtomRefProp` / `useAtomRefPropValue` | `AtomRef` helpers                       |
| `useAtomInitialValues`                                  | Seed values in the current registry     |
| `RegistryProvider`                                      | Scope a registry to a subtree           |

## Development

```sh
bun install
bun run check          # lint + types + tests
bun run test           # bun:test
bun run test:coverage  # coverage report
bun run pack:dry       # preview npm pack contents
```

Local typecheck/tests resolve `nsh` to `dev/nsh.ts` (a minimal reactivity shim). Real NSH apps use the runtime’s generated types.

Test helpers live in `test/harness.ts` (`renderHook`, `withHook`, `runWithOwner`).

## Publish (Trusted Publishing)

Releases publish from GitHub Actions with [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). No long-lived `NPM_TOKEN`.

### One-time setup on npm

1. Ensure the package exists on npm (first publish may still need interactive OTP once).
2. Bind this repo’s workflow as a trusted publisher (needs OTP / web login):

```sh
bun run trust:github
# equivalent:
# npm trust github effect-atom-nsh --repo shlroland/effect-atom-nsh --file publish.yml -y
```

Or in the npm UI: **Package → Settings → Trusted Publisher → GitHub Actions**

| Field                | Value             |
| -------------------- | ----------------- |
| Organization or user | `shlroland`       |
| Repository           | `effect-atom-nsh` |
| Workflow filename    | `publish.yml`     |

Complete a successful CI publish within **2 days** so the binding validates.

### Cut a release

Uses [bumpp](https://github.com/antfu-collective/bumpp) locally (bump → commit → tag → push). CI publishes — do not put `npm publish` in bumpp `--execute`.

```sh
bun run release          # interactive bump
bun run release:patch    # non-interactive patch
bun run release:minor
bun run release:major
# → pushes v* tag → .github/workflows/publish.yml (OIDC npm publish)
```

`publish.yml` requires `id-token: write`, Node 24, and npm ≥ 11.5.1. Provenance is generated automatically (`publishConfig.provenance`).
