/**
 * Platform Abstraction Layer (PAL)
 * Strictly separates execution context between Chrome Extension and Web PWA.
 */

export type RuntimeEnvironment = 'chrome-extension' | 'pwa-browser';

export class PlatformAdapter {
  /**
   * Determine whether execution is running inside a Chrome Extension context or web browser.
   */
  public static getEnvironment(): RuntimeEnvironment {
    try {
      if (
        typeof chrome !== 'undefined' &&
        typeof chrome.runtime !== 'undefined' &&
        typeof chrome.runtime.id === 'string' &&
        chrome.runtime.id.length > 0 &&
        location.protocol === 'chrome-extension:'
      ) {
        return 'chrome-extension';
      }
    } catch {
      // Fallback to pwa-browser on any inspection error
    }
    return 'pwa-browser';
  }

  public static isExtension(): boolean {
    return this.getEnvironment() === 'chrome-extension';
  }

  public static isPWA(): boolean {
    return this.getEnvironment() === 'pwa-browser';
  }

  public static getAppVersion(): string {
    if (this.isExtension() && chrome.runtime?.getManifest) {
      return chrome.runtime.getManifest().version;
    }
    return '1.0.0';
  }
}
