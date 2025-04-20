# build.mjs

## Summary
Script that bundles the CLI source using esbuild into `dist/cli.js` (production) or
`dist/cli-dev.js` (development). Configures build mode, injects source-map support,
and strips out `react-devtools-core` imports via a custom plugin.

## Functionalities
*(none)*