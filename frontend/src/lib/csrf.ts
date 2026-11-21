export const CSRF_COOKIE_NAME = 'fieldmark_csrf';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

export function readCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const prefix = `${CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  const value = cookie.slice(prefix.length);
  try {
    return decodeURIComponent(value) || null;
  } catch {
    return value || null;
  }
}
