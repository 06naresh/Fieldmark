import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const originalOnline = navigator.onLine;

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnline });
});

describe('useOnlineStatus', () => {
  it('reacts to browser online and offline events', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      fireEvent(window, new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
      fireEvent(window, new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
