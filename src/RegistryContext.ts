/**
 * NSH context and provider for the Atom registry used by Effect Atom hooks.
 * The registry stores atom values, schedules update work, and cleans up unused
 * atoms. Sharing one registry through NSH context lets components and
 * computations in the same owner tree read and write the same atom state.
 *
 * Port of `@effect/atom-solid` RegistryContext onto NSH reactivity.
 *
 * @stability unstable
 * @since 0.1.0
 */
import type * as Atom from "effect/reactivity/Atom"
import * as AtomRegistry from "effect/reactivity/AtomRegistry"
import { cleanup, context } from "nsh"

/**
 * Provides an NSH context that carries the `AtomRegistry` used by atom hooks in
 * the current owner tree.
 *
 * When no provider is present, the context uses a standalone default registry.
 *
 * @see {@link RegistryProvider} for creating and providing a registry for an NSH subtree
 *
 * @stability unstable
 * @category context
 * @since 0.1.0
 */
export const RegistryContext = context<AtomRegistry.AtomRegistry>(AtomRegistry.make())

/**
 * Creates an `AtomRegistry` for an NSH subtree, optionally seeding initial atom
 * values and scheduler settings, and disposes the registry when the owner is
 * cleaned up.
 *
 * Provider options are consumed when the registry is created; they are not
 * reactive updates. A custom `scheduleTask` should return a cancellation
 * function that is safe to call during NSH cleanup.
 *
 * @see {@link RegistryContext} for the context supplied by this provider
 *
 * @stability unstable
 * @category context
 * @since 0.1.0
 */
export const RegistryProvider = (options: {
  readonly children?: unknown
  readonly initialValues?: Iterable<readonly [Atom.Atom<any>, any, Atom.InitialValueOptions?]> | undefined
  readonly scheduleTask?: ((f: () => void) => () => void) | undefined
  readonly timeoutResolution?: number | undefined
  readonly defaultIdleTTL?: number | undefined
}): unknown => {
  const registry = AtomRegistry.make({
    scheduleTask: options.scheduleTask,
    initialValues: options.initialValues,
    timeoutResolution: options.timeoutResolution,
    defaultIdleTTL: options.defaultIdleTTL
  })
  cleanup(() => registry.dispose())
  return RegistryContext.Provider({
    value: registry,
    get children() {
      return options.children
    }
  })
}
