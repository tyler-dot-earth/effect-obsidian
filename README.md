# effect-obsidian

Effect helpers for Obsidian plugins.

Covers plugin lifetime (`ManagedRuntime` on load/unload), `data.json` load/save, and Schema-decoded settings. It does not import the Obsidian package. Pass `Plugin.loadData` / `Plugin.saveData` in.

Not published to npm. Consume it as a sibling checkout:

```text
~/effect-obsidian
~/obsidian-lanes
```

## Scripts

```bash
pnpm install
pnpm check
```
