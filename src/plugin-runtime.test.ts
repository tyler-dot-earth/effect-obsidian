import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer, Ref } from 'effect'

import { disposePluginRuntime, makePluginRuntime } from '#/src/plugin-runtime'

describe('plugin runtime', () => {
	it.effect('disposing an unused runtime is a no-op', () =>
		Effect.gen(function* () {
			yield* Effect.promise(() => disposePluginRuntime(undefined))
		}),
	)

	it.effect('disposing the plugin runtime runs layer finalizers', () =>
		Effect.gen(function* () {
			const finalized = yield* Ref.make(false)

			const layer = Layer.effectDiscard(
				Effect.acquireRelease(Effect.void, () => Ref.set(finalized, true)),
			)

			const runtime = makePluginRuntime(layer)
			yield* Effect.promise(() => runtime.runPromise(Effect.void))
			yield* Effect.promise(() => disposePluginRuntime(runtime))
			assert.strictEqual(yield* Ref.get(finalized), true)
		}),
	)
})
