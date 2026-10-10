# Ogma Plugin Specification

This document describes the plugin package format for Ogma plugins.

## Package Structure

An Ogma plugin is a directory (or `.zip` archive) with this layout:

```
my-plugin/
  manifest.json          -- required: plugin descriptor
  dist/
    backend.js           -- compiled backend entry point (if backend plugin)
    frontend.js          -- compiled frontend entry point (if frontend plugin)
    style.css            -- optional: frontend styles
  README.md              -- required for registry submission
  LICENSE                -- required for registry submission
  src/                   -- optional: TypeScript/JS source files
```

## manifest.json Fields

### Required fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | string | `"security-headers"` | Unique. Lowercase, digits, hyphens. No dots. |
| `version` | string | `"1.0.0"` | Semver: MAJOR.MINOR.PATCH only. |

### Optional fields (recommended)

| Field | Type | Example |
|-------|------|---------|
| `name` | string | `"Security Headers Checker"` |
| `description` | string | `"Checks responses for missing security headers."` |
| `author` | object | `{ "name": "Alice", "url": "https://example.com" }` |
| `homepage` | string | URL to documentation |
| `permissions` | string[] | `["write_findings", "ui_extension"]` |

### Short-form manifest (recommended for simple plugins)

```json
{
  "id": "my-plugin",
  "version": "1.0.0",
  "name": "My Plugin",
  "description": "Does something useful.",
  "permissions": ["read_http_history"],
  "backend": "dist/backend.js",
  "frontend": {
    "entrypoint": "dist/frontend.js",
    "style": "dist/style.css"
  }
}
```

The `backend` and `frontend` keys are expanded by Ogma at install time. A `plugins` array is also accepted for advanced cases.

## Backend Plugin API

The backend runs in a QuickJS sandbox. The `init(sdk)` function is called once at enable time.

```javascript
async function init(sdk) {
  sdk.console.log("Plugin started");

  // Register an RPC handler callable from the frontend
  sdk.api.register("getData", function(query) {
    return sdk.requests.search({ q: query, limit: 20 });
  });

  // Listen for intercepted requests
  sdk.events.onInterceptRequest(async function(req) {
    // req is a Request object
  });
}
```

### Responding to HTTP responses

```javascript
sdk.events.onInterceptResponse(async function(req, resp) {
  // resp may be undefined if no response was captured
  if (!resp) return;
  const status = resp.getCode();
  const body = resp.getBody()?.toText() ?? '';
  sdk.console.log("Response: " + status);
});
```

### Creating findings

Requires the `write_findings` permission. Only callable from event callbacks.

```javascript
sdk.events.onInterceptResponse(async function(req, resp) {
  if (!resp) return;
  const body = resp.getBody()?.toText() ?? '';
  if (body.includes('X-Powered-By')) {
    await sdk.findings.create({
      title: "Framework version disclosed: " + req.getHost(),
      severity: "info",
      dedupe_key: "framework-disclosure:" + req.getHost(),
    });
  }
});
```
```

**Key constraints:**
- No `import` or `require` -- all code must be in one file or pre-bundled
- No `fetch`, `XMLHttpRequest`, or `WebSocket`
- Max script size: 256 KB
- Runtime: QuickJS (ES2020 subset)
- Available globals: `RequestSpec`, `RequestSpecRaw`, `Body`, `OgmaError`

## Frontend Plugin API

The frontend runs in a sandboxed iframe (`sandbox="allow-scripts"`).

```javascript
(function() {
  window.ogmaSDK.ready(function(sdk) {
    sdk.sidebar.registerItem("My Plugin", "/my-plugin");
    sdk.navigation.addPage("/my-plugin", { title: "My Plugin" });

    const root = document.createElement("div");
    document.body.appendChild(root);
  });
})();
```

### Receiving backend events

```javascript
sdk.backend.onEvent(function(e) {
  // e.event -- the event name string passed to sdk.api.send()
  // e.args  -- array of arguments passed to sdk.api.send()
  if (e.event === "count_update") {
    const count = e.args[0]?.count;
    countEl.textContent = String(count || 0);
  }
});
```

The `e.args` array contains the arguments passed to `sdk.api.send(eventName, arg1, arg2, ...)`.

**Key constraints:**
- No `localStorage` (opaque iframe origin)
- No access to parent DOM
- Use `sdk.backend.call(name, ...args)` for backend RPC
- Use `sdk.backend.onEvent(fn)` for backend push events

## Permissions Reference

| Permission | Auto-granted | Description |
|------------|-------------|-------------|
| `read_http_history` | Yes | Read captured requests and responses |
| `write_findings` | No | Create and update findings |
| `send_requests` | No | Send HTTP requests via the proxy |
| `plugin_storage` | No | Read and write files in the plugin data directory |
| `ui_extension` | Yes | Register sidebar items and navigation pages |
| `read_scope` | Yes | Read the active scope |
| `read_findings` | Yes | List and read findings |

## Build Workflow (TypeScript plugins)

```bash
# Install dependencies
npm install

# Type-check
npm run typecheck   # or: tsc --noEmit

# Build
npm run build       # runs esbuild, outputs to dist/
```

The esbuild command for a backend plugin:
```bash
esbuild src/backend.ts --bundle --platform=neutral --format=iife --external:@ogmabox/ogma-sdk --outfile=dist/backend.js
```

`@ogmabox/ogma-sdk` is available on the public npm registry:
```bash
npm install --save-dev @ogmabox/ogma-sdk
```

## Changelog

- 1.0.0 -- Initial specification
