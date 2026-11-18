/**
 * NSH hooks for using Effect Atoms from components and computations. The hooks
 * read and write atoms through the current `RegistryContext`, mount atoms for
 * cleanup, subscribe callbacks, seed initial values, and read values from
 * `AtomRef` references.
 *
 * Port of `@effect/atom-solid` Hooks onto NSH reactivity (`signal`, `effect`,
 * `cleanup`, `computed`).
 *
 * @stability unstable
 * @since 0.1.0
 */
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import type * as AsyncResult from "effect/reactivity/AsyncResult"
import * as Atom from "effect/reactivity/Atom"
import type * as AtomRef from "effect/reactivity/AtomRef"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import type { Accessor, Signal } from "nsh"
import { cleanup, computed, effect, signal } from "nsh"
import { RegistryContext } from "./RegistryContext.ts"

const initialValuesSet = new WeakMap<AtomRegistry.AtomRegistry, WeakSet<Atom.Atom<any>>>()

/**
 * Seeds initial atom values in the current NSH atom registry.
 *
 * For each atom in the current registry, this hook applies the first value
 * supplied through the hook. Later calls for the same atom in that registry are
 * ignored.
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomInitialValues = (
  initialValues: Iterable<readonly [Atom.Atom<any>, any]>
): void => {
  const registry = RegistryContext()
  let set = initialValuesSet.get(registry)
  if (set === undefined) {
    set = new WeakSet()
    initialValuesSet.set(registry, set)
  }
  for (const [atom, value] of initialValues) {
    if (!set.has(atom)) {
      set.add(atom)
      registry.ensureNode(atom).setInitialValue(value)
    }
  }
}

/**
 * Subscribes to an atom in the current NSH registry and returns its value as an
 * NSH signal / accessor.
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomValue: {
  <A>(atom: () => Atom.Atom<A>): Accessor<A>
  <A, B>(atom: () => Atom.Atom<A>, f: (_: A) => B): Accessor<B>
} = <A>(atom: () => Atom.Atom<A>, f?: (_: A) => A): Accessor<A> => {
  const registry = RegistryContext()
  return createAtomAccessor(registry, f ? () => Atom.map(atom(), f) : atom)
}

function createAtomAccessor<A>(
  registry: AtomRegistry.AtomRegistry,
  atom: () => Atom.Atom<A>
): Signal<A> {
  const value = signal<A>(undefined as A)
  effect(() => {
    cleanup(registry.subscribe(atom(), value.set, constImmediate))
  })
  return value
}

const constImmediate = { immediate: true } as const

function mountAtom(registry: AtomRegistry.AtomRegistry, atom: () => Atom.Atom<any>): void {
  effect(() => {
    cleanup(registry.mount(atom()))
  })
}

function setAtom<R, W, Mode extends "value" | "promise" | "promiseExit" = never>(
  registry: AtomRegistry.AtomRegistry,
  atom: () => Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined
  }
): "promise" extends Mode ? (
    (value: W) => Promise<AsyncResult.AsyncResult.Success<R>>
  ) :
  "promiseExit" extends Mode ? (
      (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>
    ) :
  ((value: W | ((value: R) => W)) => void)
{
  const memo = computed(atom)
  if (options?.mode === "promise" || options?.mode === "promiseExit") {
    return ((value: W) => {
      registry.set(memo(), value)
      const promise = Effect.runPromiseExit(
        AtomRegistry.getResult(registry, memo() as Atom.Atom<AsyncResult.AsyncResult<any, any>>, {
          suspendOnWaiting: true
        })
      )
      return options!.mode === "promise" ? promise.then(flattenExit) : promise
    }) as any
  }
  return ((value: W | ((value: R) => W)) => {
    registry.set(memo(), typeof value === "function" ? (value as any)(registry.get(memo())) : value)
  }) as any
}

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value
  throw Cause.squash(exit.cause)
}

/**
 * Mounts an atom in the current NSH registry for the lifetime of the current
 * NSH computation.
 *
 * @see {@link useAtomSet} for mounting a writable atom while returning a setter
 * @see {@link useAtomRefresh} for mounting an atom while returning a refresh callback
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomMount = <A>(atom: () => Atom.Atom<A>): void => {
  const registry = RegistryContext()
  mountAtom(registry, atom)
}

/**
 * Returns a setter for a writable atom without subscribing to its value.
 *
 * In `promise` and `promiseExit` modes, the setter observes the atom's next
 * settled result, not a result correlated with that write. Overlapping writes
 * can resolve with another write's result. Serialize writes when each caller
 * needs its own result.
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomSet = <
  R,
  W,
  Mode extends "value" | "promise" | "promiseExit" = never
>(
  atom: () => Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined
  }
): "promise" extends Mode ? (
    (value: W) => Promise<AsyncResult.AsyncResult.Success<R>>
  ) :
  "promiseExit" extends Mode ? (
      (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>
    ) :
  ((value: W | ((value: R) => W)) => void) =>
{
  const registry = RegistryContext()
  mountAtom(registry, atom)
  return setAtom(registry, atom, options)
}

/**
 * Mounts an atom and returns a callback that refreshes the current atom.
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomRefresh = <A>(atom: () => Atom.Atom<A>): () => void => {
  const registry = RegistryContext()
  mountAtom(registry, atom)
  const memo = computed(atom)
  return () => registry.refresh(memo())
}

/**
 * Returns an NSH accessor for a writable atom together with a setter for
 * updating it.
 *
 * @see {@link useAtomValue} for subscribing to an atom without a setter
 * @see {@link useAtomSet} for updating a writable atom without subscribing to its value
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtom = <R, W, const Mode extends "value" | "promise" | "promiseExit" = never>(
  atom: () => Atom.Writable<R, W>,
  options?: {
    readonly mode?: ([R] extends [AsyncResult.AsyncResult<any, any>] ? Mode : "value") | undefined
  }
): readonly [
  value: Accessor<R>,
  write: "promise" extends Mode ? (
      (value: W) => Promise<AsyncResult.AsyncResult.Success<R>>
    ) :
    "promiseExit" extends Mode ? (
        (value: W) => Promise<Exit.Exit<AsyncResult.AsyncResult.Success<R>, AsyncResult.AsyncResult.Failure<R>>>
      ) :
    ((value: W | ((value: R) => W)) => void)
] => {
  const registry = RegistryContext()
  return [
    createAtomAccessor(registry, atom),
    setAtom(registry, atom, options)
  ] as const
}

/**
 * Subscribes a callback to an atom in the current NSH registry.
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomSubscribe = <A>(
  atom: () => Atom.Atom<A>,
  f: (_: A) => void,
  options?: { readonly immediate?: boolean }
): void => {
  const registry = RegistryContext()
  effect(() => {
    cleanup(registry.subscribe(atom(), f, options))
  })
}

/**
 * Subscribes to an atom ref and returns its value as an NSH accessor.
 *
 * @see {@link useAtomValue} for reading an `Atom` from the current registry
 * @see {@link useAtomRefPropValue} for reading a property ref value
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomRef = <A>(ref: () => AtomRef.ReadonlyRef<A>): Accessor<A> => {
  const value = signal<A>(undefined as A)
  effect(() => {
    const r = ref()
    value.set(r.value)
    cleanup(r.subscribe(value.set))
  })
  return value
}

/**
 * Returns an NSH accessor for a property ref derived from an atom ref.
 *
 * The `prop` argument is captured as a plain value. Recreate the hook call when
 * the property key should change.
 *
 * @see {@link useAtomRef} for subscribing to an atom ref value
 * @see {@link useAtomRefPropValue} for subscribing directly to a property value
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomRefProp = <A, K extends keyof A>(
  ref: () => AtomRef.AtomRef<A>,
  prop: K
): Accessor<AtomRef.AtomRef<A[K]>> => computed(() => ref().prop(prop))

/**
 * Returns an NSH accessor for the value of a property ref derived from an atom
 * ref.
 *
 * @see {@link useAtomRef} for subscribing to a whole atom ref value
 * @see {@link useAtomRefProp} for returning the property ref directly
 *
 * @stability unstable
 * @category hooks
 * @since 0.1.0
 */
export const useAtomRefPropValue = <A, K extends keyof A>(
  ref: () => AtomRef.AtomRef<A>,
  prop: K
): Accessor<A[K]> => useAtomRef(useAtomRefProp(ref, prop))
