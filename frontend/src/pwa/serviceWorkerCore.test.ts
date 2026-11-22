import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  CACHE_PREFIX,
  cleanupOldCaches,
  getAppShellUrls,
  getCacheName,
  handleFetchEvent,
  isCacheableRequest,
  precacheAdditionalAssets,
  precacheAppShell,
  resolveRequest,
  type CacheEntryLike,
  type CacheStoreLike,
  type FetchLike,
  type RequestLike,
  type ResponseLike,
} from '@/pwa/serviceWorkerCore';

class FakeResponse implements ResponseLike {
  constructor(
    readonly status = 200,
    readonly ok = true,
    readonly body = '',
  ) {}

  clone(): ResponseLike {
    return new FakeResponse(this.status, this.ok, this.body);
  }
}

function requestKey(value: RequestLike | string): string {
  return typeof value === 'string' ? new URL(value, TEST_ORIGIN).href : new URL(value.url, TEST_ORIGIN).href;
}

class FakeCache implements CacheEntryLike {
  readonly entries = new Map<string, ResponseLike>();

  async match(request: RequestLike | string): Promise<ResponseLike | undefined> {
    return this.entries.get(requestKey(request));
  }

  async put(request: RequestLike | string, response: ResponseLike): Promise<void> {
    this.entries.set(requestKey(request), response);
  }

  async addAll(requests: Array<RequestLike | string>): Promise<void> {
    requests.forEach((request) => this.entries.set(requestKey(request), new FakeResponse()));
  }
}

class FakeCacheStorage implements CacheStoreLike {
  private readonly caches = new Map<string, FakeCache>();

  async open(name: string): Promise<CacheEntryLike> {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.caches.set(name, cache);
    }
    return cache;
  }

  async match(request: RequestLike | string): Promise<ResponseLike | undefined> {
    for (const cache of this.caches.values()) {
      const match = await cache.match(request);
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.caches.keys());
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }

  cache(name: string): FakeCache {
    const cache = new FakeCache();
    this.caches.set(name, cache);
    return cache;
  }
}

const TEST_ORIGIN = 'https://fieldmark.test';

function navigationRequest(path = '/inspector/sync'): RequestLike {
  return { url: `${TEST_ORIGIN}${path}`, method: 'GET', destination: 'document' };
}

function staticRequest(path = '/assets/app.js'): RequestLike {
  return { url: `${TEST_ORIGIN}${path}`, method: 'GET', destination: 'script' };
}

describe('PWA install metadata', () => {
  const publicDir = resolve(process.cwd(), 'public');

  it('provides an installable manifest and icon set', () => {
    const manifestPath = resolve(publicDir, 'manifest.webmanifest');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      name: string;
      short_name: string;
      start_url: string;
      scope: string;
      display: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.name).toContain('Fieldmark');
    expect(manifest.short_name).toBe('Fieldmark');
    expect(manifest.start_url).toBe('.');
    expect(manifest.scope).toBe('.');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }),
        expect.objectContaining({
          src: 'icons/icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }),
      ]),
    );
    manifest.icons.forEach((icon) => {
      expect(existsSync(resolve(publicDir, icon.src))).toBe(true);
    });
  });

  it('links the manifest and theme metadata from the HTML shell', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('href="/favicon.svg"');
  });
});

describe('service worker cache policy', () => {
  it('builds a versioned shell list that includes install metadata', () => {
    const cacheName = getCacheName('build-123');
    const urls = getAppShellUrls('/', TEST_ORIGIN);

    expect(cacheName).toBe(`${CACHE_PREFIX}-build-123`);
    expect(urls).toEqual(
      expect.arrayContaining([
        `${TEST_ORIGIN}/`,
        `${TEST_ORIGIN}/index.html`,
        `${TEST_ORIGIN}/manifest.webmanifest`,
        `${TEST_ORIGIN}/asset-manifest.json`,
        `${TEST_ORIGIN}/favicon.svg`,
        `${TEST_ORIGIN}/icons/icon-192.png`,
      ]),
    );
  });

  it('does not cache API, authenticated, or cross-origin requests', () => {
    expect(isCacheableRequest(staticRequest('/api/v1/sync/push'), TEST_ORIGIN)).toBe(false);
    expect(isCacheableRequest(staticRequest('/auth/refresh'), TEST_ORIGIN)).toBe(false);
    expect(isCacheableRequest(staticRequest('/sw.js'), TEST_ORIGIN)).toBe(false);
    expect(
      isCacheableRequest(
        { ...staticRequest(), headers: { get: () => 'Bearer secret' } },
        TEST_ORIGIN,
      ),
    ).toBe(false);
    expect(isCacheableRequest({ ...staticRequest(), url: 'https://other.test/app.js' }, TEST_ORIGIN)).toBe(false);
    expect(isCacheableRequest(staticRequest('/assets/app.js'), TEST_ORIGIN)).toBe(true);
  });

  it('precache caches the approved shell and optional bundle assets', async () => {
    const cacheStorage = new FakeCacheStorage();
    const cacheName = getCacheName('precache');

    await precacheAppShell({ cacheStorage, cacheName, origin: TEST_ORIGIN, baseUrl: '/' });
    await precacheAdditionalAssets({
      cacheStorage,
      cacheName,
      fetchImpl: async () => new FakeResponse(),
      urls: [`${TEST_ORIGIN}/assets/index-abc.js`],
    });

    const cache = (await cacheStorage.open(cacheName)) as FakeCache;
    expect(cache.entries.has(`${TEST_ORIGIN}/index.html`)).toBe(true);
    expect(cache.entries.has(`${TEST_ORIGIN}/manifest.webmanifest`)).toBe(true);
    expect(cache.entries.has(`${TEST_ORIGIN}/assets/index-abc.js`)).toBe(true);
  });

  it('continues installation when an optional asset cannot be fetched', async () => {
    const cacheStorage = new FakeCacheStorage();
    const cacheName = getCacheName('optional');

    await expect(
      precacheAdditionalAssets({
        cacheStorage,
        cacheName,
        fetchImpl: async (request) => {
          if (request.url.endsWith('missing.js')) {
            throw new Error('network unavailable');
          }
          return new FakeResponse();
        },
        urls: [`${TEST_ORIGIN}/assets/missing.js`, `${TEST_ORIGIN}/assets/available.js`],
      }),
    ).resolves.toBeUndefined();

    const cache = (await cacheStorage.open(cacheName)) as FakeCache;
    expect(cache.entries.has(`${TEST_ORIGIN}/assets/available.js`)).toBe(true);
  });

  it('loads the cached application shell when a navigation is offline', async () => {
    const cacheStorage = new FakeCacheStorage();
    const cacheName = getCacheName('offline-startup');
    const cache = cacheStorage.cache(cacheName);
    await cache.put(`${TEST_ORIGIN}/index.html`, new FakeResponse(200, true, 'offline shell'));
    const fetchImpl: FetchLike = vi.fn(async () => {
      throw new Error('offline');
    });

    const result = await resolveRequest(navigationRequest('/inspector/assignments'), {
      cacheStorage,
      cacheName,
      fetchImpl,
      origin: TEST_ORIGIN,
      baseUrl: '/',
    });

    expect((result.response as FakeResponse).body).toBe('offline shell');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves cached static assets while updating them in the background', async () => {
    const cacheStorage = new FakeCacheStorage();
    const cacheName = getCacheName('revalidate');
    const cache = cacheStorage.cache(cacheName);
    const request = staticRequest();
    await cache.put(request, new FakeResponse(200, true, 'old asset'));
    const fetchImpl: FetchLike = vi.fn(async () => new FakeResponse(200, true, 'new asset'));

    const result = await resolveRequest(request, {
      cacheStorage,
      cacheName,
      fetchImpl,
      origin: TEST_ORIGIN,
      baseUrl: '/',
    });

    expect((result.response as FakeResponse).body).toBe('old asset');
    await result.backgroundUpdate;
    expect((await cache.match(request) as FakeResponse).body).toBe('new asset');
  });

  it('removes only obsolete Fieldmark caches during activation', async () => {
    const cacheStorage = new FakeCacheStorage();
    await cacheStorage.open(`${CACHE_PREFIX}-old`);
    await cacheStorage.open(`${CACHE_PREFIX}-active`);
    await cacheStorage.open('other-app-cache');

    await cleanupOldCaches(cacheStorage, `${CACHE_PREFIX}-active`);

    expect(await cacheStorage.keys()).toEqual([`${CACHE_PREFIX}-active`, 'other-app-cache']);
  });

  it('registers a fetch handler only for cacheable requests', () => {
    const cacheStorage = new FakeCacheStorage();
    const respondWith = vi.fn();
    const waitUntil = vi.fn();
    const options = {
      cacheStorage,
      cacheName: getCacheName('handler'),
      fetchImpl: async () => new FakeResponse(),
      origin: TEST_ORIGIN,
      baseUrl: '/',
    };

    handleFetchEvent({ request: staticRequest('/api/v1/sync/status'), respondWith, waitUntil }, options);
    expect(respondWith).not.toHaveBeenCalled();

    handleFetchEvent({ request: staticRequest('/assets/app.js'), respondWith, waitUntil }, options);
    expect(respondWith).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
