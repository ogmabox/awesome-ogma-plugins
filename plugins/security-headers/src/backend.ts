// security-headers -- backend
// Passively checks HTML responses for missing or weak security headers.
// Creates a finding for each gap, deduplicated per header+host pair.

import type { OgmaBackendSdk, HttpRequest, HttpResponse } from '@ogmabox/ogma-sdk';

interface HeaderCheck {
  header: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  /** Returns true if the header is missing or has a weak value (finding needed). */
  weak: (value: string | undefined) => boolean;
}

const CHECKS: HeaderCheck[] = [
  {
    header: 'content-security-policy',
    title: 'Missing Content-Security-Policy header',
    description:
      'No Content-Security-Policy header was found. CSP reduces the risk of XSS attacks by restricting what resources the browser can load.',
    severity: 'high',
    weak: (v) => v === undefined,
  },
  {
    header: 'strict-transport-security',
    title: 'Missing or weak Strict-Transport-Security header',
    description:
      'No HSTS header found, or max-age is set to 0 (disabled). Without HSTS, browsers may connect over HTTP, enabling downgrade attacks.',
    severity: 'medium',
    weak: (v) => v === undefined || /max-age\s*=\s*0\b/i.test(v),
  },
  {
    header: 'x-frame-options',
    title: 'Missing X-Frame-Options header',
    description:
      'No X-Frame-Options header was found. The page may be embeddable in an iframe, enabling clickjacking.',
    severity: 'medium',
    weak: (v) => v === undefined,
  },
  {
    header: 'x-content-type-options',
    title: 'Missing or weak X-Content-Type-Options header',
    description:
      'No X-Content-Type-Options: nosniff header. Browsers may MIME-sniff responses, enabling content injection.',
    severity: 'low',
    weak: (v) => v === undefined || !v.toLowerCase().includes('nosniff'),
  },
  {
    header: 'referrer-policy',
    title: 'Missing Referrer-Policy header',
    description:
      'No Referrer-Policy header. The browser may send the full URL as a Referer to third-party sites.',
    severity: 'low',
    weak: (v) => v === undefined,
  },
  {
    header: 'permissions-policy',
    title: 'Missing Permissions-Policy header',
    description:
      'No Permissions-Policy header. Browser features (camera, microphone, geolocation) are not explicitly restricted.',
    severity: 'info',
    weak: (v) => v === undefined,
  },
];

async function init(sdk: OgmaBackendSdk): Promise<void> {
  sdk.console.log('security-headers: started');

  sdk.events.onInterceptResponse(function (req: HttpRequest, resp?: HttpResponse): void {
    if (!resp) return;

    // Only check HTML responses -- skip APIs, static assets, etc.
    const ct = resp.getHeader('content-type') ?? '';
    if (!ct.includes('text/html')) return;

    const host = req.getHost();
    // getId() returns string | null; normalize to undefined for CreateFindingSpec.entry_id
    const entryId = req.getId() ?? undefined;

    for (const check of CHECKS) {
      const headerValue = resp.getHeader(check.header);
      if (!check.weak(headerValue)) continue;

      try {
        sdk.findings.create({
          title: `${check.title} (${host})`,
          severity: check.severity,
          description: check.description,
          dedupe_key: `security-headers:${check.header}:${host}`,
          entry_id: entryId,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        sdk.console.warn(`security-headers: could not create finding: ${msg}`);
      }
    }
  });
}

// Expose init as a global so the Ogma runtime can call it.
// esbuild IIFE format wraps the module body; assigning to globalThis
// makes init visible to the host runtime after the IIFE executes.
(globalThis as unknown as Record<string, unknown>).init = init;
