import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Config, ConfigProvider, Effect, Layer, Path, Schema } from 'effect'
import { Argument, Command } from 'effect/unstable/cli'

import { bumpObsidianPluginManifestFiles } from './plugin-manifest-bump.ts'
import { releaseObsidianPlugin } from './plugin-release.ts'

const bumpManifest = Command.make('bump-manifest', {}, () =>
	Effect.gen(function* () {
		const version = yield* Config.schema(Schema.String, 'npm_package_version')
		const path = yield* Path.Path

		yield* bumpObsidianPluginManifestFiles(
			path.resolve('manifest.json'),
			path.resolve('versions.json'),
			version,
		)
	}),
)

const release = Command.make(
	'release',
	{
		bump: Argument.Literals('bump', ['patch', 'minor', 'major']).pipe(
			Argument.withDefault('patch' as const),
		),
	},
	({ bump }) => releaseObsidianPlugin(bump),
)

const root = Command.make('effect-obsidian').pipe(
	Command.withDescription('Shared tooling for Obsidian plugins'),
	Command.withSubcommands([bumpManifest, release]),
)

const MainLive = Layer.mergeAll(NodeServices.layer, ConfigProvider.layer(ConfigProvider.fromEnv()))

root.pipe(
	Command.run({ version: '0.0.1' }),
	Effect.scoped,
	Effect.provide(MainLive),
	NodeRuntime.runMain,
)
