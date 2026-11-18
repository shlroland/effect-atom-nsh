import { describe, expect, test } from "bun:test"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRef from "effect/reactivity/AtomRef"
import { runWithOwner } from "../dev/nsh.ts"
import {
  useAtom,
  useAtomMount,
  useAtomRef,
  useAtomRefresh,
  useAtomSet,
  useAtomSubscribe,
  useAtomValue
} from "../src/Hooks.ts"
import { RegistryProvider } from "../src/RegistryContext.ts"

describe("useAtomValue / useAtomSet / useAtom", () => {
  test("reads and writes a writable atom", () => {
    const countAtom = Atom.make(0)
    const { result, dispose } = runWithOwner(() => {
      const [count, setCount] = useAtom(() => countAtom)
      return { count, setCount }
    })

    expect(result.count()).toBe(0)
    result.setCount(1)
    expect(result.count()).toBe(1)
    result.setCount((n) => n + 1)
    expect(result.count()).toBe(2)
    dispose()
  })

  test("useAtomValue maps the value", () => {
    const countAtom = Atom.make(2)
    const { result, dispose } = runWithOwner(() => useAtomValue(() => countAtom, (n) => n * 2))
    expect(result()).toBe(4)
    dispose()
  })

  test("useAtomSet writes without subscribing via useAtomValue", () => {
    const countAtom = Atom.make(0)
    const { result, dispose } = runWithOwner(() => {
      const setCount = useAtomSet(() => countAtom)
      const count = useAtomValue(() => countAtom)
      return { count, setCount }
    })
    result.setCount(5)
    expect(result.count()).toBe(5)
    dispose()
  })
})

describe("RegistryProvider", () => {
  test("isolates registry state per provider", () => {
    const countAtom = Atom.make(0)

    const outer = runWithOwner(() => {
      const setCount = useAtomSet(() => countAtom)
      const count = useAtomValue(() => countAtom)
      return { count, setCount }
    })

    const inner = runWithOwner(() =>
      RegistryProvider({
        get children() {
          const [count, setCount] = useAtom(() => countAtom)
          return { count, setCount }
        }
      })
    )

    outer.result.setCount(10)
    expect(outer.result.count()).toBe(10)
    expect((inner.result as { count: () => number }).count()).toBe(0)
    ;(inner.result as { setCount: (n: number) => void }).setCount(3)
    expect((inner.result as { count: () => number }).count()).toBe(3)
    expect(outer.result.count()).toBe(10)

    inner.dispose()
    outer.dispose()
  })
})

describe("useAtomSubscribe / useAtomRefresh / useAtomMount / useAtomRef", () => {
  test("useAtomSubscribe notifies on change", () => {
    const countAtom = Atom.make(0)
    const seen: Array<number> = []
    const { result, dispose } = runWithOwner(() => {
      useAtomSubscribe(() => countAtom, (n) => seen.push(n), { immediate: true })
      return useAtomSet(() => countAtom)
    })
    expect(seen).toEqual([0])
    result(1)
    expect(seen).toEqual([0, 1])
    dispose()
  })

  test("useAtomRefresh remounts an effectful atom", () => {
    let runs = 0
    const timeAtom = Atom.make(() => {
      runs += 1
      return runs
    })
    const { result, dispose } = runWithOwner(() => {
      const value = useAtomValue(() => timeAtom)
      const refresh = useAtomRefresh(() => timeAtom)
      return { value, refresh }
    })
    expect(result.value()).toBe(1)
    result.refresh()
    expect(result.value()).toBe(2)
    dispose()
  })

  test("useAtomMount mounts without throwing", () => {
    const mountAtom = Atom.make(1)
    const { dispose } = runWithOwner(() => {
      useAtomMount(() => mountAtom)
    })
    dispose()
  })

  test("useAtomRef tracks AtomRef updates", () => {
    const ref = AtomRef.make({ name: "Roland" })
    const { result, dispose } = runWithOwner(() => useAtomRef(() => ref))
    expect(result()).toEqual({ name: "Roland" })
    ref.set({ name: "Effect" })
    expect(result()).toEqual({ name: "Effect" })
    dispose()
  })
})
