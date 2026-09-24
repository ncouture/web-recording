/**
 * Single Page Application Entry Point
 * Initialized without inline scripts, supporting both Web PWA and Chrome Extension MV3 runtimes.
 */

import './styles/main.css';
import { TelemetryCircuitBreaker } from './core/telemetry';
import { PlatformAdapter } from './core/platform';
import { AppController } from './ui/app-controller';

// Initialize telemetry and anomaly circuit breaker
TelemetryCircuitBreaker.initialize();

// Initialize main application controller
const app = new AppController();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Register PWA Service Worker solely for web/PWA origin execution (never inside Chrome Extension)
if (PlatformAdapter.isPWA() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw-pwa.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered in scope:', registration.scope);
      })
      .catch((err) => {
        console.debug('[PWA] Service Worker registration bypassed:', err);
      });
  });
}
