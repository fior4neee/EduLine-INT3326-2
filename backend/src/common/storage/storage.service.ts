import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { EnvironmentVariables } from '../config/env.validation';
import { GcsStorageDriver } from './gcs-storage.driver';
import { LocalStorageDriver } from './local-storage.driver';
import type { BucketKind, SignDownloadOptions, SignUploadOptions, StorageDriver } from './storage.types';

// Link lifetimes (docs/storage-cdn-iam.md §3–4).
export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const VIDEO_URL_TTL_SECONDS = 2 * 60 * 60; // playback makes range requests for the whole session
export const RESOURCE_URL_TTL_SECONDS = 10 * 60;
export const SUBMISSION_URL_TTL_SECONDS = 5 * 60;

// New upload = new key, and the original file name never goes into the key
// (docs/storage-cdn-iam.md §2).
export function newObjectKey(prefix: string, extension: string | null): string {
  return `${prefix}/${randomUUID()}${extension ?? ''}`;
}

// File storage for lesson media and submissions. The driver comes from
// STORAGE_DRIVER: "local" (development, files on disk) or "gcs" (Cloud Storage;
// a stub until M6 implements it).
@Injectable()
export class StorageService {
  private readonly driver: StorageDriver;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const name = config.get('STORAGE_DRIVER', { infer: true });
    if (name === 'gcs') {
      this.driver = new GcsStorageDriver({
        media: config.get('STORAGE_MEDIA_BUCKET', { infer: true }),
        submissions: config.get('STORAGE_SUBMISSIONS_BUCKET', { infer: true }),
      });
    } else {
      const port = config.get('PORT', { infer: true });
      this.driver = new LocalStorageDriver(
        config.get('STORAGE_LOCAL_DIR', { infer: true }),
        config.get('PUBLIC_API_URL', { infer: true }) || `http://localhost:${port}/api/v1`,
        `${config.get('JWT_ACCESS_SECRET', { infer: true })}:storage`,
      );
    }
    new Logger('Storage').log(`Storage driver: ${this.driver.name}`);
  }

  get driverName(): string {
    return this.driver.name;
  }

  // For LocalStorageController only.
  get local(): LocalStorageDriver | null {
    return this.driver instanceof LocalStorageDriver ? this.driver : null;
  }

  signUpload(bucket: BucketKind, key: string, opts: Omit<SignUploadOptions, 'ttlSeconds'>) {
    return this.driver.signUpload(bucket, key, { ...opts, ttlSeconds: UPLOAD_URL_TTL_SECONDS });
  }

  stat(bucket: BucketKind, key: string) {
    return this.driver.stat(bucket, key);
  }

  readStart(bucket: BucketKind, key: string, bytes: number) {
    return this.driver.readStart(bucket, key, bytes);
  }

  signDownload(bucket: BucketKind, key: string, opts: SignDownloadOptions) {
    return this.driver.signDownload(bucket, key, opts);
  }

  // Best effort: a leftover object is harmless, a failed request is not.
  async deleteQuietly(bucket: BucketKind, key: string | null | undefined): Promise<void> {
    if (!key) return;
    try {
      await this.driver.delete(bucket, key);
    } catch (err) {
      new Logger('Storage').warn(`Could not delete ${bucket}/${key}: ${String(err)}`);
    }
  }
}
