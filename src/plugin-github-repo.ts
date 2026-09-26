const GITHUB_REMOTE_PREFIXES = [
	'git@github.com:',
	'https://github.com/',
	'ssh://git@github.com/',
] as const

/** Owner/name from a GitHub remote URL, or null if the URL is not GitHub. */
export const githubRepoFromRemoteUrl = (url: string): string | null => {
	const trimmed = url.trim().replace(/\.git$/u, '')

	for (const prefix of GITHUB_REMOTE_PREFIXES) {
		if (!trimmed.startsWith(prefix)) {
			continue
		}

		const repo = trimmed.slice(prefix.length)

		return repo === '' ? null : repo
	}

	return null
}
