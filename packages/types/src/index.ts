// API — request/response types for the worker
export interface CreateShareRequest {
  ciphertext: string;
  maxDownloads: number;
  ttl: number;
}

export interface CreateShareResponse {
  id: string;
}

export interface FetchShareResponse {
  ciphertext: string;
}

export interface ShareFile {
  content: string;
  path: string;
}

// Manifest — the structure that gets encrypted
export interface ShareManifest {
  files: ShareFile[];
  version: 1;
}

// Defaults
export const DEFAULT_TTL = 15 * 60; // 15 minutes in seconds
export const DEFAULT_MAX_DOWNLOADS = 1;
