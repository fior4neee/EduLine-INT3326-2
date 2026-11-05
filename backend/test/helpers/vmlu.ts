import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface VmluQuestion {
  id: string;
  subject: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

const DATA_DIR = join(__dirname, '../../../data/vmlu_mqa_v1.5');

// Reads VMLU questions that have an answer key (dev and valid; test.jsonl has none)
// and maps them to EduLine's question shape: "B" → correctOptionIndex 1, and the
// "A. " prefix is dropped from each option.
export function loadVmlu(split: 'dev' | 'valid'): VmluQuestion[] {
  const lines = readFileSync(join(DATA_DIR, `${split}.jsonl`), 'utf8').split('\n');
  return lines
    .filter((l) => l.trim())
    .map(
      (l) => JSON.parse(l) as { id: string; question: string; choices: string[]; answer: string },
    )
    .map((r) => ({
      id: r.id,
      subject: r.id.split('-')[0],
      questionText: r.question,
      options: r.choices.map((c) => c.replace(/^[A-E]\.\s*/, '')),
      correctOptionIndex: r.answer.charCodeAt(0) - 'A'.charCodeAt(0),
    }));
}

export function vmluBySubject(split: 'dev' | 'valid'): Map<string, VmluQuestion[]> {
  const bySubject = new Map<string, VmluQuestion[]>();
  for (const q of loadVmlu(split)) {
    bySubject.set(q.subject, [...(bySubject.get(q.subject) ?? []), q]);
  }
  return bySubject;
}
