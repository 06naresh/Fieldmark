import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig, type Plugin } from 'vitest/config';

const buildId =
  process.env.FIELDMARK_PWA_BUILD_ID ?? process.env.GITHUB_SHA ?? `${Date.now().toString(36)}-${process.pid}`;

function pwaAssetManifest(): Plugin {
  let base = '/';

  return {
    name: 'fieldmark-pwa-asset-manifest',
    apply: 'build',
    configResolved(config) {
      base = config.base || '/';
    },
    generateBundle(_options, bundle) {
      const normalizedBase = base.endsWith('/') ? base : `${base}/`;
      const assets = Object.keys(bundle)
        .filter((fileName) => /\.(?:js|css|png|svg|webp|woff2?|ttf)$/i.test(fileName))
        .filter((fileName) => fileName !== 'sw.js' && !fileName.endsWith('/sw.js'))
        .map((fileName) => `${normalizedBase}${fileName}`);

      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify({ assets }, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaAssetManifest()],
  define: {
    __FIELDMARK_BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        sw: fileURLToPath(new URL('./src/pwa/sw.ts', import.meta.url)),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    css: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
