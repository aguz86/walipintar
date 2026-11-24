import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function parseVersionRank(ver: string): number {
  const m = String(ver || '').trim().match(/^v\.?(\d+)\.(\d+)\.(\d+)$/i);
  if (!m) return 0;
  return Number(m[1]) * 1000000 + Number(m[2]) * 1000 + Number(m[3]);
}

function walipintarVersionPwaPlugin(): Plugin {
  const rootDir = import.meta.dirname;

  return {
    name: 'walipintar-version-pwa',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(rootDir, 'dist');
      if (!fs.existsSync(distDir)) return;

      const rootManifestPath = path.resolve(rootDir, 'manifest.json');
      const publicManifestPath = path.resolve(rootDir, 'public/manifest.json');
      const distManifestPath = path.resolve(distDir, 'manifest.json');

      let chosenManifest: Record<string, unknown> = {
        id: '/',
        name: 'WaliPintar',
        short_name: 'WaliPintar',
        version: 'v.1.0.1',
        start_url: '/',
        scope: '/',
        display: 'standalone',
      };
      let bestRank = -1;

      for (const candidatePath of [publicManifestPath, rootManifestPath, distManifestPath]) {
        if (fs.existsSync(candidatePath)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(candidatePath, 'utf-8'));
            const rank = parseVersionRank(String(parsed?.version || 'v.1.0.1'));
            if (rank >= bestRank) {
              bestRank = rank;
              chosenManifest = parsed;
            }
          } catch {
            // Ignore malformed candidate
          }
        }
      }

      const lockedVersion = String(chosenManifest.version || 'v.1.0.1').trim();
      fs.writeFileSync(distManifestPath, JSON.stringify(chosenManifest, null, 2) + '\n', 'utf-8');

      // Collect core assets + built JS/CSS bundles in dist/
      const coreAssets = new Set<string>([
        '/',
        '/index.html',
        '/manifest.json',
        '/icon.svg',
        '/favicon.ico',
        '/apple-touch-icon.png',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/pwa-maskable-512x512.png',
      ]);

      const assetsSubDir = path.resolve(distDir, 'assets');
      if (fs.existsSync(assetsSubDir)) {
        const walkAssets = (dir: string, prefix: string) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            const relUrl = `${prefix}/${entry.name}`;
            if (entry.isDirectory()) {
              walkAssets(fullPath, relUrl);
            } else if (/\.(js|css|woff2?|png|svg)$/i.test(entry.name)) {
              coreAssets.add(relUrl);
            }
          }
        };
        walkAssets(assetsSubDir, '/assets');
      }

      const swSourcePath = path.resolve(rootDir, 'public/service-worker.js');
      const distSwPath = path.resolve(distDir, 'service-worker.js');
      if (fs.existsSync(swSourcePath)) {
        let swContent = fs.readFileSync(swSourcePath, 'utf-8');
        swContent = swContent.replace(
          /const LOCKED_VERSION\s*=\s*['"][^'"]+['"];/,
          `const LOCKED_VERSION = '${lockedVersion}';`
        );
        swContent = swContent.replace(
          /const CORE_ASSETS\s*=\s*\[[\s\S]*?\];/,
          `const CORE_ASSETS = ${JSON.stringify(Array.from(coreAssets), null, 2)};`
        );
        fs.writeFileSync(distSwPath, swContent, 'utf-8');
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      walipintarVersionPwaPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
