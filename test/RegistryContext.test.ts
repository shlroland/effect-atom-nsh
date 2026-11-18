import { describe, expect, test } from "bun:test"
import * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { useAtom, useAtomInitialValues, useAtomValue } from "../src/Hooks.ts"
import { RegistryContext, RegistryProvider } from "../src/RegistryContext.ts"
import { expectDefined, renderHook, withHook } from "./harness.ts"

describe("RegistryContext", () => {
  test("defaults to a shared registry when no provider is present", () => {
    withHook(() => RegistryContext(), (a) => {
      withHook(() => RegistryContext(), (b) => {
        expect(a).toBe(b)
        expect(AtomRegistry.isAtomRegistry(a)).toBe(true)
      })
    })
  })

  test("RegistryProvider supplies an isolated registry and disposes it", () => {
    const countAtom = Atom.make(0)
    let providerRegistry: AtomRegistry.AtomRegistry | undefined

    const session = renderHook(() =>
      RegistryProvider({
        get children() {
          providerRegistry = RegistryContext()
          const [count, setCount] = useAtom(() => countAtom)
          return { count, setCount }
        }
      })
    )

    const inner = expectDefined(
      session.result as {
        count: () => number
        setCount: (n: number) => void
      }
    )
    const registry = expectDefined(providerRegistry)

    inner.setCount(7)
    expect(inner.count()).toBe(7)
    expect(registry.get(countAtom)).toBe(7)

    session.dispose()
    expect(() => registry.get(countAtom)).toThrow()
  })

  test("useAtomInitialValues seeds only once per registry", () => {
    const userAtom = Atom.make<{ id: string } | null>(null)

    withHook(
      () => {
        useAtomInitialValues([[userAtom, { id: "a" }]])
        useAtomInitialValues([[userAtom, { id: "b" }]])
        return useAtomValue(() => userAtom)
      },
      (user) => {
        expect(user()).toEqual({ id: "a" })
      }
    )
  })
})
