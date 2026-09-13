# effect-obsidian

Effect helpers for Obsidian plugins. Latest Effect v4 rc. Not an Obsidian API wrapper. `loadData` / `saveData` and a plugin-scoped `ManagedRuntime` only.

## Effect

- Installed modules we actually lean on: `Effect`, `Schema`, `Context`, `Layer`, `Ref`, `Option`, `ManagedRuntime`
- `Context.Service` classes, `Layer.effect` / `Layer.succeed`, `Effect.fn("Domain.operation")`
- `Schema.Struct` plus a same-name interface; `Schema.TaggedError` for typed failures
- Decode untrusted input with `Schema.decodeUnknownEffect`. Encode typed values with `Schema.encodeEffect`
- Missing `data.json` is `undefined` from Obsidian. The store decodes `PluginLoadData` and maps nullish to `null`. `loadPluginSettings` uses `Option.fromNullOr`
- No `async`/`await` or `try`/`catch` inside Effect programs; plugin classes are the host boundary
- `makePluginRuntime` / `disposePluginRuntime` are the host Promise edge around `ManagedRuntime`
- Tests: `@effect/vitest` `it.effect` and `assert`. Do not `Effect.runSync` in tests
- Time: `Clock` / `TestClock`, not `Date.now`

## Layout

- One concept per file, kebab-case names
- Package imports: `#/src/plugin-data-store`
- CLI bin `effect-obsidian`: `release` and `bump-manifest` for plugin versioning
- Colocate tests next to the module
- Do not import `obsidian`. Hosts pass `loadData` / `saveData` callbacks

## Lint

- Oxlint plus vendored anti-slop at `tools/oxlint/anti-slop/` (generic + Effect plugins)
- Do not edit anti-slop to silence app findings. Fix owned source or record a provenance deviation
