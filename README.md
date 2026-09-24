# VoiceStudio — Dual-Target Progressive Web App & Chrome Extension (MV3)

A high-performance, privacy-first audio and voice recording studio engineered with a unified codebase. It builds both as a standalone **Progressive Web Application (PWA)** deployable to **Firebase Hosting** and as an unpacked **Manifest V3 Chrome Extension** installable in Google Chrome.

[![CI Verification](https://github.com/self/web-recording/actions/workflows/security-ci.yml/badge.svg)](https://github.com/self/web-recording/actions/workflows/security-ci.yml)
[![Release Automation](https://github.com/self/web-recording/actions/workflows/release.yml/badge.svg)](https://github.com/self/web-recording/actions/workflows/release.yml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](file:///home/self/git/web-recording/SECURITY.md)
[![Changelog](https://img.shields.io/badge/Changelog-Keep%20a%20Changelog-orange.svg)](file:///home/self/git/web-recording/CHANGELOG.md)

---

## Architecture Overview

```
                      ┌──────────────────────────────┐
                      │     Shared Source Tree       │
                      │  (TypeScript, Tailwind CSS)  │
                      └──────────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │    Target 1: PWA        │             │ Target 2: Chrome Ext    │
    │  (dist/pwa/)            │             │ (dist/extension/)       │
    ├─────────────────────────┤             ├─────────────────────────┤
    │ • manifest.webmanifest  │             │ • manifest.json (MV3)   │
    │ • sw-pwa.js (Offline)   │             │ • background.js (SW)    │
    │ • Firebase Hosting CSP  │             │ • Strict Extension CSP  │
    │ • Standalone PWA Prompt │             │ • Popup Mode (Relative) │
    └─────────────────────────┘             └─────────────────────────┘
```

### Core Architecture Highlights

1. **Manifest Disambiguation**:
   - The PWA manifest is served as `manifest.webmanifest` (`dist/pwa/manifest.webmanifest`).
   - The Chrome Extension manifest is `manifest.json` (`dist/extension/manifest.json`).
   - This eliminates namespace collisions and build corruption during development or side-loading.

2. **Universal Zero-Inline-Script Policy (MV3 & Firebase CSP Parity)**:
   - Chrome Manifest V3 strictly prohibits inline scripts (`<script>...</script>`), inline event listeners (`onclick`), and dynamic eval (`new Function()`, `eval()`).
   - The UI runs through clean event listeners in TypeScript, with all styling and icons bundled locally.

3. **Platform Abstraction Layer (PAL)**:
   - [`PlatformAdapter`](file:///home/self/git/web-recording/src/core/platform.ts) safely detects execution context (`chrome-extension` vs `pwa-browser`).
   - [`StorageService`](file:///home/self/git/web-recording/src/core/storage.ts) provides persistent storage across both targets:
     - High-capacity audio blobs reside in `IndexedDB` (`VoiceStudioAudioDB`), supported across both browser windows and extension popups.
     - User preferences (noise cancellation, SSML toggle, playback rate) sync via `chrome.storage.local` in the extension and `localStorage` in the PWA.

4. **Actions on Google & Assistant SSML Compliance**:
   - Validates audio streams to 48kHz mono Opus (WebM/OGG).
   - Auto-stop limit enforcer at 240 seconds (Actions on Google audio ceiling).
   - 1-click SSML `<audio src="...">` tag generation.

---

## Directory Structure

```text
web-recording/
├── .github/
│   └── workflows/
│       ├── release.yml            # Automated releases via release-please-action
│       └── security-ci.yml        # CI build and distribution integrity gates
├── extension/
│   ├── manifest.json              # Chrome Extension MV3 manifest
│   └── background.ts              # Extension background service worker
├── public/
│   ├── icons/                     # Fixed-dimension icons (16, 48, 128, 192, 512)
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   ├── icon-128.png
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── manifest.webmanifest       # PWA web app manifest
├── security/
│   └── security-gate.json         # Security definitions & governance
├── src/
│   ├── core/
│   │   ├── platform.ts            # Platform detection abstraction (PAL)
│   │   ├── storage.ts             # IndexedDB & key-value storage adapter
│   │   └── telemetry.ts           # Anomaly monitoring & CSP circuit breaker
│   ├── recording/
│   │   ├── audio-engine.ts        # Web Audio API capture & analyser
│   │   └── ssml-validator.ts      # Google Assistant SSML validator
│   ├── ui/
│   │   ├── app-controller.ts      # Application controller & state orchestration
│   │   ├── toast.ts               # Accessible modals & toast notifications
│   │   └── visualizer.ts          # HiDPI canvas waveform visualizer
│   ├── styles/
│   │   └── main.css               # Tailwind CSS theme & animations
│   ├── sw-pwa.ts                  # PWA offline cache service worker
│   └── main.ts                    # Single-page application entry point
├── CHANGELOG.md                   # Chronological changelog driven by Conventional Commits
├── CHROMEWEBSTORE.md              # Chrome Web Store metadata & justifications
├── SECURITY.md                    # Comprehensive security policy & disclosure process
├── firebase.json                  # Firebase Hosting rewrites & security headers
├── index.html                     # SPA container (zero inline scripts)
├── package.json                   # Build scripts & local dependencies
├── release-please-config.json     # Release Please configuration
├── .release-please-manifest.json  # Release Please version tracking manifest
├── tsconfig.json                  # Strict TypeScript configuration
└── vite.config.ts                 # Dual-target build orchestrator
```

---

## Release Automation & Conventional Commits

Releases are fully automated via [`release.yml`](file:///home/self/git/web-recording/.github/workflows/release.yml) using Google's [`googleapis/release-please-action`](https://github.com/googleapis/release-please-action).

### Conventional Commits Guide

Every commit message determines the next semantic release version and updates [`CHANGELOG.md`](file:///home/self/git/web-recording/CHANGELOG.md):

| Commit Type | Release Semantics | Example |
| :--- | :---: | :--- |
| `feat:` | **Minor** (Feature addition) | `feat: add stereo recording mode toggle` |
| `fix:` | **Patch** (Bug remediation) | `fix: resolve playback scrubber drag stutter` |
| `perf:` | **Patch** (Performance optimization) | `perf: reduce audio peak extraction memory buffer` |
| `BREAKING CHANGE:` or `type!:` | **Major** (Breaking changes) | `feat!: overhaul storage schema to multi-track` |
| `docs:` | *None / Patch* (Documentation only) | `docs: add Chrome Web Store review screenshots` |
| `refactor:` | *None / Patch* (Refactoring) | `refactor: extract audio node setup into pipeline` |
| `style:`, `test:`, `chore:`, `ci:` | *Internal updates* | `ci: pin release action to commit SHA` |

### How the Release Lifecycle Operates

1. **Feature PRs**: Contributors open pull requests with Conventional Commit titles (e.g., `feat: export MP3 audio format`).
2. **Release PR Creation**: When merged into `main`, `release-please-action` creates or updates an open release PR (e.g., `chore(main): release 1.1.0`), bumping [`package.json`](file:///home/self/git/web-recording/package.json) and drafting notes in [`CHANGELOG.md`](file:///home/self/git/web-recording/CHANGELOG.md).
3. **Automated Publishing & Assets**: Merging the release PR triggers the post-release step:
   - Builds both production targets (`dist/pwa` and `dist/extension`).
   - Packages standalone ZIP distributions: `voicestudio-pwa-vX.Y.Z.zip` and `voicestudio-extension-vX.Y.Z.zip`.
   - Calculates cryptographic SHA256 checksums into `checksums.sha256`.
   - Attaches all distribution assets to the new GitHub Release automatically.

---

## Security Model & Policy

Security is maintained through strict structural boundaries detailed in [`SECURITY.md`](file:///home/self/git/web-recording/SECURITY.md):

- **Zero Inline Code**: In accordance with Chrome Extension Manifest V3 and Firebase CSP, all scripts and styles are bundled locally.
- **Client-Side Storage**: Voice data never leaves the client's device; recordings reside in origin-isolated `IndexedDB`.
- **Least-Privilege CI Tokens**: The release pipeline requests only `contents: write` and `pull-requests: write`.
- **Runtime Anomaly Monitoring**: `TelemetryCircuitBreaker` detects CSP violations and shuts down privileged operations if suspicious tampering occurs.

For responsible disclosure guidelines, refer to [SECURITY.md](file:///home/self/git/web-recording/SECURITY.md).

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Local Development Server
```bash
npm run dev
```

### 3. Type Checking
```bash
npm run typecheck
```

---

## Building Targets

### Build PWA Target (`dist/pwa`)
```bash
npm run build:pwa
```
- Bundles static assets with relative URLs.
- Compiles `src/sw-pwa.ts` to `dist/pwa/sw-pwa.js`.
- Bundles `dist/pwa/manifest.webmanifest` and web icons.

### Build Chrome Extension Target (`dist/extension`)
```bash
npm run build:extension
```
- Compiles `extension/background.ts` to `dist/extension/background.js`.
- Copies `extension/manifest.json` to `dist/extension/manifest.json`.
- Strips PWA manifest tags from `dist/extension/index.html` to maintain pure MV3 compliance.

### Build Both Targets
```bash
npm run build:all
```

---

## Deployment & Installation

### Deploying to Firebase Hosting

1. Authenticate with the Firebase CLI:
   ```bash
   npx firebase login
   ```
2. Build the PWA target and deploy:
   ```bash
   npm run deploy:firebase
   ```
Firebase Hosting serves `dist/pwa` configured in [firebase.json](file:///home/self/git/web-recording/firebase.json) with strict Content-Security-Policy headers, frame protections, and service worker caching rules.

### Installing in Google Chrome (Extension Unpacked Mode)

1. Run the extension build:
   ```bash
   npm run build:extension
   ```
2. Open Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle in upper right).
4. Click **Load unpacked**.
5. Select the `dist/extension` folder inside this repository.
6. Click the VoiceStudio icon in your Chrome extensions menu to launch the recording studio popup.
