# Security Policy

VoiceStudio is committed to ensuring the security, integrity, and privacy of its users across both web and browser extension runtimes.

---

## Supported Versions

Only the latest active major/minor release branch receives official security updates and patches:

| Version | Supported | Notes |
| :--- | :---: | :--- |
| `1.x.x` | :white_check_mark: | Current active release branch |
| `< 1.0.0` | :x: | Unsupported prototype releases |

---

## Reporting a Vulnerability

If you discover a security vulnerability or potential privacy exploit in VoiceStudio:

1. **Do NOT open a public GitHub issue.** Public disclosure exposes users before a remediation can be deployed.
2. Submit a private vulnerability report via **GitHub Security Advisories**:
   - Navigate to the repository's **Security** tab.
   - Click **Report a vulnerability** to open a confidential advisory thread.
3. If GitHub Advisories are unavailable, send an encrypted or direct email to the project maintainers with the subject line `[SECURITY] VoiceStudio Vulnerability Report`.

### What to Include in Your Report:
- Detailed description of the vulnerability and attack vector.
- Affected execution target (Progressive Web App, Chrome Extension MV3, or both).
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- Assessment of potential impact (e.g., privilege escalation, CSP bypass, data exfiltration).

### Response Timelines:
- **Acknowledgment**: Within 24–48 hours of initial receipt.
- **Triage & Validation**: Within 5 business days.
- **Remediation & Advisory**: Coordinated disclosure once a verified patch has been committed and released.

---

## Architecture & Defense-in-Depth Model

VoiceStudio enforces distinct security boundaries between the public web runtime and the privileged browser extension environment:

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

### 1. Universal Zero-Inline-Script Policy
- Neither the PWA nor the Chrome Extension includes inline scripts (`<script>...</script>`) or inline event handlers (`onclick`, `onload`).
- All JavaScript is bundled locally via Vite into immutable chunks loaded via `<script type="module" src="...">`.
- Remote script injection via external CDNs is strictly banned.

### 2. Manifest V3 Chrome Extension Isolation
- The extension conforms strictly to Google's Manifest V3 guidelines.
- Privileged `chrome.*` APIs are accessible solely from within extension pages and background workers, completely isolated from untrusted web content.
- Dynamic evaluation primitives (`eval()`, `new Function()`, `setTimeout(string)`) are prohibited and blocked by the browser.

### 3. Firebase Hosting Hardened Headers
When deployed to Firebase Hosting, the server responds with strict HTTP security headers:
- `Content-Security-Policy`: Restricts scripts, styles, objects, frames, and connections.
- `X-Frame-Options: DENY`: Mitigates clickjacking.
- `X-Content-Type-Options: nosniff`: Prevents MIME-type confusion attacks.
- `Permissions-Policy: camera=(), microphone=(self), display-capture=(self)`: Prohibits unauthorized camera access and restricts microphone capture strictly to the application origin.
- `Strict-Transport-Security`: Mandates HTTPS transport with preloading.

### 4. Client-Side Data Privacy & Sandbox Storage
- All recorded voice audio and metadata remain strictly inside the user's local browser sandbox (`IndexedDB`).
- No audio data or transcripts are ever transmitted to remote telemetry services or third-party servers.

### 5. Telemetry & Anomaly Circuit Breaker
- The client-side [TelemetryCircuitBreaker](file:///home/self/git/web-recording/src/core/telemetry.ts) listens for unexpected `securitypolicyviolation` events and unhandled promise rejections.
- If anomalies exceed pre-set thresholds, a defensive lockdown event is dispatched to freeze recording operations.

---

## Supply Chain & Release Integrity

- **Automated Dependency Auditing**: Regular vulnerability audits (`npm audit`) run on every pull request.
- **Least-Privilege GitHub Actions**: Release automation workflows declare explicit, minimal token permissions (`contents: write`, `pull-requests: write`).
- **Cryptographic Release Checksums**: All distribution bundles (`voicestudio-pwa-*.zip`, `voicestudio-extension-*.zip`) published by GitHub Actions include SHA256 checksums verified in [checksums.sha256](file:///home/self/git/web-recording/checksums.sha256).
