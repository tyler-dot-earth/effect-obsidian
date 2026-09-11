import { assert, describe, it } from '@effect/vitest'
import { Effect } from 'effect'

import {
	memoryPluginDataStoreLayer,
	PluginDataLoadError,
	PluginDataSaveError,
	PluginDataStore,
	pluginDataStoreFromHost,
} from '#src/plugin-data-store'

describe('PluginDataStore', () => {
	it.effect('round-trips json through the memory store', () =>
		Effect.gen(function* () {
			const store = yield* PluginDataStore
			assert.strictEqual(yield* store.loadJson(), null)
			yield* store.saveJson({ theme: 'dark' })
			assert.deepStrictEqual(yield* store.loadJson(), { theme: 'dark' })
		}).pipe(Effect.provide(memoryPluginDataStoreLayer())),
	)

	it.effect('loads the initial memory value', () =>
		Effect.gen(function* () {
			const store = yield* PluginDataStore
			assert.deepStrictEqual(yield* store.loadJson(), { theme: 'light' })
		}).pipe(Effect.provide(memoryPluginDataStoreLayer({ theme: 'light' }))),
	)

	it.effect('maps host load failures to PluginDataLoadError', () =>
		Effect.gen(function* () {
			const store = pluginDataStoreFromHost({
				loadData: () => Promise.reject(new Error('disk missing')),
				saveData: () => Promise.resolve(),
			})

			const error = yield* Effect.flip(store.loadJson())
			assert.strictEqual(error._tag, 'PluginDataLoadError')
			assert.strictEqual(error.message, 'PluginDataLoadError: failed to load plugin data.json')
			assert.ok(error instanceof PluginDataLoadError)
		}),
	)

	it.effect('maps host save failures to PluginDataSaveError', () =>
		Effect.gen(function* () {
			const store = pluginDataStoreFromHost({
				loadData: () => Promise.resolve(null),
				saveData: () => Promise.reject(new Error('disk full')),
			})

			const error = yield* Effect.flip(store.saveJson({ theme: 'dark' }))
			assert.strictEqual(error._tag, 'PluginDataSaveError')
			assert.strictEqual(error.message, 'PluginDataSaveError: failed to save plugin data.json')
			assert.ok(error instanceof PluginDataSaveError)
		}),
	)
})
