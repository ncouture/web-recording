/**
 * Chrome Extension Manifest V3 Service Worker (Background Script)
 * Follows ephemeral lifecycle guidelines: no persistent in-memory global state.
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[VoiceStudio Extension] Installed reason:', details.reason);

  // Initialize extension defaults in chrome.storage.local
  const existing = await chrome.storage.local.get(['settings', 'installedAt']);
  if (!existing.installedAt) {
    await chrome.storage.local.set({
      installedAt: Date.now(),
      settings: {
        ssmlEnforceLimit: true,
        noiseSuppression: true,
        playbackSpeed: 1.0
      }
    });
  }
});

// Listener for runtime messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
    return false; // synchronous response
  }

  if (message.type === 'GET_EXTENSION_INFO') {
    const manifest = chrome.runtime.getManifest();
    sendResponse({
      name: manifest.name,
      version: manifest.version,
      id: chrome.runtime.id
    });
    return false;
  }

  return false;
});
