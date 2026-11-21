import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * Some Node/jsdom combinations expose an incomplete global localStorage.
 * A deterministic in-memory Storage keeps Zustand persistence testable.
 */
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const values = new Map<string, string>();
  const memoryStorage = {
    getItem: (key: string): string | null => values.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      values.set(key, String(value));
    },
    removeItem: (key: string): void => {
      values.delete(key);
    },
    clear: (): void => values.clear(),
    key: (index: number): string | null => Array.from(values.keys())[index] ?? null,
    get length(): number {
      return values.size;
    },
  } as Storage;

  vi.stubGlobal('localStorage', memoryStorage);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.documentElement.style.removeProperty('color-scheme');
});
