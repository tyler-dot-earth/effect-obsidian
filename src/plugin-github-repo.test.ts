import { assert, describe, it } from '@effect/vitest'
import { Effect } from 'effect'

import { githubRepoFromRemoteUrl } from '#/src/plugin-github-repo'

describe('githubRepoFromRemoteUrl', () => {
	it.effect('parses ssh GitHub remotes', () =>
		Effect.sync(() => {
			assert.strictEqual(
				githubRepoFromRemoteUrl('git@github.com:tyler-dot-earth/obsidian-lanes.git'),
				'tyler-dot-earth/obsidian-lanes',
			)
		}),
	)

	it.effect('parses https GitHub remotes', () =>
		Effect.sync(() => {
			assert.strictEqual(
				githubRepoFromRemoteUrl('https://github.com/tyler-dot-earth/obsidian-lanes.git'),
				'tyler-dot-earth/obsidian-lanes',
			)
		}),
	)

	it.effect('parses ssh protocol GitHub remotes', () =>
		Effect.sync(() => {
			assert.strictEqual(
				githubRepoFromRemoteUrl('ssh://git@github.com/tyler-dot-earth/obsidian-lanes.git'),
				'tyler-dot-earth/obsidian-lanes',
			)
		}),
	)

	it.effect('returns null for non-GitHub remotes', () =>
		Effect.sync(() => {
			assert.strictEqual(
				githubRepoFromRemoteUrl('ssh://git@gitea.example/tyler/obsidian-lanes.git'),
				null,
			)
		}),
	)
})
