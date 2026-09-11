import { assert, describe, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'

import { memoryPluginDataStoreLayer, PluginDataStore } from '#src/plugin-data-store'
import { loadPluginSettings, savePluginSettings } from '#src/plugin-settings'

const SampleSettings = Schema.Struct({
	theme: Schema.String,
})

const fallback = SampleSettings.make({ theme: 'light' })

describe('plugin settings', () => {
	it.effect('returns fallback when plugin data is missing', () =>
		Effect.gen(function* () {
			const settings = yield* loadPluginSettings({
				schema: SampleSettings,
				fallback,
			})

			assert.deepStrictEqual(settings, fallback)
		}).pipe(Effect.provide(memoryPluginDataStoreLayer())),
	)

	it.effect('decodes stored plugin data', () =>
		Effect.gen(function* () {
			const settings = yield* loadPluginSettings({
				schema: SampleSettings,
				fallback,
			})

			assert.deepStrictEqual(settings, { theme: 'dark' })
		}).pipe(Effect.provide(memoryPluginDataStoreLayer({ theme: 'dark' }))),
	)

	it.effect('fails decode when plugin data does not match the schema', () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(
				loadPluginSettings({
					schema: SampleSettings,
					fallback,
				}),
			)

			assert.strictEqual(error._tag, 'PluginSettingsDecodeError')
			assert.strictEqual(
				error.message,
				'PluginSettingsDecodeError: plugin data.json failed schema decode',
			)
		}).pipe(Effect.provide(memoryPluginDataStoreLayer({ theme: 1 }))),
	)

	it.effect('round-trips settings through save and load', () =>
		Effect.gen(function* () {
			yield* savePluginSettings({
				schema: SampleSettings,
				value: { theme: 'dark' },
			})

			const settings = yield* loadPluginSettings({
				schema: SampleSettings,
				fallback,
			})

			assert.deepStrictEqual(settings, { theme: 'dark' })
			const store = yield* PluginDataStore
			assert.deepStrictEqual(yield* store.loadJson(), { theme: 'dark' })
		}).pipe(Effect.provide(memoryPluginDataStoreLayer())),
	)
})
