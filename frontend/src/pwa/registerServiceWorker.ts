export interface ServiceWorkerLike {
  state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', listener: () => void): void;
  removeEventListener(type: 'statechange', listener: () => void): void;
}

export interface ServiceWorkerRegistrationLike {
  installing: ServiceWorkerLike | null;
  waiting: ServiceWorkerLike | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
  removeEventListener(type: 'updatefound', listener: () => void): void;
}

export interface ServiceWorkerContainerLike {
  controller: ServiceWorkerLike | null;
  ready: Promise<ServiceWorkerRegistrationLike>;
  register(scriptUrl: string, options?: { scope?: string }): Promise<ServiceWorkerRegistrationLike>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
  removeEventListener(type: 'controllerchange', listener: () => void): void;
}

type NavigatorWithServiceWorker = Navigator & { serviceWorker?: ServiceWorkerContainerLike };

function normalizedBase(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export function getServiceWorkerScope(): string {
  return normalizedBase();
}

export function getServiceWorkerScriptUrl(): string {
  return `${normalizedBase()}sw.js`;
}

export function getServiceWorkerContainer(): ServiceWorkerContainerLike | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  return (navigator as NavigatorWithServiceWorker).serviceWorker ?? null;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationLike | null> {
  const container = getServiceWorkerContainer();
  if (!container) {
    return null;
  }

  try {
    return await container.register(getServiceWorkerScriptUrl(), { scope: getServiceWorkerScope() });
  } catch {
    // The application remains fully functional without a service worker.
    return null;
  }
}
