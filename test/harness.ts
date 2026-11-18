/**
 * Test helpers for Effect Atom NSH hooks.
 *
 * Real NSH apps get an owner from the component tree. Unit tests use
 * `runWithOwner` / `renderHook` to simulate that scope.
 */
import { expect } from "bun:test"
import { runWithOwner } from "../dev/nsh.ts"

export { runWithOwner } from "../dev/nsh.ts"

export type HookSession<A> = {
  readonly result: A
  readonly dispose: () => void
}

/**
 * Runs hook setup under an NSH owner and returns a disposable session.
 */
export const renderHook = <A>(setup: () => A): HookSession<A> => runWithOwner(setup)

/**
 * Runs `setup`, asserts with `assert`, then always disposes the owner.
 */
export const withHook = <A>(setup: () => A, assert: (result: A) => void): void => {
  const session = renderHook(setup)
  try {
    assert(session.result)
  } finally {
    session.dispose()
  }
}

/**
 * Narrow helper for RegistryProvider children results in tests.
 */
export const expectDefined = <A>(value: A | null | undefined): A => {
  expect(value).toBeDefined()
  return value as A
}
