// Logical buckets (docs/storage-cdn-iam.md §1). Each driver maps them to real
// locations: folders under STORAGE_LOCAL_DIR, or Cloud Storage buckets.
export type BucketKind = 'media' | 'submissions';

export interface UploadTarget {
  // The browser sends the file bytes here directly; the API never proxies them.
  uploadUrl: string;
  method: 'PUT';
  // Headers the browser must send with the PUT, exactly as given.
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObject {
  sizeBytes: number;
  contentType: string;
}

export interface SignUploadOptions {
  contentType: string;
  maxBytes: number;
  ttlSeconds: number;
}

export interface SignDownloadOptions {
  ttlSeconds: number;
  // Set → the browser downloads the file under this name instead of showing it.
  downloadName?: string;
}

export interface StorageDriver {
  readonly name: string;
  signUpload(bucket: BucketKind, key: string, opts: SignUploadOptions): Promise<UploadTarget>;
  // null when the object does not exist.
  stat(bucket: BucketKind, key: string): Promise<StoredObject | null>;
  // The first `bytes` bytes, to check the file signature.
  readStart(bucket: BucketKind, key: string, bytes: number): Promise<Buffer>;
  // null when this driver cannot serve files (e.g. not configured yet).
  signDownload(bucket: BucketKind, key: string, opts: SignDownloadOptions): Promise<string | null>;
  delete(bucket: BucketKind, key: string): Promise<void>;
}
