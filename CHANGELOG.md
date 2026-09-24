# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://www.conventionalcommits.org/) for commit guidelines.

## [1.0.0] - 2026-09-24

### Features
* Initial release of VoiceStudio supporting dual-target Progressive Web App (PWA) and Chrome Extension Manifest V3 architectures.
* In-browser studio microphone capture with acoustic noise suppression and echo cancellation.
* HiDPI real-time waveform and audio frequency visualizer on HTML5 Canvas.
* Actions on Google SSML auto-stop constraint validation (<=240s) and 1-click SSML snippet generation.
* Client-side persistent storage via IndexedDB for high-capacity audio clips.
* Responsive audio playback dock with seek scrubbing, variable playback rates (0.8x - 2.0x), and volume controls.
* Audio file export supporting Opus OGG/WebM formats.
* Disambiguated web app manifest (`manifest.webmanifest`) and extension manifest (`manifest.json`).

### Security
* Universal zero-inline-script Content Security Policy compliance across PWA and extension runtimes.
* Zero external CDN dependencies by locally bundling Tailwind CSS and tree-shaken Lucide icons.
* Real-time telemetry circuit breaker intercepting CSP violations and runtime anomalies.
* Firebase Hosting security headers including `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and restrictive `Permissions-Policy`.

### Build System & CI/CD
* Vite multi-target build pipeline for `pwa` and `extension` outputs.
* Automated release management with `release-please-action` driven by Conventional Commits.
* Shift-left CI verification pipeline enforcing type safety, distribution verification, and asset checksum generation.
