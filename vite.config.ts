import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import tailwindcss from '@tailwindcss/vite';

const target = process.env.BUILD_TARGET || 'pwa'; // 'pwa' or 'extension'
const isExtension = target === 'extension';

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'dual-target-postbuild',
      closeBundle() {
        const outDir = resolve(__dirname, isExtension ? 'dist/extension' : 'dist/pwa');

        if (isExtension) {
          // Copy Chrome Extension MV3 manifest.json
          const manifestSrc = resolve(__dirname, 'extension/manifest.json');
          const manifestDest = resolve(outDir, 'manifest.json');
          copyFileSync(manifestSrc, manifestDest);
          console.log('[PostBuild] Copied extension/manifest.json to dist/extension/manifest.json');

          // Clean up PWA webmanifest from extension build if present
          const pwaManifestInExt = resolve(outDir, 'manifest.webmanifest');
          if (existsSync(pwaManifestInExt)) {
            unlinkSync(pwaManifestInExt);
          }

          // Strip <link rel="manifest"> from extension index.html to ensure clean extension page
          const indexHtmlPath = resolve(outDir, 'index.html');
          if (existsSync(indexHtmlPath)) {
            let htmlContent = readFileSync(indexHtmlPath, 'utf-8');
            htmlContent = htmlContent.replace(/<link rel="manifest"[^>]*>\s*/gi, '');
            writeFileSync(indexHtmlPath, htmlContent, 'utf-8');
            console.log('[PostBuild] Cleaned PWA manifest link from extension popup index.html');
          }
        }
      }
    }
  ],
  base: './', // Ensures relative asset paths for both web hosting and chrome-extension:// origins
  build: {
    outDir: resolve(__dirname, isExtension ? 'dist/extension' : 'dist/pwa'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...(isExtension
          ? { background: resolve(__dirname, 'extension/background.ts') }
          : { 'sw-pwa': resolve(__dirname, 'src/sw-pwa.ts') })
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'sw-pwa') return 'sw-pwa.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
});
