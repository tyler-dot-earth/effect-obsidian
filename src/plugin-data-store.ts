import { Context, Effect, Layer, Ref, Schema } from 'effect'

/** JSON value stored in plugin data.json. */
export const PluginJsonValue = Schema.Json

export type PluginJsonValue = typeof PluginJsonValue.Type

/** Plugin data.json contents, or null when the file is missing. */
export const PluginStoredJson = Schema.NullOr(PluginJsonValue)

export type PluginStoredJson = typeof PluginStoredJson.Type

/** Obsidian Plugin loadData/saveData callbacks, without importing the Obsidian package. */
export interface PluginDataHost {
	readonly loadData: () => Promise<PluginStoredJson>
	readonly saveData: (data: PluginJsonValue) => Promise<void>
}

/** Failed to read the plugin data.json file. */
export class PluginDataLoadError extends Schema.TaggedError<PluginDataLoadError>()(
	'PluginDataLoadError',
	{
		message: Schema.String,
		cause: Schema.Unknown,
	},
) {}

/** Failed to write the plugin data.json file. */
export class PluginDataSaveError extends Schema.TaggedError<PluginDataSaveError>()(
	'PluginDataSaveError',
	{
		message: Schema.String,
		cause: Schema.Unknown,
	},
) {}

/** Reads and writes plugin data.json through Effect. */
export interface PluginDataStoreContract {
	readonly loadJson: () => Effect.Effect<PluginStoredJson, PluginDataLoadError>
	readonly saveJson: (value: PluginJsonValue) => Effect.Effect<void, PluginDataSaveError>
}

/** Service tag for plugin data.json load and save. */
export class PluginDataStore extends Context.Service<PluginDataStore, PluginDataStoreContract>()(
	'effect-obsidian/PluginDataStore',
) {}

/** Wraps Obsidian Plugin loadData/saveData as a PluginDataStore. */
export const pluginDataStoreFromHost = (host: PluginDataHost): PluginDataStoreContract => ({
	loadJson: Effect.fn('PluginDataStore.loadJson')(function* () {
		return yield* Effect.tryPromise({
			try: () => host.loadData(),
			catch: (cause) =>
				new PluginDataLoadError({
					message: 'PluginDataLoadError: failed to load plugin data.json',
					cause,
				}),
		})
	}),
	saveJson: Effect.fn('PluginDataStore.saveJson')(function* (value: PluginJsonValue) {
		yield* Effect.tryPromise({
			try: () => host.saveData(value),
			catch: (cause) =>
				new PluginDataSaveError({
					message: 'PluginDataSaveError: failed to save plugin data.json',
					cause,
				}),
		})
	}),
})

/** Provides PluginDataStore from an Obsidian plugin host. */
export const pluginDataStoreLayerFromHost = (host: PluginDataHost): Layer.Layer<PluginDataStore> =>
	Layer.succeed(PluginDataStore, pluginDataStoreFromHost(host))

/** In-memory PluginDataStore for tests. Missing data is represented as null. */
export const memoryPluginDataStoreLayer = (
	initial: PluginStoredJson = null,
): Layer.Layer<PluginDataStore> =>
	Layer.effect(
		PluginDataStore,
		Effect.gen(function* () {
			const cell = yield* Ref.make<PluginStoredJson>(initial)

			return {
				loadJson: Effect.fn('PluginDataStore.loadJson')(function* () {
					return yield* Ref.get(cell)
				}),
				saveJson: Effect.fn('PluginDataStore.saveJson')(function* (value: PluginJsonValue) {
					yield* Ref.set(cell, value)
				}),
			}
		}),
	)
