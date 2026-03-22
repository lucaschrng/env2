import { describe, expect, it } from 'vitest';

import { decrypt, encrypt, generateKey, keyFromHex } from './index';

describe('generateKey', () => {
  it('returns a 32-byte Buffer', () => {
    const key = generateKey();
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  it('returns unique keys', () => {
    const a = generateKey();
    const b = generateKey();
    expect(a.equals(b)).toBe(false);
  });
});

describe('keyFromHex', () => {
  it('converts valid 64-char hex to 32-byte Buffer', () => {
    const hex = 'a'.repeat(64);
    const key = keyFromHex(hex);
    expect(key.length).toBe(32);
  });

  it('throws on wrong length', () => {
    expect(() => keyFromHex('aabb')).toThrow('Invalid key length');
  });
});

describe('encrypt / decrypt', () => {
  it('round-trips a simple string', () => {
    const key = generateKey();
    const plaintext = 'hello world';
    const ciphertext = encrypt(plaintext, key);
    expect(decrypt(ciphertext, key)).toBe(plaintext);
  });

  it('round-trips an empty string', () => {
    const key = generateKey();
    const ciphertext = encrypt('', key);
    expect(decrypt(ciphertext, key)).toBe('');
  });

  it('round-trips unicode', () => {
    const key = generateKey();
    const plaintext = '日本語 émojis 🔐🗝️';
    expect(decrypt(encrypt(plaintext, key), key)).toBe(plaintext);
  });

  it('round-trips a JSON manifest', () => {
    const key = generateKey();
    const manifest = JSON.stringify({
      files: [{ content: 'DB_URL=postgres://...', path: '.env' }],
      version: 1,
    });
    expect(decrypt(encrypt(manifest, key), key)).toBe(manifest);
  });

  it('produces base64 output', () => {
    const key = generateKey();
    const ciphertext = encrypt('test', key);
    expect(() => Buffer.from(ciphertext, 'base64')).not.toThrow();
    expect(Buffer.from(ciphertext, 'base64').toString('base64')).toBe(ciphertext);
  });

  it('produces different ciphertext for same input (random IV)', () => {
    const key = generateKey();
    const a = encrypt('same', key);
    const b = encrypt('same', key);
    expect(a).not.toBe(b);
  });

  it('throws on wrong key', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    const ciphertext = encrypt('secret', key1);
    expect(() => decrypt(ciphertext, key2)).toThrow();
  });

  it('throws on corrupted ciphertext', () => {
    const key = generateKey();
    const ciphertext = encrypt('test', key);
    const corrupted = ciphertext.slice(0, -4) + 'XXXX';
    expect(() => decrypt(corrupted, key)).toThrow();
  });
});
