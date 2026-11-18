/**
 * Minimal NSH reactivity shim for local typecheck and `bun test`.
 * Real NSH apps resolve `nsh` from generated `.nsh/types` at runtime.
 *
 * @internal
 */

export interface SignalOptions<T> {
  readonly equals?: false | ((previous: T, next: T) => boolean)
}

export interface Signal<T> {
  (): T
  set(value: T): void
  update(fn: (value: T) => T): void
}

export type Accessor<T> = () => T

export interface Context<T> extends Accessor<T> {
  Provider: (props: { value: T; children?: unknown }) => unknown
}

type Owner = {
  readonly cleanups: Array<() => void>
  readonly contexts: Map<symbol, unknown>
  readonly parent: Owner | undefined
}

let currentOwner: Owner | undefined
let currentListener: (() => void) | undefined

const createOwner = (parent: Owner | undefined): Owner => ({
  cleanups: [],
  contexts: new Map(),
  parent
})

const disposeOwner = (owner: Owner): void => {
  for (let i = owner.cleanups.length - 1; i >= 0; i--) {
    owner.cleanups[i]!()
  }
  owner.cleanups.length = 0
}

/**
 * Runs `fn` under a fresh owner (component / provider scope). Used by tests.
 */
export const runWithOwner = <A>(fn: () => A): { readonly result: A; readonly dispose: () => void } => {
  const owner = createOwner(currentOwner)
  const prev = currentOwner
  currentOwner = owner
  try {
    return {
      result: fn(),
      dispose: () => disposeOwner(owner)
    }
  } finally {
    currentOwner = prev
  }
}

export const cleanup = (fn: () => void): void => {
  currentOwner?.cleanups.push(fn)
}

export const signal = <T>(value?: T, options?: SignalOptions<T>): Signal<T> => {
  let current = value as T
  const listeners = new Set<() => void>()
  const equals = options?.equals === false
    ? (() => false)
    : (options?.equals ?? ((a: T, b: T) => Object.is(a, b)))

  const read = (() => {
    if (currentListener !== undefined) {
      listeners.add(currentListener)
    }
    return current
  }) as Signal<T>

  read.set = (next: T) => {
    if (equals(current, next)) return
    current = next
    for (const listener of Array.from(listeners)) {
      listener()
    }
  }

  read.update = (fn: (value: T) => T) => {
    read.set(fn(current))
  }

  return read
}

export const effect = (fn: () => void): void => {
  const owner = createOwner(currentOwner)
  const run = () => {
    disposeOwner(owner)
    const prevOwner = currentOwner
    const prevListener = currentListener
    currentOwner = owner
    currentListener = run
    try {
      fn()
    } finally {
      currentListener = prevListener
      currentOwner = prevOwner
    }
  }
  run()
  cleanup(() => disposeOwner(owner))
}

export const computed = <T>(fn: () => T): Accessor<T> => {
  const value = signal<T>(undefined as T)
  effect(() => {
    value.set(fn())
  })
  return value
}

export const context = <T>(defaultValue: T): Context<T> => {
  const id = Symbol("nsh.context")

  const read = (() => {
    let owner = currentOwner
    while (owner !== undefined) {
      if (owner.contexts.has(id)) {
        return owner.contexts.get(id) as T
      }
      owner = owner.parent
    }
    return defaultValue
  }) as Context<T>

  read.Provider = (props: { value: T; children?: unknown }) => {
    const owner = createOwner(currentOwner)
    owner.contexts.set(id, props.value)
    const parent = currentOwner
    currentOwner = owner
    try {
      const children = props.children
      parent?.cleanups.push(() => disposeOwner(owner))
      return children
    } finally {
      currentOwner = parent
    }
  }

  return read
}
