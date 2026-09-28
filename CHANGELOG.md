# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://www.conventionalcommits.org/) for commit guidelines.

## [0.1.0](https://github.com/ncouture/web-recording/compare/v0.0.1...v0.1.0) (2026-09-28)


### Features

* structure project as dual-target PWA and Manifest V3 Chrome Extension ([34fb4e4](https://github.com/ncouture/web-recording/commit/34fb4e455e122db91e5420bf1be1b2dea3ba7e27))


### Bug Fixes

* **ci:** make install-hooks.sh POSIX compliant and skip in CI ([dcf423c](https://github.com/ncouture/web-recording/commit/dcf423cff862b1d95048886d20466d4f562968f4))
* **version:** no previous release version exist, reflect in manifest ([1786091](https://github.com/ncouture/web-recording/commit/17860916b225e1ccc81dc2a47db925eb42213946))


### Documentation

* update README.md and SECURITY.md with supply chain controls and relative links ([1378e92](https://github.com/ncouture/web-recording/commit/1378e9263173b4487d194f0dec5f1e913fba1017))


### Continuous Integration

* integrate ratchet pre-commit hook and pin github actions to commit shas ([ccc113e](https://github.com/ncouture/web-recording/commit/ccc113e28d8c36831867463958f77e0784f70f2a))
* integrate release-please-action, add SECURITY.md, CHANGELOG.md, and update README.md ([7a86eef](https://github.com/ncouture/web-recording/commit/7a86eef0a14dc4a177c3431640d6b47c0300e2c1))

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
