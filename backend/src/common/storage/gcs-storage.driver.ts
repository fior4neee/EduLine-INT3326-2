import { HttpStatus, Logger } from '@nestjs/common';
import { AppException } from '../errors/app.exception';
import type {
  BucketKind,
  SignDownloadOptions,
  SignUploadOptions,
  StorageDriver,
  StoredObject,
  UploadTarget,
} from './storage.types';

const notReady = () =>
  new AppException(
    HttpStatus.NOT_IMPLEMENTED,
    'STORAGE_NOT_CONFIGURED',
    'File storage is not available on this server yet.',
  );

// Cloud Storage driver: TO BE IMPLEMENTED BY M6 (docs/cloud-data-plan.md 6.1–6.2).
// Until then uploads answer 501 STORAGE_NOT_CONFIGURED and download links are null,
// so lessons and submissions without files keep working on the cloud.
//
// What each method must do (docs/storage-cdn-iam.md §3–4), with @google-cloud/storage:
//   signUpload   → V4 signed PUT URL, Content-Type included in the signature, TTL as given;
//                  return the headers the browser must send ({ 'Content-Type': contentType }).
//                  Optionally an x-goog-content-length-range header for maxBytes.
//   stat         → object metadata: size and contentType; null if it does not exist.
//   readStart    → download bytes 0..n-1 (range read) for the file-signature check.
//   signDownload → media: Cloud CDN signed URL (video TTL ≥ 2 h); submissions: V4 signed GET
//                  with response-content-disposition=attachment when downloadName is set.
//   delete       → delete the object; ignore "not found".
// Buckets: STORAGE_MEDIA_BUCKET and STORAGE_SUBMISSIONS_BUCKET (see env.validation.ts).
export class GcsStorageDriver implements StorageDriver {
  readonly name = 'gcs';
  private readonly logger = new Logger('GcsStorage');
  private warned = false;

  constructor(private readonly buckets: Record<BucketKind, string>) {}

  async signUpload(_bucket: BucketKind, _key: string, _opts: SignUploadOptions): Promise<UploadTarget> {
    throw notReady();
  }

  async stat(_bucket: BucketKind, _key: string): Promise<StoredObject | null> {
    throw notReady();
  }

  async readStart(_bucket: BucketKind, _key: string, _bytes: number): Promise<Buffer> {
    throw notReady();
  }

  async signDownload(bucket: BucketKind, key: string, _opts: SignDownloadOptions): Promise<string | null> {
    if (!this.warned) {
      this.warned = true;
      this.logger.warn(`No download links yet (gs://${this.buckets[bucket]}/${key} and others): driver not implemented`);
    }
    return null;
  }

  async delete(_bucket: BucketKind, _key: string): Promise<void> {
    // Nothing can have been uploaded through this driver yet.
  }
}
