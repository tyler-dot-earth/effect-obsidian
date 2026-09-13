import { Effect, Schema, Stream } from 'effect'
import { ChildProcess } from 'effect/unstable/process'

/** Failed while checking, versioning, or pushing a plugin release. */
export class PluginReleaseError extends Schema.TaggedError<PluginReleaseError>()(
	'PluginReleaseError',
	{
		message: Schema.String,
	},
) {}

const runInherit = Effect.fnUntraced(function* (command: string, args: readonly string[]) {
	const handle = yield* ChildProcess.make(command, [...args], {
		stdout: 'inherit',
		stderr: 'inherit',
	}).pipe(
		Effect.mapError(
			() =>
				new PluginReleaseError({
					message: `PluginReleaseError: failed to start ${command}`,
				}),
		),
	)

	const code = yield* handle.exitCode.pipe(
		Effect.mapError(
			() =>
				new PluginReleaseError({
					message: `PluginReleaseError: ${command} did not exit`,
				}),
		),
	)

	if (Number(code) !== 0) {
		return yield* new PluginReleaseError({
			message: `PluginReleaseError: ${command} exited ${String(code)}`,
		})
	}

	return yield* Effect.void
})

const gitWorkingTreeDirty = Effect.fnUntraced(function* () {
	const handle = yield* ChildProcess.make('git', ['status', '--porcelain']).pipe(
		Effect.mapError(
			() =>
				new PluginReleaseError({
					message: 'PluginReleaseError: failed to start git status',
				}),
		),
	)

	const [text, code] = yield* Effect.all(
		[
			Stream.mkString(handle.stdout.pipe(Stream.decodeText())).pipe(
				Effect.mapError(
					() =>
						new PluginReleaseError({
							message: 'PluginReleaseError: failed to read git status',
						}),
				),
			),
			handle.exitCode.pipe(
				Effect.mapError(
					() =>
						new PluginReleaseError({
							message: 'PluginReleaseError: git status did not exit',
						}),
				),
			),
		],
		{ concurrency: 2 },
	)

	if (Number(code) !== 0) {
		return yield* new PluginReleaseError({
			message: `PluginReleaseError: git status exited ${String(code)}`,
		})
	}

	return text.trim() !== ''
})

const ghAvailable = ChildProcess.make('gh', ['--version'], {
	stdout: 'ignore',
	stderr: 'ignore',
}).pipe(
	Effect.flatMap((handle) => handle.exitCode),
	Effect.map((code) => Number(code) === 0),
	Effect.orElseSucceed(() => false),
)

/** Checks, bumps, tags, and pushes an Obsidian plugin release. */
export const releaseObsidianPlugin = Effect.fn('PluginRelease.run')(function* (
	bump: 'patch' | 'minor' | 'major',
) {
	if (yield* gitWorkingTreeDirty()) {
		return yield* new PluginReleaseError({
			message: 'PluginReleaseError: working tree is dirty',
		})
	}

	yield* runInherit('pnpm', ['check'])
	yield* runInherit('pnpm', ['version', bump])
	yield* runInherit('git', ['push', 'github', 'HEAD', '--follow-tags'])
	yield* runInherit('git', ['push', 'origin', 'HEAD', '--follow-tags'])

	if (yield* ghAvailable) {
		yield* runInherit('gh', ['run', 'watch', '--exit-status'])
	}

	return yield* Effect.void
})
