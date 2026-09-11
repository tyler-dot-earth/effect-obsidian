import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer, Ref } from 'effect'

import { disposePluginRuntime, makePluginRuntime } from '#src/plugin-runtime'

describe('plugin runtime', () => {
	it('disposing an unused runtime is a no-op', async () => {
		await disposePluginRuntime(undefined)
		assert.ok(true)
	})

	it('disposing the plugin runtime runs layer finalizers', async () => {
		const finalized = await Effect.runPromise(Ref.make(false))
		const layer = Layer.effectDiscard(
			Effect.acquireRelease(Effect.void, () => Ref.set(finalized, true)),
		)
		const runtime = makePluginRuntime(layer)
		await runtime.runPromise(Effect.void)
		await disposePluginRuntime(runtime)
		assert.strictEqual(await Effect.runPromise(Ref.get(finalized)), true)
	})
})
