// Pure assignment rules (docs/m2-plan.md §2–3). No database access, so they are
// easy to unit test.

export type SubmissionState = 'NotSubmitted' | 'Missing' | 'Submitted' | 'Late' | 'Graded';

interface AssignmentTiming {
  unlockAt: Date | null;
  dueAt: Date | null;
  allowLateSubmissions: boolean;
}

interface SubmissionLike {
  status: 'Submitted' | 'Graded';
  isLate: boolean;
}

// One student's state on one assignment, as shown in lists and the gradebook.
export function submissionState(
  a: Pick<AssignmentTiming, 'dueAt'>,
  s: SubmissionLike | null,
  now: Date,
): SubmissionState {
  if (s?.status === 'Graded') return 'Graded';
  if (s) return s.isLate ? 'Late' : 'Submitted';
  return a.dueAt && now > a.dueAt ? 'Missing' : 'NotSubmitted';
}

export type SubmitBlock = 'NOT_OPEN_YET' | 'CLOSED' | null;

// Whether a student may submit right now, ignoring their enrollment.
// After dueAt a submission is late if allowed, otherwise refused.
export function submitWindow(a: AssignmentTiming, now: Date): { block: SubmitBlock; late: boolean } {
  if (a.unlockAt && now < a.unlockAt) return { block: 'NOT_OPEN_YET', late: false };
  const late = Boolean(a.dueAt && now > a.dueAt);
  if (late && !a.allowLateSubmissions) return { block: 'CLOSED', late };
  return { block: null, late };
}

// ".PDF" / "pdf" / " .pdf " → ".pdf". Returns null for anything that is not a
// plain extension (letters and digits, 1–10 characters).
export function normalizeExtension(raw: string): string | null {
  const ext = raw.trim().toLowerCase().replace(/^\.?/, '.');
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : null;
}

// The extension of a file name, lower case with the dot, or null.
export function extensionOf(fileName: string): string | null {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return null;
  return normalizeExtension(fileName.slice(dot));
}

// Empty allow-list = any file type.
export function isExtensionAllowed(fileName: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  const ext = extensionOf(fileName);
  return ext !== null && allowed.includes(ext);
}
