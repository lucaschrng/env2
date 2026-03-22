import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface EncryptResult {
  ciphertext: string; // base64
  key: string; // base64url
}

export function decryptManifest(ciphertext: string, keyBase64url: string): string {
  const key = Buffer.from(keyBase64url, 'base64url');
  const data = Buffer.from(ciphertext, 'base64');

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function encryptManifest(plaintext: string): EncryptResult {
  const key = randomBytes(32);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  // iv (12) + ciphertext + tag (16)
  const blob = Buffer.concat([iv, encrypted, tag]);

  return {
    ciphertext: blob.toString('base64'),
    key: key.toString('base64url'),
  };
}
