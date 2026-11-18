import { describe, expect, test } from "bun:test"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRef from "effect/reactivity/AtomRef"
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
import { expectDefined, renderHook, withHook } from "./harness.ts"

describe("useAtomValue / useAtomSet / useAtom", () => {
  test("reads and writes a writable atom", () => {
    const countAtom = Atom.make(0)
    withHook(() => useAtom(() => countAtom), ([count, setCount]) => {
      expect(count()).toBe(0)
      setCount(1)
      expect(count()).toBe(1)
      setCount((n) => n + 1)
      expect(count()).toBe(2)
    })
  })

  test("useAtomValue maps the value", () => {
    const countAtom = Atom.make(2)
    withHook(() => useAtomValue(() => countAtom, (n) => n * 2), (doubled) => {
      expect(doubled()).toBe(4)
    })
  })

  test("useAtomSet writes without requiring a value subscription alone", () => {
    const countAtom = Atom.make(0)
    withHook(() => {
      const setCount = useAtomSet(() => countAtom)
      const count = useAtomValue(() => countAtom)
      return { count, setCount }
    }, ({ count, setCount }) => {
      setCount(5)
      expect(count()).toBe(5)
    })
  })
})

describe("RegistryProvider isolation", () => {
  test("isolates registry state per provider", () => {
    const countAtom = Atom.make(0)

    const outer = renderHook(() => {
      const setCount = useAtomSet(() => countAtom)
      const count = useAtomValue(() => countAtom)
      return { count, setCount }
    })

    const inner = renderHook(() =>
      RegistryProvider({
        get children() {
          const [count, setCount] = useAtom(() => countAtom)
          return { count, setCount }
        }
      })
    )

    const innerApi = expectDefined(
      inner.result as {
        count: () => number
        setCount: (n: number) => void
      }
    )

    outer.result.setCount(10)
    expect(outer.result.count()).toBe(10)
    expect(innerApi.count()).toBe(0)

    innerApi.setCount(3)
    expect(innerApi.count()).toBe(3)
    expect(outer.result.count()).toBe(10)

    inner.dispose()
    outer.dispose()
  })
})

describe("useAtomSubscribe / useAtomRefresh / useAtomMount / useAtomRef", () => {
  test("useAtomSubscribe notifies on change", () => {
    const countAtom = Atom.make(0)
    const seen: Array<number> = []
    withHook(() => {
      useAtomSubscribe(() => countAtom, (n) => seen.push(n), { immediate: true })
      return useAtomSet(() => countAtom)
    }, (setCount) => {
      expect(seen).toEqual([0])
      setCount(1)
      expect(seen).toEqual([0, 1])
    })
  })

  test("useAtomRefresh remounts a computed atom", () => {
    let runs = 0
    const timeAtom = Atom.make(() => {
      runs += 1
      return runs
    })
    withHook(() => {
      const value = useAtomValue(() => timeAtom)
      const refresh = useAtomRefresh(() => timeAtom)
      return { value, refresh }
    }, ({ value, refresh }) => {
      expect(value()).toBe(1)
      refresh()
      expect(value()).toBe(2)
    })
  })

  test("useAtomMount mounts without throwing", () => {
    const mountAtom = Atom.make(1)
    withHook(() => {
      useAtomMount(() => mountAtom)
    }, () => undefined)
  })

  test("useAtomRef tracks AtomRef updates", () => {
    const ref = AtomRef.make({ name: "Roland" })
    withHook(() => useAtomRef(() => ref), (value) => {
      expect(value()).toEqual({ name: "Roland" })
      ref.set({ name: "Effect" })
      expect(value()).toEqual({ name: "Effect" })
    })
  })
})
