/**
 * Framework-independent service-worker policy.
 *
 * The worker entry point registers browser events; these functions stay pure so
 * cache behavior and the offline application shell can be unit tested.
 */

export const CACHE_PREFIX = 'fieldmark-shell';

export interface RequestLike {
  url: string;
  method?: string;
  destination?: string;
  mode?: string;
  headers?: {
    get(name: string): string | null;
  };
}

export interface ResponseLike {
  ok: boolean;
  status: number;
  clone(): ResponseLike;
}

export interface CacheEntryLike {
  match(request: RequestLike | string): Promise<ResponseLike | undefined>;
  put(request: RequestLike | string, response: ResponseLike): Promise<void>;
  addAll(requests: Array<RequestLike | string>): Promise<void>;
}

export interface CacheStoreLike {
  open(name: string): Promise<CacheEntryLike>;
  match(request: RequestLike | string): Promise<ResponseLike | undefined>;
  keys(): Promise<string[]>;
  delete(name: string): Promise<boolean>;
}

export type FetchLike = (request: RequestLike) => Promise<ResponseLike>;

export interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface FetchEventLike extends ExtendableEventLike {
  request: RequestLike;
  respondWith(promise: Promise<ResponseLike>): void;
}

export interface MessageEventLike {
  data?: { type?: string } | null;
}

export interface ServiceWorkerScopeLike {
  location: { origin: string };
  addEventListener(type: 'install', listener: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'activate', listener: (event: ExtendableEventLike) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void;
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
  skipWaiting?(): Promise<void>;
  clients?: { claim?(): Promise<void> };
}

export interface RequestResolution {
  response: ResponseLike;
  backgroundUpdate?: Promise<void>;
}

export interface ResolveRequestOptions {
  cacheStorage: CacheStoreLike;
  cacheName: string;
  fetchImpl: FetchLike;
  origin: string;
  baseUrl: string;
}

const APP_SHELL_PATHS = [
  '',
  'index.html',
  'manifest.webmanifest',
  'asset-manifest.json',
  'favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

const ALLOWED_DESTINATIONS = new Set(['document', 'script', 'style', 'font', 'image', 'manifest']);

const BLOCKED_PATH_PREFIXES = ['/api', '/auth', '/health', '/docs', '/openapi.json'];

export function getCacheName(buildId: string): string {
  return `${CACHE_PREFIX}-${buildId}`;
}

export function getAppShellUrls(baseUrl = '/', origin = 'https://fieldmark.local'): string[] {
  const base = new URL(baseUrl, origin);
  if (!base.pathname.endsWith('/')) {
    base.pathname = `${base.pathname}/`;
  }

  return Array.from(new Set(APP_SHELL_PATHS.map((path) => new URL(path, base).href)));
}

function localPath(pathname: string, baseUrl: string, origin: string): string {
  const basePath = new URL(baseUrl, origin).pathname.replace(/\/$/, '');
  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname;
}

function matchesBlockedPrefix(pathname: string): boolean {
  return BLOCKED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix),
  );
}

export function isCacheableRequest(request: RequestLike, origin: string, baseUrl = '/'): boolean {
  if ((request.method ?? 'GET').toUpperCase() !== 'GET') {
    return false;
  }

  const destination = request.destination;
  if (!destination || !ALLOWED_DESTINATIONS.has(destination)) {
    return false;
  }

  const authorization = request.headers?.get('authorization') ?? request.headers?.get('Authorization');
  const csrfToken = request.headers?.get('x-csrf-token') ?? request.headers?.get('X-CSRF-Token');
  if (authorization || csrfToken) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(request.url, origin);
  } catch {
    return false;
  }

  if (url.origin !== origin) {
    return false;
  }

  const pathname = localPath(url.pathname, baseUrl, origin);
  if (matchesBlockedPrefix(pathname)) {
    return false;
  }

  return pathname !== '/sw.js';
}

export function isNavigationRequest(request: RequestLike): boolean {
  return request.destination === 'document' || request.mode === 'navigate';
}

function isSuccessfulResponse(response: ResponseLike): boolean {
  return typeof response.ok === 'boolean' ? response.ok : response.status >= 200 && response.status < 400;
}

export async function precacheAppShell(options: {
  cacheStorage: CacheStoreLike;
  cacheName: string;
  origin: string;
  baseUrl: string;
  additionalUrls?: string[];
}): Promise<void> {
  const shellUrls = getAppShellUrls(options.baseUrl, options.origin);
  const allUrls = Array.from(new Set([...shellUrls, ...(options.additionalUrls ?? [])]));
  const cache = await options.cacheStorage.open(options.cacheName);
  await cache.addAll(allUrls);
}

export async function precacheAdditionalAssets(options: {
  cacheStorage: CacheStoreLike;
  cacheName: string;
  fetchImpl: FetchLike;
  urls: string[];
}): Promise<void> {
  const cache = await options.cacheStorage.open(options.cacheName);
  await Promise.all(
    Array.from(new Set(options.urls)).map(async (url) => {
      try {
        const response = await options.fetchImpl({ url, method: 'GET', destination: 'script' });
        if (isSuccessfulResponse(response)) {
          await cache.put(url, response);
        }
      } catch {
        // A missing optional bundle asset must not prevent the shell install.
      }
    }),
  );
}

export async function cleanupOldCaches(cacheStorage: CacheStoreLike, activeCacheName: string): Promise<void> {
  const cacheNames = await cacheStorage.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== activeCacheName)
      .map((name) => cacheStorage.delete(name)),
  );
}

export async function resolveRequest(request: RequestLike, options: ResolveRequestOptions): Promise<RequestResolution> {
  const shellUrls = getAppShellUrls(options.baseUrl, options.origin);
  const [rootUrl, indexUrl] = shellUrls;

  if (isNavigationRequest(request)) {
    try {
      const response = await options.fetchImpl(request);
      if (isSuccessfulResponse(response)) {
        const cache = await options.cacheStorage.open(options.cacheName);
        await cache.put(indexUrl, response.clone());
      }
      return { response };
    } catch (error) {
      const cached =
        (await options.cacheStorage.match(indexUrl)) ??
        (await options.cacheStorage.match(rootUrl)) ??
        (await options.cacheStorage.match(request));
      if (cached) {
        return { response: cached };
      }
      throw error;
    }
  }

  const cached = await options.cacheStorage.match(request);
  const networkResponse = options.fetchImpl(request).then(async (response) => {
    if (isSuccessfulResponse(response)) {
      const cache = await options.cacheStorage.open(options.cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  });

  if (cached) {
    return {
      response: cached,
      backgroundUpdate: networkResponse.then(() => undefined).catch(() => undefined),
    };
  }

  return { response: await networkResponse };
}

export function handleFetchEvent(event: FetchEventLike, options: ResolveRequestOptions): void {
  if (!isCacheableRequest(event.request, options.origin, options.baseUrl)) {
    return;
  }

  const resolution = resolveRequest(event.request, options);
  event.respondWith(resolution.then((result) => result.response));
  event.waitUntil(
    resolution
      .then((result) => result.backgroundUpdate ?? Promise.resolve())
      .catch(() => undefined),
  );
}
