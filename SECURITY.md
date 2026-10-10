# Security Policy

## Reporting a malicious plugin

If you discover that a plugin in this registry is or has become malicious, report it immediately:

1. Open a GitHub issue titled "Security: [plugin-id] -- suspected malicious plugin"
2. Do not include the full exploit details in the public issue
3. Email ask@ogmabox.com with the details (use "Ogma Plugin Security" in the subject)

We aim to remove a confirmed malicious plugin from the registry within 24 hours of verification.

## What happens after a report

1. The plugin entry is removed from `plugins.json` immediately
2. The plugin directory is preserved (renamed to `plugins/quarantine/<id>/`) for forensic review
3. Users who installed the plugin are notified via a release note

## Scope

This policy covers plugins hosted in this repository. We do not control third-party plugins installed outside of this registry.
