# VoiceStudio — Dual-Target Progressive Web App & Chrome Extension (MV3)

A high-performance, privacy-first audio and voice recording studio engineered with a unified codebase. It builds both as a standalone **Progressive Web Application (PWA)** deployable to **Firebase Hosting** and as an unpacked **Manifest V3 Chrome Extension** installable in Google Chrome.

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
   - This eliminates namespace collision and build corruption when developing or side-loading.

2. **Universal Zero-Inline-Script Policy (MV3 & Firebase CSP Parity)**:
   - Chrome Manifest V3 strictly prohibits inline scripts (`<script>...</script>`), inline event listeners (`onclick`), and dynamic eval (`new Function()`, `eval()`).
   - The UI runs through clean event listeners in TypeScript, with all styling and icons bundled locally.

3. **Platform Abstraction Layer (PAL)**:
   - `PlatformAdapter` safely detects execution context (`chrome-extension` vs `pwa-browser`).
   - `StorageService` provides persistent storage across both targets:
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
├── CHROMEWEBSTORE.md              # Chrome Web Store metadata & justifications
├── firebase.json                  # Firebase Hosting rewrites & security headers
├── index.html                     # SPA container (zero inline scripts)
├── package.json                   # Build scripts & local dependencies
├── tsconfig.json                  # Strict TypeScript configuration
└── vite.config.ts                 # Dual-target build orchestrator
```

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

---

## Security & Privacy Compliance

- **No Remote Scripts**: All code is packaged locally (no CDNs, no external eval).
- **Client-Side Privacy**: Audio recordings are processed on the client and saved exclusively to the browser's origin-isolated `IndexedDB`.
- **Telemetry Circuit Breaker**: [telemetry.ts](file:///home/self/git/web-recording/src/core/telemetry.ts) captures CSP violations and unhandled promise rejections, triggering defensive lockdown if unexpected anomalies exceed safety thresholds.
