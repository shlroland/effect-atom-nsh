# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-18

### Added

- Initial NSH bindings for Effect Atom (`useAtom`, `useAtomValue`, `useAtomSet`, `useAtomMount`, `useAtomRefresh`, `useAtomSubscribe`, `useAtomRef*`, `useAtomInitialValues`)
- `RegistryContext` / `RegistryProvider` for scoped `AtomRegistry` state
- Local `dev/nsh.ts` reactivity shim for typecheck and unit tests
- Bun test harness (`test/harness.ts`) and CI check workflow
