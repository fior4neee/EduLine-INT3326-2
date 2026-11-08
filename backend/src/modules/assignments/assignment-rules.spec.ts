import {
  extensionOf,
  isExtensionAllowed,
  normalizeExtension,
  submissionState,
  submitWindow,
} from './assignment-rules';

const now = new Date('2026-11-10T12:00:00Z');
const past = new Date('2026-11-09T12:00:00Z');
const future = new Date('2026-11-11T12:00:00Z');

describe('submissionState', () => {
  it('no submission: NotSubmitted before the due date, Missing after', () => {
    expect(submissionState({ dueAt: future }, null, now)).toBe('NotSubmitted');
    expect(submissionState({ dueAt: null }, null, now)).toBe('NotSubmitted');
    expect(submissionState({ dueAt: past }, null, now)).toBe('Missing');
  });
  it('submitted: Submitted or Late; graded wins', () => {
    expect(submissionState({ dueAt: past }, { status: 'Submitted', isLate: false }, now)).toBe('Submitted');
    expect(submissionState({ dueAt: past }, { status: 'Submitted', isLate: true }, now)).toBe('Late');
    expect(submissionState({ dueAt: past }, { status: 'Graded', isLate: true }, now)).toBe('Graded');
  });
});

describe('submitWindow', () => {
  const base = { unlockAt: null, dueAt: future, allowLateSubmissions: true };
  it('before unlockAt: not open yet', () => {
    expect(submitWindow({ ...base, unlockAt: future }, now).block).toBe('NOT_OPEN_YET');
  });
  it('on time: open, not late', () => {
    expect(submitWindow(base, now)).toEqual({ block: null, late: false });
  });
  it('after dueAt: late when allowed, closed when not', () => {
    expect(submitWindow({ ...base, dueAt: past }, now)).toEqual({ block: null, late: true });
    expect(submitWindow({ ...base, dueAt: past, allowLateSubmissions: false }, now).block).toBe('CLOSED');
  });
  it('no due date: always open', () => {
    expect(submitWindow({ ...base, dueAt: null, allowLateSubmissions: false }, now)).toEqual({
      block: null,
      late: false,
    });
  });
});

describe('extensions', () => {
  it('normalizes', () => {
    expect(normalizeExtension('PDF')).toBe('.pdf');
    expect(normalizeExtension(' .Docx ')).toBe('.docx');
    expect(normalizeExtension('.tar.gz')).toBeNull();
    expect(normalizeExtension('../x')).toBeNull();
  });
  it('reads a file name', () => {
    expect(extensionOf('Report.Final.PDF')).toBe('.pdf');
    expect(extensionOf('noext')).toBeNull();
    expect(extensionOf('.bashrc')).toBeNull();
  });
  it('checks the allow-list; empty means any', () => {
    expect(isExtensionAllowed('a.pdf', ['.pdf', '.docx'])).toBe(true);
    expect(isExtensionAllowed('a.exe', ['.pdf', '.docx'])).toBe(false);
    expect(isExtensionAllowed('a.exe', [])).toBe(true);
  });
});
