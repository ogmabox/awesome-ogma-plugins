# Security Headers Checker -- Ogma Plugin

Passively checks HTTP responses for missing or weak security headers. Creates a finding for each gap detected.

## Checks

| Header | Severity |
|--------|----------|
| Content-Security-Policy | High |
| Strict-Transport-Security | Medium |
| X-Frame-Options | Medium |
| X-Content-Type-Options | Low |
| Referrer-Policy | Low |
| Permissions-Policy | Info |

Findings are created only for HTML responses (`text/html` content type). Each finding is deduplicated by header name and host, so the same gap is only reported once per host per session.

## Developer workflow

This plugin demonstrates the TypeScript + esbuild workflow for Ogma plugins.

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)

### Install dependencies

```bash
npm install
```

Installs `@ogmabox/ogma-sdk` (types), `esbuild` (bundler), and `typescript` (type checker).

### Type check

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

Produces `dist/backend.js` and `dist/frontend.js`. The manifest.json points at these files.

### How the build works

`build.mjs` runs two esbuild invocations:

```javascript
// Backend: IIFE bundle, @ogmabox/ogma-sdk external (types only, no runtime code)
await build({
  entryPoints: ['src/backend.ts'],
  outfile: 'dist/backend.js',
  bundle: true,
  format: 'iife',
  external: ['@ogmabox/ogma-sdk'],
  platform: 'neutral',
});
```

The `external: ['@ogmabox/ogma-sdk']` option tells esbuild not to bundle `@ogmabox/ogma-sdk`. It is a types-only package with no runtime code -- the SDK globals are pre-registered by the Ogma runtime before your `init()` function is called.

The IIFE format wraps your module. To make `init` callable by the Ogma runtime, the plugin assigns it to `globalThis` at the end of `src/backend.ts`:

```typescript
(globalThis as unknown as Record<string, unknown>).init = init;
```

### Install in Ogma

Install via the Ogma marketplace: go to **Settings > Plugins > Community** and find **Security Headers Checker**. Or install from source by entering the path to this directory in **Settings > Plugins > Install**.

## Project structure

```
src/backend.ts    -- detection logic (TypeScript, runs in plugin sandbox after build)
src/frontend.ts   -- info panel (TypeScript, runs in sandboxed iframe after build)
dist/             -- compiled output
manifest.json     -- plugin descriptor
build.mjs         -- esbuild build script
```

## Key patterns demonstrated

### Typed SDK access

```typescript
import type { OgmaBackendSdk, HttpRequest, HttpResponse } from '@ogmabox/ogma-sdk';

async function init(sdk: OgmaBackendSdk): Promise<void> {
  sdk.events.onInterceptResponse(function (req: HttpRequest, resp?: HttpResponse) {
    // resp.getHeader(name) -- case-insensitive header lookup
  });
}
```

### Exposing init to the Ogma runtime

esbuild IIFE format wraps the module. The Ogma runtime expects a global `init` function. Assign it at the end of `backend.ts`:

```typescript
(globalThis as unknown as Record<string, unknown>).init = init;
```

### Finding deduplication

Pass `dedupe_key` to `sdk.findings.create`. If a finding with that key already exists, the runtime returns the existing finding instead of creating a duplicate:

```typescript
sdk.findings.create({
  dedupe_key: `security-headers:content-security-policy:example.com`,
  // ...
});
```

### Header lookup

`HttpResponse.getHeader(name)` in the SDK performs case-insensitive lookup and returns `string | undefined`. No custom helper is needed.

## License

MIT
