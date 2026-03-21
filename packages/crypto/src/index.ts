import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Decrypt a base64-encoded string produced by `encrypt`.
 * Returns the original plaintext.
 */
export function decrypt(encoded: string, key: Buffer): string {
  const data = Buffer.from(encoded, 'base64');

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV + ciphertext + auth tag.
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // IV (12) + ciphertext (variable) + tag (16)
  const result = Buffer.concat([iv, encrypted, tag]);
  return result.toString('base64');
}

/**
 * Generate a random 256-bit (32-byte) encryption key.
 */
export function generateKey(): Buffer {
  return randomBytes(32);
}

/**
 * Derive a Buffer key from a hex-encoded string (e.g. from env var).
 */
export function keyFromHex(hex: string): Buffer {
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) {
    throw new Error(
      `Invalid key length: expected 32 bytes, got ${buf.length}`,
    );
  }
  return buf;
}
