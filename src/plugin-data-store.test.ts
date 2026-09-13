import { assert, describe, it } from '@effect/vitest'
import { Effect } from 'effect'

import {
	memoryPluginDataStoreLayer,
	PluginDataLoadError,
	PluginDataSaveError,
	PluginDataStore,
	pluginDataStoreFromHost,
} from '#/src/plugin-data-store'

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

	it.effect('maps missing host data to null', () =>
		Effect.gen(function* () {
			const store = pluginDataStoreFromHost({
				loadData: () => Promise.resolve(undefined),
				saveData: () => Promise.resolve(),
			})

			assert.strictEqual(yield* store.loadJson(), null)
		}),
	)

	it.effect('keeps json objects from the host', () =>
		Effect.gen(function* () {
			const store = pluginDataStoreFromHost({
				loadData: () => Promise.resolve({ theme: 'dark' }),
				saveData: () => Promise.resolve(),
			})

			assert.deepStrictEqual(yield* store.loadJson(), { theme: 'dark' })
		}),
	)

	it.effect('maps host load failures to PluginDataLoadError', () =>
		Effect.gen(function* () {
			const store = pluginDataStoreFromHost({
				loadData: () => Promise.reject(new Error('disk missing')),
				saveData: () => Promise.resolve(),
			})

			const error = yield* Effect.flip(store.loadJson())
			assert.ok(error instanceof PluginDataLoadError)
			assert.strictEqual(error.message, 'PluginDataLoadError: failed to load plugin data.json')
		}),
	)

	it.effect('maps host save failures to PluginDataSaveError', () =>
		Effect.gen(function* () {
			const store = pluginDataStoreFromHost({
				loadData: () => Promise.resolve(null),
				saveData: () => Promise.reject(new Error('disk full')),
			})

			const error = yield* Effect.flip(store.saveJson({ theme: 'dark' }))
			assert.ok(error instanceof PluginDataSaveError)
			assert.strictEqual(error.message, 'PluginDataSaveError: failed to save plugin data.json')
		}),
	)
})
