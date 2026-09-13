import { Effect, FileSystem, Predicate, Schema } from 'effect'

/** Failed to update manifest.json or versions.json. */
export class PluginManifestBumpError extends Schema.TaggedError<PluginManifestBumpError>()(
	'PluginManifestBumpError',
	{
		message: Schema.String,
	},
) {}

/** Writes package version into manifest.json and versions.json. */
export const bumpObsidianPluginManifestFiles: (
	manifestPath: string,
	versionsPath: string,
	version: string,
) => Effect.Effect<void, PluginManifestBumpError, FileSystem.FileSystem> = Effect.fn(
	'PluginManifest.bumpFiles',
)(function* (manifestPath, versionsPath, version) {
	const fs = yield* FileSystem.FileSystem

	const manifestRaw = yield* fs.readFileString(manifestPath).pipe(
		Effect.mapError(
			() =>
				new PluginManifestBumpError({
					message: 'PluginManifestBumpError: failed to read manifest.json',
				}),
		),
	)

	const manifestJson = yield* Effect.try({
		try: () => JSON.parse(manifestRaw),
		catch: () =>
			new PluginManifestBumpError({
				message: 'PluginManifestBumpError: manifest.json is not JSON',
			}),
	})

	if (
		!Predicate.hasProperty(manifestJson, 'minAppVersion') ||
		!Predicate.isString(manifestJson.minAppVersion)
	) {
		return yield* new PluginManifestBumpError({
			message: 'PluginManifestBumpError: manifest.json minAppVersion is missing',
		})
	}

	const minAppVersion = manifestJson.minAppVersion
	const nextManifest = Object.assign({}, manifestJson, { version })

	yield* fs.writeFileString(manifestPath, JSON.stringify(nextManifest, null, '\t')).pipe(
		Effect.mapError(
			() =>
				new PluginManifestBumpError({
					message: 'PluginManifestBumpError: failed to write manifest.json',
				}),
		),
	)

	const versionsRaw = yield* fs.readFileString(versionsPath).pipe(
		Effect.mapError(
			() =>
				new PluginManifestBumpError({
					message: 'PluginManifestBumpError: failed to read versions.json',
				}),
		),
	)

	const versionsJson = yield* Effect.try({
		try: () => JSON.parse(versionsRaw),
		catch: () =>
			new PluginManifestBumpError({
				message: 'PluginManifestBumpError: versions.json is not JSON',
			}),
	})

	if (!Predicate.hasProperty(versionsJson, version)) {
		const nextVersions = Object.assign({}, versionsJson, { [version]: minAppVersion })

		yield* fs.writeFileString(versionsPath, JSON.stringify(nextVersions, null, '\t')).pipe(
			Effect.mapError(
				() =>
					new PluginManifestBumpError({
						message: 'PluginManifestBumpError: failed to write versions.json',
					}),
			),
		)
	}

	return yield* Effect.void
})
