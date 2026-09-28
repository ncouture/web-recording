# VoiceStudio — Dual-Target Progressive Web App & Chrome Extension (MV3)

VoiceStudio is an audio and voice recording studio built with TypeScript and Tailwind CSS. It compiles into two independent targets from a single codebase: a standalone **Progressive Web Application (PWA)** deployed to **Firebase Hosting** and an unpacked **Manifest V3 Chrome Extension** for Google Chrome.

[![CI Verification](https://github.com/ncouture/web-recording/actions/workflows/security-ci.yml/badge.svg)](https://github.com/ncouture/web-recording/actions/workflows/security-ci.yml)
[![Release Automation](https://github.com/ncouture/web-recording/actions/workflows/release.yml/badge.svg)](https://github.com/ncouture/web-recording/actions/workflows/release.yml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![Security Policy](https://img.shields.io/badge/Security-Policy-blue.svg)](SECURITY.md)
[![Changelog](https://img.shields.io/badge/Changelog-Keep%20a%20Changelog-orange.svg)](CHANGELOG.md)

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

### Architecture Details

1. **Manifest Separation**:
   * PWA manifest: `dist/pwa/manifest.webmanifest`.
   * Chrome Extension manifest: `dist/extension/manifest.json`.
   * This separation avoids namespace collisions when developing or side-loading.

2. **Zero-Inline-Script Policy**:
   * In compliance with Chrome Manifest V3 and Firebase CSP, the codebase prohibits inline scripts (`<script>...</script>`), inline handlers (`onclick`), and dynamic code evaluation (`eval()`, `new Function()`).
   * UI components use TypeScript event listeners, and styles and icons are bundled locally.

3. **Platform Abstraction Layer (PAL)**:
   * [`src/core/platform.ts`](src/core/platform.ts) detects the execution environment (`chrome-extension` vs `pwa-browser`).
   * [`src/core/storage.ts`](src/core/storage.ts) provides persistent storage across both environments:
     * Audio blobs are stored in `IndexedDB` (`VoiceStudioAudioDB`) in both browser tabs and extension popups.
     * User settings (noise suppression, SSML toggle, playback speed) sync via `chrome.storage.local` in the extension and `localStorage` in the PWA.

4. **Actions on Google and Assistant SSML Format**:
   * Captures audio at 48kHz mono Opus (WebM/OGG).
   * Enforces a 240-second recording duration ceiling.
   * Generates formatted SSML `<audio src="...">` markup.

---

## Directory Structure

```text
web-recording/
├── .github/
│   └── workflows/
│       ├── release.yml            # Release automation via release-please-action
│       └── security-ci.yml        # CI build and distribution integrity gates
├── extension/
│   ├── manifest.json              # Chrome Extension MV3 manifest
│   └── background.ts              # Extension background service worker
├── public/
│   ├── icons/                     # Icons (16, 48, 128, 192, 512)
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   ├── icon-128.png
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── manifest.webmanifest       # PWA web app manifest
├── scripts/
│   ├── git-hooks/
│   │   └── pre-commit             # Standalone git pre-commit hook
│   ├── ensure-ratchet.sh          # Auto-installer for sethvargo/ratchet binary
│   ├── install-hooks.sh           # Hook installation script (run on npm prepare)
│   └── run-ratchet.sh             # Ratchet execution wrapper (pin, lint, hook)
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
│   │   └── visualizer.ts          # Canvas waveform visualizer
│   ├── styles/
│   │   └── main.css               # Tailwind CSS theme & styles
│   ├── sw-pwa.ts                  # PWA offline cache service worker
│   └── main.ts                    # Application entry point
├── .pre-commit-config.yaml        # Python pre-commit framework configuration
├── CHANGELOG.md                   # Chronological changelog driven by Conventional Commits
├── CHROMEWEBSTORE.md              # Chrome Web Store metadata & justifications
├── SECURITY.md                    # Security policy & disclosure process
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

Releases are automated through [`.github/workflows/release.yml`](.github/workflows/release.yml) using [`googleapis/release-please-action`](https://github.com/googleapis/release-please-action).

### Conventional Commits Guide

Commit messages determine version bumps and update [CHANGELOG.md](CHANGELOG.md):

| Commit Type | Release Semantics | Example |
| :--- | :---: | :--- |
| `feat:` | **Minor** (Feature addition) | `feat: add stereo recording mode toggle` |
| `fix:` | **Patch** (Bug fix) | `fix: resolve playback scrubber drag stutter` |
| `perf:` | **Patch** (Performance optimization) | `perf: reduce audio peak extraction buffer` |
| `BREAKING CHANGE:` or `type!:` | **Major** (Breaking changes) | `feat!: overhaul storage schema to multi-track` |
| `docs:` | *None / Patch* (Documentation) | `docs: add Chrome Web Store review screenshots` |
| `refactor:` | *None / Patch* (Refactoring) | `refactor: extract audio node setup into pipeline` |
| `style:`, `test:`, `chore:`, `ci:` | *Internal updates* | `ci: pin release action to commit SHA` |

### Release Lifecycle

1. **Pull Requests**: Pull requests use Conventional Commit titles (e.g., `feat: export MP3 audio format`).
2. **Release PR Creation**: When changes merge into `main`, Release Please creates or updates an open release pull request, bumping version numbers in [`package.json`](package.json) and drafting notes in [CHANGELOG.md](CHANGELOG.md).
3. **Packaging and Publishing**: Merging the release pull request triggers distribution builds:
   * Compiles production targets (`dist/pwa` and `dist/extension`).
   * Packages release ZIP archives: `voicestudio-pwa-vX.Y.Z.zip` and `voicestudio-extension-vX.Y.Z.zip`.
   * Generates SHA256 checksums into `checksums.sha256`.
   * Attaches the archives and checksums to the GitHub Release.

---

## Security Model

Security controls are documented in detail in [SECURITY.md](SECURITY.md):

* **Zero Inline Code**: All scripts and styles are bundled into static modules.
* **Client-Side Storage**: Audio data remains in the browser's origin-isolated `IndexedDB`.
* **Least-Privilege CI Tokens**: Workflows use read-only token defaults, granting explicit write permissions (`contents: write`, `pull-requests: write`) only where needed.
* **Anomaly Circuit Breaker**: [`src/core/telemetry.ts`](src/core/telemetry.ts) detects CSP violations and shuts down audio operations if tampering occurs.
* **Supply Chain Hardening (Ratchet SHA Pinning)**: All third-party GitHub Actions across workflows are pinned to full commit SHAs using [`sethvargo/ratchet`](https://github.com/sethvargo/ratchet), preventing mutable tag poisoning.

### CI/CD Workflow Security & Pre-commit Hooks

Pre-commit hooks verify that GitHub Actions across `.github/workflows/` are pinned to commit SHAs:

* **Automatic Hook Setup**: Running `npm install` triggers `npm run prepare`, installing the hook into `.git/hooks/pre-commit`.
* **Dual Integration**: Works with native Git hooks (`.git/hooks/pre-commit`) and the Python [`pre-commit`](https://pre-commit.com) framework (`.pre-commit-config.yaml`).
* **Automatic Binary Installation**: If `ratchet` is not installed on the system, [`scripts/ensure-ratchet.sh`](scripts/ensure-ratchet.sh) downloads the platform binary to `.bin/ratchet`.
* **CI Verification**: The Security CI pipeline (`security-ci.yml`) runs `npm run ratchet:lint` on pull requests and pushes to `main`.

Ratchet npm commands:
```bash
# Check that all GitHub Action references are pinned to commit SHAs
npm run ratchet:lint

# Automatically resolve and pin unpinned GitHub Action references
npm run ratchet:pin

# Download and install the ratchet binary locally
npm run ratchet:install
```

Refer to [SECURITY.md](SECURITY.md) for vulnerability disclosure procedures.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```
This also runs `prepare` to configure git hooks and ratchet.

### 2. Development Server
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
* Bundles static assets with relative paths.
* Compiles `src/sw-pwa.ts` to `dist/pwa/sw-pwa.js`.
* Emits `dist/pwa/manifest.webmanifest` and web icons.

### Build Chrome Extension Target (`dist/extension`)
```bash
npm run build:extension
```
* Compiles `extension/background.ts` to `dist/extension/background.js`.
* Copies `extension/manifest.json` to `dist/extension/manifest.json`.
* Removes PWA manifest links from `dist/extension/index.html` to maintain MV3 compliance.

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
Firebase Hosting serves `dist/pwa` using configuration in [firebase.json](firebase.json) with HTTP security headers, frame protections, and service worker caching rules.

### Installing in Google Chrome (Extension Unpacked Mode)

1. Build the extension target:
   ```bash
   npm run build:extension
   ```
2. Open Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** (toggle in upper right).
4. Click **Load unpacked**.
5. Select the `dist/extension` directory.
6. Click the VoiceStudio icon in the Chrome toolbar to open the extension popup.
