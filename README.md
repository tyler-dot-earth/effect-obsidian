# effect-obsidian

Effect helpers for Obsidian plugins. Peer on Effect v4 rc.

This is not an Effect wrapper for the Obsidian API. It covers two Plugin methods from the official [Settings](https://docs.obsidian.md/Plugins/User+interface/Settings) guide, `loadData` and `saveData`, plus a `ManagedRuntime` whose lifetime matches `onload` / `onunload`. Schema decode replaces the sample plugin's `Object.assign({}, DEFAULT, await this.loadData())`.

Pass `plugin.loadData` and `plugin.saveData` through. Missing data (`undefined` or `null`) becomes `null`. Non-JSON fails as `PluginDataLoadError`. The package does not import `obsidian`.

Everything else stays in the plugin. Commands, views, vault, workspace, editor, Bases, settings tabs, `onExternalSettingsChange`, ribbon, status bar. Call those on `Plugin` and `App` as usual.

Not on npm yet. Consume it as a sibling checkout:

```text
~/effect-obsidian
~/obsidian-lanes
~/obsidian-forest
```

```json
{
	"dependencies": {
		"effect": "4.0.0-rc.113",
		"effect-obsidian": "file:../effect-obsidian"
	}
}
```

## Scripts

```bash
pnpm install
pnpm check
```
