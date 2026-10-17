import { describe, expect, it } from 'vitest';
import { bulkLinesToProblems, parseBulkPromptLines } from './bulkPrompts';

describe('parseBulkPromptLines', () => {
  it('parses valid lines and flags bad ones', () => {
    const text = [
      'What is 4 + 3? = 7',
      '',
      'No answer here',
      'What is 2 + 2? = two',
      'What is 4 + 3? = 7',
      'Arabic ١٢ = ١٢',
      `${'x'.repeat(300)} = 1`,
    ].join('\n');
    const rows = parseBulkPromptLines(text);
    expect(rows[0].ok).toBe(true);
    expect(rows[0].answer).toBe('7');
    expect(rows[1].error).toBe('blank');
    expect(rows[2].error).toBe('missing-answer');
    expect(rows[3].error).toBe('non-numeric');
    expect(rows[4].error).toBe('duplicate');
    expect(rows[5].ok).toBe(true);
    expect(rows[5].answer).toBe('12');
    expect(rows[6].error).toBe('too-long');
    expect(bulkLinesToProblems(rows, 'p')).toHaveLength(2);
  });
});
