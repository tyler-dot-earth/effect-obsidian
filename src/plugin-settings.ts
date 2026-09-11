import { Effect, Schema } from 'effect'

import {
	type PluginDataLoadError,
	type PluginDataSaveError,
	PluginDataStore,
	PluginJsonValue,
	type PluginStoredJson,
} from '#src/plugin-data-store'

/** Plugin data.json did not match the settings schema. */
export class PluginSettingsDecodeError extends Schema.TaggedError<PluginSettingsDecodeError>()(
	'PluginSettingsDecodeError',
	{
		message: Schema.String,
		parseError: Schema.Unknown,
	},
) {}

/** Plugin settings could not be encoded for data.json. */
export class PluginSettingsEncodeError extends Schema.TaggedError<PluginSettingsEncodeError>()(
	'PluginSettingsEncodeError',
	{
		message: Schema.String,
		parseError: Schema.Unknown,
	},
) {}

const isMissingPluginData = (raw: PluginStoredJson): boolean => raw === null

/**
 * Loads plugin settings from data.json and decodes them with the given schema.
 *
 * Missing data (null) returns fallback. Malformed data fails with PluginSettingsDecodeError.
 */
export const loadPluginSettings: <S extends Schema.Constraint>(options: {
	readonly schema: S
	readonly fallback: S['Type']
}) => Effect.Effect<
	S['Type'],
	PluginDataLoadError | PluginSettingsDecodeError,
	PluginDataStore | S['DecodingServices']
> = Effect.fn('PluginSettings.load')(function* (options) {
	const store = yield* PluginDataStore
	const raw = yield* store.loadJson()

	if (isMissingPluginData(raw)) {
		return options.fallback
	}

	return yield* Schema.decodeUnknownEffect(options.schema)(raw).pipe(
		Effect.mapError(
			(parseError) =>
				new PluginSettingsDecodeError({
					message: 'PluginSettingsDecodeError: plugin data.json failed schema decode',
					parseError,
				}),
		),
	)
})

/** Encodes plugin settings and writes them to data.json. */
export const savePluginSettings: <S extends Schema.Constraint>(options: {
	readonly schema: S
	readonly value: S['Type']
}) => Effect.Effect<
	void,
	PluginDataSaveError | PluginSettingsEncodeError,
	PluginDataStore | S['EncodingServices']
> = Effect.fn('PluginSettings.save')(function* (options) {
	const store = yield* PluginDataStore

	const encoded = yield* Schema.encodeUnknownEffect(options.schema)(options.value).pipe(
		Effect.mapError(
			(parseError) =>
				new PluginSettingsEncodeError({
					message: 'PluginSettingsEncodeError: plugin settings failed schema encode',
					parseError,
				}),
		),
	)

	const json = yield* Schema.decodeUnknownEffect(PluginJsonValue)(encoded).pipe(
		Effect.mapError(
			(parseError) =>
				new PluginSettingsEncodeError({
					message: 'PluginSettingsEncodeError: plugin settings failed schema encode',
					parseError,
				}),
		),
	)

	yield* store.saveJson(json)
})
