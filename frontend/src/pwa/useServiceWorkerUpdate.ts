import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getServiceWorkerContainer,
  type ServiceWorkerLike,
  type ServiceWorkerRegistrationLike,
} from '@/pwa/registerServiceWorker';

export interface UseServiceWorkerUpdateResult {
  updateAvailable: boolean;
  applyUpdate: () => Promise<void>;
}

export function useServiceWorkerUpdate(): UseServiceWorkerUpdateResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistrationLike | null>(null);
  const updateRequestedRef = useRef(false);

  useEffect(() => {
    const container = getServiceWorkerContainer();
    if (!container) {
      return;
    }

    let disposed = false;
    let installingWorker: ServiceWorkerLike | null = null;

    const handleStateChange = (): void => {
      if (disposed || !installingWorker) {
        return;
      }
      if (installingWorker.state === 'installed' && container.controller) {
        setUpdateAvailable(true);
      }
    };

    const handleUpdateFound = (): void => {
      const registration = registrationRef.current;
      if (disposed || !registration) {
        return;
      }

      installingWorker?.removeEventListener('statechange', handleStateChange);
      installingWorker = registration.installing;
      installingWorker?.addEventListener('statechange', handleStateChange);
    };

    const handleControllerChange = (): void => {
      if (disposed) {
        return;
      }
      setUpdateAvailable(false);
      if (updateRequestedRef.current) {
        updateRequestedRef.current = false;
        window.location.reload();
      }
    };

    container.addEventListener('controllerchange', handleControllerChange);

    void container.ready
      .then((registration) => {
        if (disposed) {
          return;
        }

        registrationRef.current = registration;
        registration.addEventListener('updatefound', handleUpdateFound);
        handleUpdateFound();

        if (registration.waiting && container.controller) {
          setUpdateAvailable(true);
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      container.removeEventListener('controllerchange', handleControllerChange);
      installingWorker?.removeEventListener('statechange', handleStateChange);
      registrationRef.current?.removeEventListener('updatefound', handleUpdateFound);
    };
  }, []);

  const applyUpdate = useCallback(async (): Promise<void> => {
    const registration = registrationRef.current;
    const worker = registration?.waiting ?? registration?.installing;
    if (!worker) {
      return;
    }

    updateRequestedRef.current = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return { updateAvailable, applyUpdate };
}
