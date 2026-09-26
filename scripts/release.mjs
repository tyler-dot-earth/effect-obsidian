#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = join(repoRoot, 'package.json')
const githubRepo = 'tyler-dot-earth/effect-obsidian'

const runReleaseCommand = (command, args) => {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		stdio: 'inherit',
	})

	if (result.error !== undefined) {
		process.stderr.write(`effect-obsidian: release: failed to start ${command}\n`)
		process.exit(1)
	}

	if (result.status !== 0) {
		process.exit(result.status ?? 1)
	}
}

const gitStdout = (args) => {
	const result = spawnSync('git', args, {
		cwd: repoRoot,
		encoding: 'utf8',
	})

	if (result.error !== undefined) {
		process.stderr.write('effect-obsidian: release: failed to start git\n')
		process.exit(1)
	}

	if (result.status !== 0) {
		process.stderr.write(result.stderr)
		process.exit(result.status ?? 1)
	}

	return result.stdout
}

const assertGitWorkingTreeClean = () => {
	if (gitStdout(['status', '--porcelain']).trim() !== '') {
		process.stderr.write('effect-obsidian: release: working tree is dirty\n')
		process.exit(1)
	}
}

const gitRemoteNames = () =>
	gitStdout(['remote'])
		.split(/\s+/u)
		.filter((name) => name.length > 0)

const bumpSemver = (version, bumpKind) => {
	const parts = version.split('.')
	const major = Number(parts[0])
	const minor = Number(parts[1])
	const patch = Number(parts[2])

	if (
		parts.length !== 3 ||
		!Number.isInteger(major) ||
		!Number.isInteger(minor) ||
		!Number.isInteger(patch)
	) {
		process.stderr.write('effect-obsidian: release: package.json version is not x.y.z\n')
		process.exit(1)
	}

	if (bumpKind === 'major') {
		return `${String(major + 1)}.0.0`
	}

	if (bumpKind === 'minor') {
		return `${String(major)}.${String(minor + 1)}.0`
	}

	return `${String(major)}.${String(minor)}.${String(patch + 1)}`
}

const readPackageVersion = () => {
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

	if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
		process.stderr.write('effect-obsidian: release: package.json version is not x.y.z\n')
		process.exit(1)
	}

	return packageJson.version
}

const writePackageVersion = (nextVersion) => {
	const packageJsonText = readFileSync(packageJsonPath, 'utf8')
	const nextPackageJsonText = packageJsonText.replace(
		/("version":\s*")([^"]+)(")/u,
		`$1${nextVersion}$3`,
	)

	if (nextPackageJsonText === packageJsonText) {
		process.stderr.write('effect-obsidian: release: failed to write package.json version\n')
		process.exit(1)
	}

	writeFileSync(packageJsonPath, nextPackageJsonText)
}

const pushReleaseRemotes = () => {
	const remotes = gitRemoteNames()

	if (!remotes.includes('github')) {
		process.stderr.write('effect-obsidian: release: no github remote\n')
		process.exit(1)
	}

	runReleaseCommand('git', ['push', 'github', 'HEAD', '--follow-tags'])

	if (remotes.includes('origin')) {
		runReleaseCommand('git', ['push', 'origin', 'HEAD', '--follow-tags'])
	}
}

const ghIsAvailable = () => {
	const result = spawnSync('gh', ['--version'], {
		cwd: repoRoot,
		stdio: 'ignore',
	})

	return result.status === 0
}

const watchRelease = async () => {
	const commit = gitStdout(['rev-parse', 'HEAD']).trim()

	for (let attempt = 0; attempt < 30; attempt += 1) {
		const result = spawnSync(
			'gh',
			[
				'run',
				'list',
				'--repo',
				githubRepo,
				'--workflow',
				'release.yml',
				'--commit',
				commit,
				'--json',
				'databaseId',
				'--jq',
				'.[0].databaseId // empty',
			],
			{ cwd: repoRoot, encoding: 'utf8' },
		)
		const runId = result.stdout?.trim()

		if (result.status !== 0) {
			throw new Error(
				`effect-obsidian: release pushed, but workflow lookup failed: ${result.stderr}`,
			)
		}

		if (runId) {
			runReleaseCommand('gh', ['run', 'watch', runId, '--repo', githubRepo, '--exit-status'])
			return
		}

		await setTimeout(2000)
	}

	throw new Error(
		'effect-obsidian: release pushed, but no Release workflow run appeared within 60 seconds',
	)
}

const bumpKind = process.argv[2]

if (bumpKind !== 'patch' && bumpKind !== 'minor' && bumpKind !== 'major') {
	process.stderr.write('effect-obsidian: release: usage: pnpm release <patch|minor|major>\n')
	process.exit(1)
}

assertGitWorkingTreeClean()

const nextVersion = bumpSemver(readPackageVersion(), bumpKind)
const tagName = `v${nextVersion}`

if (!gitRemoteNames().includes('github')) {
	process.stderr.write('effect-obsidian: release: no github remote\n')
	process.exit(1)
}

if (gitStdout(['tag', '--list', tagName]).trim()) {
	process.stderr.write('effect-obsidian: release: tag already exists\n')
	process.exit(1)
}

runReleaseCommand('pnpm', ['check'])
writePackageVersion(nextVersion)
runReleaseCommand('git', ['add', packageJsonPath])
runReleaseCommand('git', ['commit', '-m', tagName])
runReleaseCommand('git', ['tag', '-a', tagName, '-m', tagName])
pushReleaseRemotes()
runReleaseCommand('pnpm', ['publish', '--access', 'public', '--no-git-checks'])

if (ghIsAvailable()) {
	await watchRelease()
}
