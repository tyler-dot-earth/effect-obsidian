import { assert, describe, it } from '@effect/vitest'
import { Effect, FileSystem, Ref } from 'effect'

import { bumpObsidianPluginManifestFiles } from '#/src/plugin-manifest-bump'

describe('bumpObsidianPluginManifestFiles', () => {
	it.effect('writes version into manifest.json and versions.json', () =>
		Effect.gen(function* () {
			const files = yield* Ref.make({
				'manifest.json': '{"id":"lanes","minAppVersion":"1.10.0","version":"0.1.0"}',
				'versions.json': '{}',
			})

			const fs = FileSystem.makeNoop({
				readFileString: (path) =>
					Ref.get(files).pipe(
						Effect.map((store) => {
							if (path === 'manifest.json') {
								return store['manifest.json']
							}

							return store['versions.json']
						}),
					),
				writeFileString: (path, content) =>
					Ref.update(files, (store) => {
						if (path === 'manifest.json') {
							return {
								'manifest.json': content,
								'versions.json': store['versions.json'],
							}
						}

						return {
							'manifest.json': store['manifest.json'],
							'versions.json': content,
						}
					}),
			})

			yield* bumpObsidianPluginManifestFiles('manifest.json', 'versions.json', '0.1.1').pipe(
				Effect.provideService(FileSystem.FileSystem, fs),
			)

			const store = yield* Ref.get(files)

			assert.ok(store['manifest.json'].includes('"version": "0.1.1"'))
			assert.ok(store['versions.json'].includes('"0.1.1": "1.10.0"'))
		}),
	)
})
