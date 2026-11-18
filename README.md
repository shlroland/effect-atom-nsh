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
bun run check
```

Local typecheck/tests resolve `nsh` to `dev/nsh.ts` (a minimal reactivity shim). Real NSH apps use the runtime’s generated types.
