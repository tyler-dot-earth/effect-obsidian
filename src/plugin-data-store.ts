import { Context, Effect, Layer, Option, Ref, Schema } from 'effect'

/** JSON value stored in plugin data.json. */
export const PluginJsonValue = Schema.Json

export type PluginJsonValue = typeof PluginJsonValue.Type

/** Plugin data.json contents, or null when the file is missing. */
export const PluginStoredJson = Schema.NullOr(PluginJsonValue)

export type PluginStoredJson = typeof PluginStoredJson.Type

/**
 * What Obsidian Plugin.loadData() resolves to. Missing data.json is `undefined`. A JSON `null` file
 * is `null`.
 */
export const PluginLoadData = Schema.NullishOr(PluginJsonValue)

export type PluginLoadData = typeof PluginLoadData.Type

/**
 * Obsidian Plugin loadData/saveData callbacks, without importing the Obsidian package.
 *
 * Pass `plugin.loadData` / `plugin.saveData` through. This store maps `undefined` to `null` and
 * rejects non-JSON.
 */
export interface PluginDataHost {
	readonly loadData: () => Promise<PluginLoadData>
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

const pluginStoredJsonFromLoadData = (
	raw: PluginLoadData,
): Effect.Effect<PluginStoredJson, PluginDataLoadError> =>
	Schema.decodeUnknownEffect(PluginLoadData)(raw).pipe(
		Effect.map((loaded) => Option.getOrNull(Option.fromNullishOr(loaded))),
		Effect.mapError(
			(parseError) =>
				new PluginDataLoadError({
					message: 'PluginDataLoadError: plugin data.json was not JSON',
					cause: parseError,
				}),
		),
	)

/** Wraps Obsidian Plugin loadData/saveData as a PluginDataStore. */
export const pluginDataStoreFromHost = (host: PluginDataHost): PluginDataStoreContract =>
	PluginDataStore.of({
		loadJson: Effect.fn('PluginDataStore.loadJson')(function* () {
			const raw = yield* Effect.tryPromise({
				try: () => host.loadData(),
				catch: (cause) =>
					new PluginDataLoadError({
						message: 'PluginDataLoadError: failed to load plugin data.json',
						cause,
					}),
			})

			return yield* pluginStoredJsonFromLoadData(raw)
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

			return PluginDataStore.of({
				loadJson: Effect.fn('PluginDataStore.loadJson')(function* () {
					return yield* Ref.get(cell)
				}),
				saveJson: Effect.fn('PluginDataStore.saveJson')(function* (value: PluginJsonValue) {
					yield* Ref.set(cell, value)
				}),
			})
		}),
	)
