import { ScoringService } from './scoring.service';

const svc = new ScoringService();

// Ten questions worth 10 points each; the right option is always index 1.
const questions = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  correctOptionIndex: 1,
  points: 10,
}));
const answerAll = (pick: (i: number) => number | null) =>
  questions.map((q, i) => ({ id: 100 + i, questionId: q.id, selectedOptionIndex: pick(i) }));

describe('ScoringService.score', () => {
  it('gives full marks when every answer is right', () => {
    const r = svc.score(
      questions,
      answerAll(() => 1),
    );
    expect(r).toMatchObject({ score: 100, maxScore: 100 });
    expect(r.perAnswer.every((a) => a.points === 10)).toBe(true);
  });

  it('gives 0 when every answer is wrong', () => {
    expect(
      svc.score(
        questions,
        answerAll(() => 0),
      ),
    ).toMatchObject({ score: 0, maxScore: 100 });
  });

  it('counts unanswered questions in maxScore', () => {
    expect(svc.score(questions, [])).toEqual({ perAnswer: [], score: 0, maxScore: 100 });
    expect(
      svc.score(
        questions,
        answerAll(() => null),
      ),
    ).toMatchObject({ score: 0, maxScore: 100 });
  });

  it('adds up per-question points, not a flat 1 per answer', () => {
    const qs = [
      { id: 1, correctOptionIndex: 0, points: 5 },
      { id: 2, correctOptionIndex: 2, points: 20 },
    ];
    const r = svc.score(qs, [
      { id: 1, questionId: 1, selectedOptionIndex: 0 },
      { id: 2, questionId: 2, selectedOptionIndex: 2 },
    ]);
    expect(r).toMatchObject({ score: 25, maxScore: 25 });
  });

  it('ignores an answer for a question outside the quiz', () => {
    const r = svc.score(questions, [{ id: 1, questionId: 999, selectedOptionIndex: 1 }]);
    expect(r.perAnswer).toEqual([{ id: 1, points: 0 }]);
    expect(r.score).toBe(0);
  });
});

describe('ScoringService.isPassed', () => {
  it('passes exactly at the threshold and fails one point below', () => {
    expect(svc.isPassed(80, 100, 80)).toBe(true);
    expect(svc.isPassed(79, 100, 80)).toBe(false);
  });

  it('uses integer math, so 2 of 3 does not round up to 67', () => {
    expect(svc.isPassed(20, 30, 67)).toBe(false);
    expect(svc.isPassed(20, 30, 66)).toBe(true);
  });

  it('never passes a quiz worth 0 points', () => {
    expect(svc.isPassed(0, 0, 0)).toBe(false);
  });
});
