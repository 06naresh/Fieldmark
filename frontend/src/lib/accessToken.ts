let accessToken: string | null = null;

const listeners = new Set<(token: string | null) => void>();

/**
 * Access tokens are kept in application memory only, as required by the
 * approved security design. Refresh tokens remain in the HTTP-only cookie.
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function subscribeToAccessToken(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
