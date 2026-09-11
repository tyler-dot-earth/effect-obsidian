# effect-obsidian

Effect helpers for Obsidian plugins. Latest Effect v4 rc.

## Effect

- `Context.Service` classes, `Layer.effect` / `Layer.succeed`, `Effect.fn("Domain.operation")`
- `Schema.Struct` plus a same-name interface; `Schema.TaggedError` for typed failures
- Decode untrusted input with `Schema.decodeUnknownEffect`
- No `async`/`await` or `try`/`catch` inside Effect programs; plugin classes are the host boundary
- Tests: `@effect/vitest` `it.effect` and `assert`. Do not `Effect.runSync` in tests
- Time: `Clock` / `TestClock`, not `Date.now`

## Layout

- One concept per file, kebab-case names
- Package imports: `#src/plugin-data-store`
- Colocate tests next to the module
- Do not import `obsidian`. Hosts pass `loadData` / `saveData` callbacks
