# Security Policy

VoiceStudio implements security and privacy protections across both Progressive Web App (PWA) and Chrome Extension (MV3) environments.

---

## Supported Versions

Security updates and patches are provided for the following release lines:

| Version | Supported | Notes |
| :--- | :---: | :--- |
| `0.1.x` | :white_check_mark: | Current active release branch |
| `1.x.x` | :white_check_mark: | Production release track |
| `< 0.1.0` | :x: | Unsupported prototype builds |

---

## Reporting a Vulnerability

If you discover a security vulnerability or potential privacy issue in VoiceStudio:

1. **Do not open a public GitHub issue.** Public issues disclose vulnerabilities before patches can be published.
2. Submit a private report through [GitHub Security Advisories](https://github.com/ncouture/web-recording/security/advisories/new).
3. If GitHub Advisories are unavailable, contact the maintainers by email with the subject line `[SECURITY] VoiceStudio Vulnerability Report`.

### Report Contents
Include the following information in your report:
* Description of the vulnerability and attack vector.
* Affected target (Progressive Web App, Chrome Extension MV3, or both).
* Steps to reproduce or a minimal proof of concept.
* Assessment of impact (privilege escalation, CSP bypass, data access).

### Response Expectations
* **Acknowledgment**: Within 48 hours of receipt.
* **Triage**: Within 5 business days.
* **Disclosure**: Coordinated disclosure after a verified patch is released.

---

## Architecture and Defense-in-Depth

VoiceStudio maintains boundaries between the public web runtime and the browser extension environment:

```
┌────────────────────────────────────────────────────────┐
│               Security Architecture Model               │
├───────────────────────────┬────────────────────────────┤
│   Chrome Extension (MV3)  │      PWA / Firebase        │
├───────────────────────────┼────────────────────────────┤
│ • script-src 'self'       │ • Strict CSP HTTP headers  │
│ • No remote code / eval   │ • X-Frame-Options: DENY    │
│ • No inline scripts       │ • Permissions-Policy lock  │
│ • Ephemeral Service Worker│ • Origin-scoped IndexedDB  │
│ • Isolated extension APIs │ • Local offline SW cache   │
└───────────────────────────┴────────────────────────────┘
```

### 1. Zero-Inline-Script Policy
* Neither the PWA nor the Chrome Extension includes inline scripts (`<script>...</script>`) or inline event handlers (`onclick`, `onload`).
* JavaScript is bundled locally into immutable modules loaded via `<script type="module" src="...">`.
* External script loading from third-party CDNs is prohibited.

### 2. Manifest V3 Extension Isolation
* The extension conforms to Chrome Manifest V3 specifications.
* Extension APIs (`chrome.*`) are restricted to extension pages and the background service worker, isolated from untrusted web content.
* Dynamic evaluation (`eval()`, `new Function()`, `setTimeout(string)`) is prohibited by the extension CSP.

### 3. Firebase Hosting Security Headers
When deployed to Firebase Hosting, responses include HTTP security headers configured in [firebase.json](firebase.json):
* `Content-Security-Policy`: Restricts scripts, styles, objects, frames, and network connections.
* `X-Frame-Options: DENY`: Mitigates clickjacking.
* `X-Content-Type-Options: nosniff`: Prevents MIME-type confusion attacks.
* `Permissions-Policy: camera=(), microphone=(self), display-capture=(self)`: Disables camera access and limits microphone capture to the application origin.
* `Strict-Transport-Security`: Enforces HTTPS transport with preloading.

### 4. Client-Side Data Privacy
* Audio recordings and metadata stay in the user's browser sandbox (`IndexedDB`).
* Audio data and transcripts are not transmitted to remote telemetry services or external servers.

### 5. Anomaly Circuit Breaker
* The client-side [TelemetryCircuitBreaker](src/core/telemetry.ts) monitors `securitypolicyviolation` events and unhandled promise rejections.
* When anomalies exceed thresholds, recording operations are disabled to prevent abuse.

---

## Supply Chain and Release Integrity

VoiceStudio implements controls to verify dependency and pipeline integrity:

* **Immutable Action Pinning (Ratchet)**: All third-party GitHub Actions across workflows are pinned to full commit SHAs using [`sethvargo/ratchet`](https://github.com/sethvargo/ratchet), preventing mutable tag poisoning and upstream compromise.
* **Pre-commit Enforcement**: Git hooks ([`scripts/git-hooks/pre-commit`](scripts/git-hooks/pre-commit) and [`.pre-commit-config.yaml`](.pre-commit-config.yaml)) automatically check and pin workflow action references before code is committed.
* **Continuous Integration Gates**: The security pipeline ([`.github/workflows/security-ci.yml`](.github/workflows/security-ci.yml)) runs `npm run ratchet:lint` on all pull requests and pushes to `main`, blocking unpinned references.
* **Least-Privilege Permissions**: Repository workflows operate with read-only defaults (`default_workflow_permissions: read`), with explicit minimal permissions declared at the job level (`contents: write`, `pull-requests: write`).
* **Cryptographic Release Checksums**: Automated release builds published via [`.github/workflows/release.yml`](.github/workflows/release.yml) generate SHA256 checksums (`checksums.sha256`) for all distribution archives.
* **Dependency Auditing**: Automated dependency audits (`npm audit`) run on pull requests to identify known vulnerabilities.
