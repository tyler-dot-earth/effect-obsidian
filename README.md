# effect-obsidian

Effect helpers for Obsidian plugins. Peer on Effect v4 rc.

Covers plugin lifetime (`ManagedRuntime` on load/unload), `data.json` load/save, and Schema-decoded settings. It does not import the Obsidian package. Pass `Plugin.loadData` / `Plugin.saveData` in. Missing data is `null`. Normalize Obsidian's `undefined` before the host callback resolves.

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
