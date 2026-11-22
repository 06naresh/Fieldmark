import {
  cleanupOldCaches,
  getCacheName,
  handleFetchEvent,
  precacheAdditionalAssets,
  precacheAppShell,
  type CacheStoreLike,
  type FetchLike,
  type RequestLike,
  type ResponseLike,
  type ServiceWorkerScopeLike,
} from '@/pwa/serviceWorkerCore';

const worker = self as unknown as ServiceWorkerScopeLike;
const cacheStorage = (self as unknown as { caches: CacheStoreLike }).caches;
const baseUrl = import.meta.env.BASE_URL || '/';
const origin = worker.location.origin;
const cacheName = getCacheName(__FIELDMARK_BUILD_ID__);

const fetchImpl: FetchLike = (request: RequestLike): Promise<ResponseLike> =>
  fetch(request as Request) as Promise<ResponseLike>;

function resolveBase(): URL {
  return new URL(baseUrl, origin);
}

async function readAssetManifestUrls(): Promise<string[]> {
  const manifestUrl = new URL('asset-manifest.json', resolveBase()).href;

  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      return [];
    }

    const manifest = (await response.json()) as { assets?: unknown };
    if (!Array.isArray(manifest.assets)) {
      return [];
    }

    return manifest.assets
      .filter((asset): asset is string => typeof asset === 'string')
      .map((asset) => new URL(asset, resolveBase()).href)
      .filter((url) => new URL(url).origin === origin);
  } catch {
    return [];
  }
}

worker.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const additionalUrls = await readAssetManifestUrls();
      await precacheAppShell({ cacheStorage, cacheName, origin, baseUrl });
      await precacheAdditionalAssets({ cacheStorage, cacheName, fetchImpl, urls: additionalUrls });

      await Promise.resolve(worker.skipWaiting?.());
    })(),
  );
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    cleanupOldCaches(cacheStorage, cacheName).then(() => Promise.resolve(worker.clients?.claim?.())),
  );
});

worker.addEventListener('fetch', (event) => {
  handleFetchEvent(event, { cacheStorage, cacheName, fetchImpl, origin, baseUrl });
});

worker.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void Promise.resolve(worker.skipWaiting?.());
  }
});
