# Chrome Web Store Compliance & Submission Specification

## Store Metadata

- **Extension Name**: VoiceStudio - Audio & Voice Recorder
- **Short Name**: VoiceStudio
- **Version**: 1.0.0
- **Category**: Productivity / Accessibility
- **Primary Language**: English
- **Single Purpose Description**: 
  VoiceStudio provides an in-browser audio recording studio to capture microphone audio, monitor live waveform metrics, validate duration for Actions on Google SSML standards, and save/export audio clips locally.

---

## Detailed Store Description

VoiceStudio is a fast, responsive, and privacy-first audio recording studio built with modern Web Audio APIs and Manifest V3.

### Key Capabilities:
- **Instant High-Fidelity Recording**: Capture voice notes directly in the extension popup with acoustic noise suppression and echo cancellation.
- **Real-Time Waveform Visualizer**: Monitor dynamic frequency spectrums and decibel levels with HiDPI canvas rendering.
- **Actions on Google SSML Ready**: Auto-stop compliance mode at 240 seconds and 1-click SSML `<audio src="...">` tag generation.
- **Local Sandbox Storage**: Clips are persisted directly inside the browser using IndexedDB. No external servers or cloud accounts required.
- **Audio Scrubber & Playback Dock**: Variable speed control (0.8x - 2.0x), waveform preview cards, seek navigation, and renaming.
- **Direct Export**: Download audio clips as Opus OGG/WebM files to your local disk.

---

## Permission Justifications

Chrome Web Store reviewers require specific justifications for each declared permission:

| Permission | Technical Requirement | Reviewer Justification |
| :--- | :--- | :--- |
| `storage` | `chrome.storage.local` API access | Required to persist user recording preferences (noise suppression toggles, SSML limit enforcement, playback speed) across extension restarts without tracking or transmitting user identity. |

> **Note on Audio Capture**: Recording uses standard HTML5 `navigator.mediaDevices.getUserMedia` within the extension popup origin, asking the user for explicit microphone permission at point of use.

---

## Privacy Policy & Data Disclosure

- **Audio Data**: 100% of recorded voice audio remains strictly inside the user's local browser storage sandbox (IndexedDB). No audio data is uploaded, transmitted, or shared with third-party servers.
- **User Telemetry**: The extension does not collect or transmit analytics, telemetry, or personally identifiable information (PII).
- **Remote Code**: Fully compliant with Manifest V3. Zero external scripts or dynamic code execution (`eval()`, `new Function()`).

---

## Developer Installation (Unpacked Mode)

1. Run the build command:
   ```bash
   npm run build:extension
   ```
2. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the `dist/extension` directory.
6. The VoiceStudio microphone icon will appear in your Chrome toolbar. Click it to launch the studio popup!
