# effect-obsidian

Effect helpers for Obsidian plugins. Peer on Effect v4 rc.

This is not an Effect wrapper for the Obsidian API. It covers two Plugin methods from the official [Settings](https://docs.obsidian.md/Plugins/User+interface/Settings) guide, `loadData` and `saveData`, plus a `ManagedRuntime` whose lifetime matches `onload` / `onunload`. Schema decode replaces the sample plugin's `Object.assign({}, DEFAULT, await this.loadData())`.

Pass `plugin.loadData` and `plugin.saveData` through. Missing data (`undefined` or `null`) becomes `null`. Non-JSON fails as `PluginDataLoadError`. The package does not import `obsidian`.

Everything else stays in the plugin. Commands, views, vault, workspace, editor, Bases, settings tabs, `onExternalSettingsChange`, ribbon, status bar. Call those on `Plugin` and `App` as usual.

Unscoped `effect-obsidian` on npm is someone else's package. This one is `@tyler.earth/effect-obsidian`.

```bash
pnpm add effect @tyler.earth/effect-obsidian
```

```ts
import { loadPluginSettings, makePluginRuntime } from '@tyler.earth/effect-obsidian'
```

CLI for plugin release and `manifest.json` bump:

```bash
pnpm exec effect-obsidian release patch
pnpm exec effect-obsidian bump-manifest
```

## Scripts

```bash
pnpm install
pnpm check
pnpm release patch
```

## Release

```bash
pnpm release patch
pnpm release minor
pnpm release major
```

Log in once with `pnpm login`. Then `pnpm release patch` on a clean tree: check, bump, tag `vX.Y.Z`, push github then origin, `pnpm publish` (OTP in that terminal). The tag workflow only creates the GitHub release.

The `effect-obsidian` bin (`release` / `bump-manifest`) is for Obsidian plugins, not this package.
