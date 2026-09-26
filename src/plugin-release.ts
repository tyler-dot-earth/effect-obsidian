import { Effect, FileSystem, Schema, Stream } from 'effect'
import { ChildProcess } from 'effect/unstable/process'

import { githubRepoFromRemoteUrl } from '#/src/plugin-github-repo'

/** Failed while checking, versioning, or pushing a plugin release. */
export class PluginReleaseError extends Schema.TaggedError<PluginReleaseError>()(
	'PluginReleaseError',
	{
		message: Schema.String,
	},
) {}

const PackageVersionFile = Schema.Struct({
	version: Schema.String,
})

const GithubRunList = Schema.Array(
	Schema.Struct({
		databaseId: Schema.Number,
	}),
)

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

const commandStdout = Effect.fnUntraced(function* (command: string, args: readonly string[]) {
	const handle = yield* ChildProcess.make(command, [...args]).pipe(
		Effect.mapError(
			() =>
				new PluginReleaseError({
					message: `PluginReleaseError: failed to start ${command}`,
				}),
		),
	)

	const [text, code] = yield* Effect.all(
		[
			Stream.mkString(handle.stdout.pipe(Stream.decodeText())).pipe(
				Effect.mapError(
					() =>
						new PluginReleaseError({
							message: `PluginReleaseError: failed to read ${command} stdout`,
						}),
				),
			),
			handle.exitCode.pipe(
				Effect.mapError(
					() =>
						new PluginReleaseError({
							message: `PluginReleaseError: ${command} did not exit`,
						}),
				),
			),
		],
		{ concurrency: 2 },
	)

	if (Number(code) !== 0) {
		return yield* new PluginReleaseError({
			message: `PluginReleaseError: ${command} exited ${String(code)}`,
		})
	}

	return text
})

const gitWorkingTreeDirty = Effect.fnUntraced(function* () {
	const text = yield* commandStdout('git', ['status', '--porcelain'])

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

const readPackageJsonVersion = Effect.fnUntraced(function* () {
	const fs = yield* FileSystem.FileSystem

	const raw = yield* fs.readFileString('package.json').pipe(
		Effect.mapError(
			() =>
				new PluginReleaseError({
					message: 'PluginReleaseError: failed to read package.json',
				}),
		),
	)

	const decoded = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(PackageVersionFile))(
		raw,
	).pipe(
		Effect.mapError(
			() =>
				new PluginReleaseError({
					message: 'PluginReleaseError: package.json version is missing',
				}),
		),
	)

	return decoded.version
})

const githubRepoFromGithubRemote = Effect.fnUntraced(function* () {
	const url = yield* commandStdout('git', ['remote', 'get-url', 'github'])
	const repo = githubRepoFromRemoteUrl(url)

	if (repo === null) {
		return yield* new PluginReleaseError({
			message: 'PluginReleaseError: github remote is not a GitHub URL',
		})
	}

	return repo
})

const githubReleaseRunId = Effect.fnUntraced(function* (repo: string, commit: string) {
	const raw = yield* commandStdout('gh', [
		'run',
		'list',
		'--repo',
		repo,
		'--workflow',
		'release.yml',
		'--commit',
		commit,
		'--json',
		'databaseId',
	])

	const runs = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(GithubRunList))(raw).pipe(
		Effect.mapError(
			() =>
				new PluginReleaseError({
					message: 'PluginReleaseError: failed to parse gh run list',
				}),
		),
	)

	return runs[0]?.databaseId ?? null
})

const watchGithubReleaseRun = Effect.fnUntraced(function* () {
	const repo = yield* githubRepoFromGithubRemote()
	const commit = (yield* commandStdout('git', ['rev-parse', 'HEAD'])).trim()

	for (let attempt = 0; attempt < 30; attempt += 1) {
		const runId = yield* githubReleaseRunId(repo, commit)

		if (runId !== null) {
			yield* runInherit('gh', ['run', 'watch', String(runId), '--repo', repo, '--exit-status'])

			return yield* Effect.void
		}

		yield* Effect.sleep('2 seconds')
	}

	return yield* new PluginReleaseError({
		message: 'PluginReleaseError: no GitHub Release workflow run appeared within 60 seconds',
	})
})

/** Checks, bumps, tags without v, and pushes an Obsidian plugin release. */
export const releaseObsidianPlugin = Effect.fn('PluginRelease.run')(function* (
	bump: 'patch' | 'minor' | 'major',
) {
	if (yield* gitWorkingTreeDirty()) {
		return yield* new PluginReleaseError({
			message: 'PluginReleaseError: working tree is dirty',
		})
	}

	yield* runInherit('pnpm', ['check'])
	yield* runInherit('pnpm', ['version', bump, '--no-git-tag-version'])

	const version = yield* readPackageJsonVersion()

	yield* runInherit('git', ['add', 'package.json', 'manifest.json', 'versions.json'])
	yield* runInherit('git', ['commit', '-m', version])
	yield* runInherit('git', ['tag', version])
	yield* runInherit('git', ['push', 'github', 'HEAD', '--follow-tags'])
	yield* runInherit('git', ['push', 'origin', 'HEAD', '--follow-tags'])

	if (yield* ghAvailable) {
		yield* watchGithubReleaseRun()
	}

	return yield* Effect.void
})
