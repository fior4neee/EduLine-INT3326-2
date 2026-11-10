// The browser chooses the Content-Type, so it proves nothing about the file. Check
// the first bytes too (docs/storage-cdn-iam.md §3 step 6): an .exe renamed to .pdf
// is rejected.

export const SIGNATURE_BYTES = 16;

export function matchesSignature(contentType: string, head: Buffer): boolean {
  switch (contentType) {
    case 'application/pdf':
      return head.subarray(0, 5).toString('latin1') === '%PDF-';
    case 'video/mp4':
      // ISO base media file: a box whose type is "ftyp" at offset 4.
      return head.subarray(4, 8).toString('latin1') === 'ftyp';
    case 'video/webm':
      // EBML header.
      return head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}
