import { Injectable } from '@nestjs/common';

export interface ScoringQuestion {
  id: number;
  correctOptionIndex: number;
  points: number;
}

export interface ScoringAnswer {
  id: number;
  questionId: number;
  selectedOptionIndex: number | null;
}

export interface ScoreResult {
  perAnswer: { id: number; points: number }[];
  score: number;
  maxScore: number;
}

// Pure function: no database, no clock. M2's submit transaction loads the
// questions and answers, calls score(), and writes the result (docs/quiz-submission-design.md §3).
@Injectable()
export class ScoringService {
  // A right answer earns the question's points. A wrong or missing answer earns 0.
  // maxScore counts every question, answered or not. An answer that points at a
  // question outside this quiz is ignored and earns nothing.
  score(questions: ScoringQuestion[], answers: ScoringAnswer[]): ScoreResult {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const perAnswer = answers.map((a) => {
      const q = byId.get(a.questionId);
      const correct = q !== undefined && a.selectedOptionIndex === q.correctOptionIndex;
      return { id: a.id, points: correct ? q.points : 0 };
    });
    return {
      perAnswer,
      score: perAnswer.reduce((sum, a) => sum + a.points, 0),
      maxScore: questions.reduce((sum, q) => sum + q.points, 0),
    };
  }

  // score / maxScore >= passingScorePercentage / 100, in integers so there is no rounding.
  // A quiz with no points cannot be passed.
  isPassed(score: number, maxScore: number, passingScorePercentage: number): boolean {
    return maxScore > 0 && score * 100 >= passingScorePercentage * maxScore;
  }
}
