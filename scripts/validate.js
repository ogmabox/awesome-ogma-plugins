#!/usr/bin/env node
// Validates plugins.json against the registry schema.
// Run: node scripts/validate.js
// Exits with code 1 if validation fails.

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const REPO_ROOT = path.join(__dirname, '..')
const REGISTRY_PATH = path.join(REPO_ROOT, 'plugins.json')

const REQUIRED_FIELDS = [
  'id', 'name', 'version', 'description', 'author',
  'homepage', 'download', 'sha256', 'tags', 'ogma_min_version', 'permissions',
]

const VALID_TAGS = new Set([
  'authentication', 'automation', 'brute-force', 'csrf', 'dns',
  'encoder-decoder', 'example', 'fuzzing', 'headers', 'idor',
  'injection', 'jwt', 'passive', 'reconnaissance', 'reference',
  'replay', 'reporting', 'scanner', 'security', 'sqli', 'ssrf',
  'ssti', 'utilities', 'websocket', 'xss', 'xxe',
])

const ID_RE = /^[a-z][a-z0-9-]*$/
const SEMVER_RE = /^\d+\.\d+\.\d+$/
const URL_RE = /^https?:\/\/.+/
const SHA256_RE = /^[0-9a-f]{64}$/

// Accepted download URL patterns:
// 1. GitHub Releases (preferred): https://github.com/KaijinLab/awesome-ogma-plugins/releases/download/<tag>/<plugin-id>.zip
// 2. raw.githubusercontent.com (legacy): https://raw.githubusercontent.com/KaijinLab/awesome-ogma-plugins/master/plugins/<id>/<id>.zip
const TRUSTED_DOWNLOAD_RELEASES_RE = /^https:\/\/github\.com\/(?:ogmabox|KaijinLab)\/awesome-ogma-plugins\/releases\/download\/[a-z][a-z0-9-]*-v\d+\.\d+\.\d+\/[a-z][a-z0-9-]*\.zip$/
const TRUSTED_DOWNLOAD_RAW_RE = /^https:\/\/raw\.githubusercontent\.com\/(?:ogmabox|KaijinLab)\/awesome-ogma-plugins\/(?:master|main)\/plugins\/[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*\.zip$/

let errors = []
let warnings = []

function error(msg) { errors.push(msg) }
function warn(msg) { warnings.push(msg) }

let registry
try {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf8')
  registry = JSON.parse(raw)
} catch (e) {
  error('Failed to parse plugins.json: ' + e.message)
  report(); process.exit(1)
}

if (!registry.version) error('Missing top-level "version" field')
if (!Array.isArray(registry.plugins)) {
  error('plugins.json must have a "plugins" array')
  report(); process.exit(1)
}

const seenIds = new Set()

for (let i = 0; i < registry.plugins.length; i++) {
  const plugin = registry.plugins[i]
  const prefix = `plugins[${i}] (${plugin.id || 'unknown'})`

  // Required fields
  for (const field of REQUIRED_FIELDS) {
    if (plugin[field] === undefined || plugin[field] === null || plugin[field] === '') {
      error(`${prefix}: missing required field "${field}"`)
    }
  }

  // id format
  if (plugin.id) {
    if (!ID_RE.test(plugin.id)) error(`${prefix}: id "${plugin.id}" must match /^[a-z][a-z0-9-]*$/`)
    if (seenIds.has(plugin.id)) error(`${prefix}: duplicate id "${plugin.id}"`)
    seenIds.add(plugin.id)
  }

  // version semver
  if (plugin.version && !SEMVER_RE.test(plugin.version)) {
    error(`${prefix}: version "${plugin.version}" must be semver (MAJOR.MINOR.PATCH)`)
  }

  // homepage URL
  if (plugin.homepage && !URL_RE.test(plugin.homepage)) {
    error(`${prefix}: homepage "${plugin.homepage}" must be a valid URL`)
  }

  // SECURITY: download URL must point to this repository
  if (plugin.download) {
    const isReleases = TRUSTED_DOWNLOAD_RELEASES_RE.test(plugin.download)
    const isRaw = TRUSTED_DOWNLOAD_RAW_RE.test(plugin.download)
    if (!isReleases && !isRaw) {
      error(`${prefix}: download URL must be a GitHub Releases URL for this repository. ` +
        `Expected format: https://github.com/ogmabox/awesome-ogma-plugins/releases/download/<id>-v<version>/<id>.zip`)
    }

    // If we have the ZIP locally (e.g., during CI after building), verify the hash
    if (isRaw && plugin.sha256 && SHA256_RE.test(plugin.sha256)) {
      const urlPath = new URL(plugin.download).pathname.split('/').slice(4).join('/')
      const localZipPath = path.join(REPO_ROOT, urlPath)
      if (fs.existsSync(localZipPath)) {
        const zipBytes = fs.readFileSync(localZipPath)
        const actualHash = crypto.createHash('sha256').update(zipBytes).digest('hex')
        if (actualHash !== plugin.sha256.toLowerCase()) {
          error(`${prefix}: sha256 mismatch -- plugins.json has ${plugin.sha256}, ZIP hashes to ${actualHash}`)
        }
      }
      // If ZIP doesn't exist locally, CI will build it separately -- skip hash check here
    }

    // For Releases URLs, the ZIP is not stored in this repo.
    // The release.yml workflow verifies the hash when uploading.
  }

  // sha256 format
  if (plugin.sha256 && plugin.sha256 !== 'pending') {
    if (!SHA256_RE.test(plugin.sha256.toLowerCase())) {
      error(`${prefix}: sha256 "${plugin.sha256}" must be a 64-char lowercase hex string`)
    }
  } else if (plugin.sha256 === 'pending') {
    warn(`${prefix}: sha256 is "pending" -- must be updated by CI after release`)
  }

  // Source files must exist for published plugins
  if (plugin.id) {
    const pluginDir = path.join(REPO_ROOT, 'plugins', plugin.id)
    if (!fs.existsSync(pluginDir)) {
      error(`${prefix}: plugin directory not found at plugins/${plugin.id}/`)
    } else {
      const manifestPath = path.join(pluginDir, 'manifest.json')
      if (!fs.existsSync(manifestPath)) {
        error(`${prefix}: manifest.json not found at plugins/${plugin.id}/manifest.json`)
      }
      if (!fs.existsSync(path.join(pluginDir, 'README.md'))) {
        error(`${prefix}: README.md not found at plugins/${plugin.id}/README.md`)
      }
      if (!fs.existsSync(path.join(pluginDir, 'LICENSE'))) {
        error(`${prefix}: LICENSE not found at plugins/${plugin.id}/LICENSE`)
      }
      const distDir = path.join(pluginDir, 'dist')
      if (!fs.existsSync(distDir)) {
        error(`${prefix}: dist/ directory not found -- run the build before submitting`)
      }
    }
  }

  // tags
  if (Array.isArray(plugin.tags)) {
    if (plugin.tags.length === 0) error(`${prefix}: tags must not be empty`)
    for (const tag of plugin.tags) {
      if (!VALID_TAGS.has(tag)) warn(`${prefix}: unknown tag "${tag}" -- see CONTRIBUTING.md for valid tags`)
    }
  }

  // permissions
  if (plugin.permissions && !Array.isArray(plugin.permissions)) {
    error(`${prefix}: permissions must be an array`)
  }

  // description length
  if (plugin.description && plugin.description.length > 200) {
    warn(`${prefix}: description is ${plugin.description.length} chars -- keep under 200`)
  }
}

function report() {
  if (warnings.length > 0) {
    console.log('Warnings:')
    warnings.forEach(w => console.log('  [WARN] ' + w))
  }
  if (errors.length > 0) {
    console.log('Errors:')
    errors.forEach(e => console.log('  [ERROR] ' + e))
  }
}

report()

if (errors.length > 0) {
  console.log('\nValidation failed: ' + errors.length + ' error(s).')
  process.exit(1)
} else {
  const pendingCount = registry.plugins.filter(p => p.sha256 === 'pending').length
  if (pendingCount > 0) {
    console.log(`plugins.json is valid with ${pendingCount} pending release(s). ${registry.plugins.length} plugin(s) registered.`)
  } else {
    console.log(`plugins.json is valid. ${registry.plugins.length} plugin(s) registered.`)
  }
}
