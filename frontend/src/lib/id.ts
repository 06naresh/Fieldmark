function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function formatUuid(bytes: Uint8Array): string {
  // RFC 4122 version 4 variant bits. The backend validates UUIDs, so browser
  // fallbacks must still produce a structurally valid value.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Create a UUID accepted by backend operation, device, and answer contracts. */
export function createId(): string {
  return formatUuid(randomBytes());
}

/**
 * Create a stable UUID for a local record that has no server ID yet.
 * Reusing the same inspection/item pair must produce the same operation target
 * after a page refresh, while the backend still receives a valid UUID.
 */
export function stableIdFromKey(key: string): string {
  let left = 0x811c9dc5;
  let right = 0x01000193;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right + code + (left >>> 5), 0x85ebca6b) >>> 0;
  }

  const bytes = new Uint8Array(16);
  for (let index = 0; index < 4; index += 1) {
    bytes[index] = (left >>> (index * 8)) & 0xff;
    bytes[index + 4] = (right >>> (index * 8)) & 0xff;
  }
  for (let index = 8; index < 16; index += 1) {
    bytes[index] = (left + right + index * 0x9e3779b9) & 0xff;
  }
  return formatUuid(bytes);
}
