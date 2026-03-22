import { describe, expect, it } from 'vitest';

import { decryptManifest, encryptManifest } from './crypto';

describe('encryptManifest / decryptManifest', () => {
  it('round-trips a JSON manifest', () => {
    const manifest = JSON.stringify({
      files: [{ content: 'SECRET=abc', path: '.env' }],
      version: 1,
    });
    const { ciphertext, key } = encryptManifest(manifest);
    expect(decryptManifest(ciphertext, key)).toBe(manifest);
  });

  it('returns base64 ciphertext', () => {
    const { ciphertext } = encryptManifest('test');
    expect(() => Buffer.from(ciphertext, 'base64')).not.toThrow();
  });

  it('returns base64url key', () => {
    const { key } = encryptManifest('test');
    // base64url: no +, /, or = characters
    expect(key).not.toMatch(/[+/=]/);
    expect(() => Buffer.from(key, 'base64url')).not.toThrow();
  });

  it('throws on wrong key', () => {
    const { ciphertext } = encryptManifest('test');
    const { key: wrongKey } = encryptManifest('other');
    expect(() => decryptManifest(ciphertext, wrongKey)).toThrow();
  });
});
