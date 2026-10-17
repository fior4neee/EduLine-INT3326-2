// Upload size limits for files that go to Cloud Storage. Checked before a
// signed upload URL is issued, and again when the upload is confirmed.

const MB = 1024 * 1024;

// Lesson videos.
export const MAX_VIDEO_UPLOAD_SIZE_MB = 200;
export const MAX_VIDEO_UPLOAD_SIZE_BYTES = MAX_VIDEO_UPLOAD_SIZE_MB * MB;

// Everything else: lesson documents/resources and assignment submissions.
export const MAX_FILE_UPLOAD_SIZE_MB = 100;
export const MAX_FILE_UPLOAD_SIZE_BYTES = MAX_FILE_UPLOAD_SIZE_MB * MB;
