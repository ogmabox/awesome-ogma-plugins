import { build } from 'esbuild'

await build({
  entryPoints: ['src/backend.ts'],
  outfile: 'dist/backend.js',
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  external: ['@ogmabox/ogma-sdk'],
})

await build({
  entryPoints: ['src/frontend.ts'],
  outfile: 'dist/frontend.js',
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  external: ['@ogmabox/ogma-sdk'],
})

console.log('Build complete.')
