import esbuild from 'esbuild'

await esbuild.build({
	entryPoints: ['src/effect-obsidian-cli.ts'],
	bundle: true,
	platform: 'node',
	format: 'esm',
	outfile: 'dist/cli.mjs',
	packages: 'external',
	banner: {
		js: '#!/usr/bin/env node\n',
	},
	logLevel: 'info',
})
