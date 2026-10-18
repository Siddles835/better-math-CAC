import { describe, expect, it } from 'vitest';
import { gradeDrawnAnswer } from './gradeDrawing';

describe('gradeDrawnAnswer', () => {
  it('accepts the digit the model read when it is the answer', () => {
    expect(gradeDrawnAnswer(6, true, 6)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(6, false, 6)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(9, true, 9)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(2, true, 2)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(5, true, 5)).toEqual({ correct: true, reversal: false });
  });

  it('keeps a real mirror miss for diagnosis', () => {
    expect(gradeDrawnAnswer(6, true, 9)).toEqual({ correct: false, reversal: true });
    expect(gradeDrawnAnswer(9, true, 6)).toEqual({ correct: false, reversal: true });
    expect(gradeDrawnAnswer(2, true, 5)).toEqual({ correct: false, reversal: true });
    expect(gradeDrawnAnswer(5, true, 2)).toEqual({ correct: false, reversal: true });
  });

  it('does not call an ordinary miss a reversal', () => {
    expect(gradeDrawnAnswer(4, false, 6)).toEqual({ correct: false, reversal: false });
    expect(gradeDrawnAnswer(6, false, 9)).toEqual({ correct: false, reversal: false });
  });

  it('grades multi-digit values by assembled number', () => {
    expect(gradeDrawnAnswer(14, false, 14)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(10, false, 10)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(99, false, 99)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(100, false, 100)).toEqual({ correct: true, reversal: false });
    expect(gradeDrawnAnswer(12, false, 21)).toEqual({ correct: false, reversal: false });
    expect(gradeDrawnAnswer(14, true, 14)).toEqual({ correct: true, reversal: false });
  });

  it('rejects values outside 0–999', () => {
    expect(gradeDrawnAnswer(1000, false, 1000)).toEqual({ correct: false, reversal: false });
    expect(gradeDrawnAnswer(5, false, -1)).toEqual({ correct: false, reversal: false });
  });
});
