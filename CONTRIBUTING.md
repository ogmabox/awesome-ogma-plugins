# Contributing to Awesome Ogma Plugins

Thank you for building a plugin for Ogma.

## Before You Submit

Your plugin must meet all requirements before a PR will be merged.

### Required files

- `manifest.json` -- valid Ogma plugin manifest with `id`, `version`, `name`, `description`, `author`, `permissions`
- `dist/backend.js` or `dist/plugin.js` -- compiled backend entry point
- `dist/frontend.js` -- compiled frontend entry point (if plugin has a UI)
- `README.md` -- explains what the plugin does, how to install it, and what permissions it needs
- `LICENSE` -- any OSI-approved license

### Code standards

- Source code must be available in the repository (not just a compiled dist)
- No obfuscated code
- No calls to external servers unless clearly documented and the user is informed at install time
- No bundling of known malicious payloads or exploit code (automated security testing payloads are fine if clearly labeled)
- Permissions declared in `manifest.json` must match actual usage

### Plugin manifest required fields

```json
{
  "id": "your-plugin-id",
  "version": "1.0.0",
  "name": "Your Plugin Name",
  "description": "One sentence describing what the plugin does.",
  "author": {
    "name": "Your Name",
    "url": "https://github.com/your-username"
  },
  "permissions": ["..."],
  "backend": "dist/backend.js"
}
```

See [PLUGIN_SPEC.md](PLUGIN_SPEC.md) for the full manifest specification.

## Submission Process

1. **Fork** this repository.
2. **Create** `plugins/<your-plugin-id>/` with:
   - `manifest.json` -- valid Ogma manifest
   - `src/` -- your plugin source files (TypeScript or JavaScript)
   - `dist/` -- compiled output (`backend.js`, `frontend.js`, etc.)
   - `README.md` -- install and usage instructions
   - `LICENSE` -- any OSI-approved license
3. **Do not build or commit a ZIP file.** The CI pipeline builds the ZIP automatically when your PR is merged and publishes it as a GitHub Release. You only need to submit source files.
4. **Add your entry** to `plugins.json` with:
   - `download` set to: `https://github.com/ogmabox/awesome-ogma-plugins/releases/download/<your-plugin-id>-v<version>/<your-plugin-id>.zip`
   - `sha256` set to: `"pending"` -- CI computes and updates this automatically after merge
   - All other required fields filled in
5. **Open a pull request.** CI validates:
   - `plugins.json` schema and required fields
   - Source files exist in `plugins/<your-plugin-id>/`
   - Plugin builds cleanly from source
   - If the plugin is TypeScript (`package.json` present), `npm run build` succeeds
6. A maintainer reviews the pull request. Review time varies. On merge, CI builds the ZIP, publishes the GitHub Release, and updates `plugins.json` with the verified hash.

**Why no manual ZIPs?** The CI pipeline is the trusted builder. It checks out the source from your PR (after review), builds the ZIP in a clean environment, uploads it to GitHub Releases, and updates `plugins.json` with the verified hash. This means:
- The ZIP hash is always computed from reviewed source code.
- Plugin authors cannot substitute a different ZIP after review.
- You never need to build or commit binary artifacts.

## plugins.json Schema

Each entry in the `plugins` array must have these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier. Lowercase letters, digits, hyphens only. |
| `name` | string | Yes | Display name shown in the marketplace. |
| `version` | string | Yes | Current version, semver format (e.g. `1.0.0`). |
| `description` | string | Yes | One or two sentences. No marketing language. |
| `author` | string | Yes | Author name or GitHub username. |
| `homepage` | string | Yes | URL to the plugin documentation or homepage. |
| `download` | string | Yes | GitHub Releases URL for the plugin `.zip` file. Must be `https://github.com/ogmabox/awesome-ogma-plugins/releases/download/<id>-v<version>/<id>.zip`. |
| `sha256` | string | Yes | SHA-256 hex digest of the ZIP file. Verified by Ogma before install. |
| `tags` | string[] | Yes | At least one tag. See tag list below. |
| `ogma_min_version` | string | Yes | Minimum Ogma version required (e.g. `1.0.0`). |
| `permissions` | string[] | Yes | Permissions the plugin requests. |

### Valid tags

`authentication`, `automation`, `brute-force`, `csrf`, `dns`, `encoder-decoder`, `example`, `fuzzing`, `headers`, `idor`, `injection`, `jwt`, `passive`, `reconnaissance`, `reference`, `replay`, `reporting`, `scanner`, `security`, `sqli`, `ssrf`, `ssti`, `utilities`, `websocket`, `xss`, `xxe`

## Example plugins.json entry

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Scans responses for hardcoded API keys.",
  "author": "your-github-username",
  "homepage": "https://github.com/ogmabox/awesome-ogma-plugins/tree/main/plugins/my-plugin",
  "download": "https://github.com/ogmabox/awesome-ogma-plugins/releases/download/my-plugin-v1.0.0/my-plugin.zip",
  "sha256": "pending",
  "tags": ["security", "passive", "reconnaissance"],
  "ogma_min_version": "1.0.0",
  "permissions": ["read_http_history", "write_findings"]
}
```

## Questions

Open an issue in this repository if you have questions about the submission process.
