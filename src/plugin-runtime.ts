import { type Layer, ManagedRuntime } from 'effect'

/**
 * Creates a ManagedRuntime whose lifetime should match one Obsidian plugin instance. Call from
 * Plugin.onload.
 */
export const makePluginRuntime = <R, E>(
	layer: Layer.Layer<R, E>,
): ManagedRuntime.ManagedRuntime<R, E> => ManagedRuntime.make(layer)

/**
 * Disposes a plugin ManagedRuntime. Safe when the runtime was never created. Call from
 * Plugin.onunload.
 */
export const disposePluginRuntime = async (
	runtime: { readonly dispose: () => Promise<void> } | undefined,
): Promise<void> => {
	if (runtime === undefined) {
		return
	}
	await runtime.dispose()
}
