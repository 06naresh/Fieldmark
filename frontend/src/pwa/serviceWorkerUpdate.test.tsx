import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerUpdateBanner } from '@/pwa/components/ServiceWorkerUpdateBanner';
import {
  registerServiceWorker,
  type ServiceWorkerContainerLike,
  type ServiceWorkerLike,
  type ServiceWorkerRegistrationLike,
} from '@/pwa/registerServiceWorker';
import { useServiceWorkerUpdate } from '@/pwa/useServiceWorkerUpdate';

type Listener = () => void;

interface ListenerHub {
  addEventListener: (type: string, listener: Listener) => void;
  removeEventListener: (type: string, listener: Listener) => void;
  fire: () => void;
}

function createListenerHub(): ListenerHub {
  const listeners = new Set<Listener>();
  return {
    addEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: Listener) => {
      listeners.delete(listener);
    }),
    fire: () => {
      listeners.forEach((listener) => listener());
    },
  };
}

function createWorker(state = 'installing'): ServiceWorkerLike & { state: string; fireStateChange: () => void } {
  const listeners = createListenerHub();
  return {
    state,
    postMessage: vi.fn(),
    addEventListener: listeners.addEventListener,
    removeEventListener: listeners.removeEventListener,
    fireStateChange: listeners.fire,
  };
}

function defineContainer(container: ServiceWorkerContainerLike): void {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
}

interface ContainerMocks {
  container: ServiceWorkerContainerLike;
  registration: ServiceWorkerRegistrationLike;
  controller: ServiceWorkerLike;
  fireControllerChange: () => void;
  fireUpdateFound: () => void;
}

function createContainer(options: {
  installing?: ServiceWorkerLike | null;
  waiting?: ServiceWorkerLike | null;
  controller?: ServiceWorkerLike | null;
} = {}): ContainerMocks {
  const controller = options.controller ?? createWorker('activated');
  const registrationListeners = createListenerHub();
  const containerListeners = createListenerHub();
  const registration: ServiceWorkerRegistrationLike = {
    installing: options.installing ?? null,
    waiting: options.waiting ?? null,
    addEventListener: registrationListeners.addEventListener,
    removeEventListener: registrationListeners.removeEventListener,
  };
  const container: ServiceWorkerContainerLike = {
    controller,
    ready: Promise.resolve(registration),
    register: vi.fn().mockResolvedValue(registration),
    addEventListener: containerListeners.addEventListener,
    removeEventListener: containerListeners.removeEventListener,
  };
  defineContainer(container);

  return {
    container,
    registration,
    controller,
    fireControllerChange: containerListeners.fire,
    fireUpdateFound: registrationListeners.fire,
  };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('service worker registration', () => {
  it('registers the production worker at the configured base scope', async () => {
    const mocks = createContainer();

    const result = await registerServiceWorker();

    expect(mocks.container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(result).toBe(mocks.registration);
  });

  it('returns null when service workers are unsupported', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    await expect(registerServiceWorker()).resolves.toBeNull();
  });
});

describe('service worker update handling', () => {
  it('offers an update when a waiting worker already exists', async () => {
    const waitingWorker = createWorker('installed');
    createContainer({ waiting: waitingWorker });

    const { result } = renderHook(() => useServiceWorkerUpdate());

    await waitFor(() => expect(result.current.updateAvailable).toBe(true));
    await act(async () => {
      await result.current.applyUpdate();
    });

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('detects a worker installed by a later update check', async () => {
    const installingWorker = createWorker('installing');
    const mocks = createContainer({ installing: installingWorker });

    const { result } = renderHook(() => useServiceWorkerUpdate());

    await waitFor(() => expect(mocks.registration.addEventListener).toHaveBeenCalled());
    installingWorker.state = 'installed';
    act(() => {
      mocks.fireUpdateFound();
      installingWorker.fireStateChange();
    });

    await waitFor(() => expect(result.current.updateAvailable).toBe(true));
  });

  it('renders an accessible update banner that requests activation', async () => {
    const user = userEvent.setup();
    const waitingWorker = createWorker('installed');
    createContainer({ waiting: waitingWorker });

    render(<ServiceWorkerUpdateBanner />);

    expect(await screen.findByText('A new Fieldmark version is ready')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');

    await user.click(screen.getByRole('button', { name: 'Reload' }));

    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });
});
