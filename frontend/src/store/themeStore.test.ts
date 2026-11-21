import { beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, useThemeStore } from '@/store/themeStore';

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.removeProperty('color-scheme');
    useThemeStore.setState({ theme: 'system' });
  });

  it('applies and persists the dark theme', () => {
    useThemeStore.getState().setTheme('dark');

    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');

    const persisted = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}') as {
      state?: { theme?: string };
    };
    expect(persisted.state?.theme).toBe('dark');
  });

  it('toggles between explicit light and dark themes', () => {
    useThemeStore.getState().setTheme('light');
    expect(document.documentElement).not.toHaveClass('dark');

    useThemeStore.getState().toggleTheme();
    expect(document.documentElement).toHaveClass('dark');
    expect(useThemeStore.getState().theme).toBe('dark');

    useThemeStore.getState().toggleTheme();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(useThemeStore.getState().theme).toBe('light');
  });
});
