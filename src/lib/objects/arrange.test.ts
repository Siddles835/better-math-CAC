import { describe, expect, it } from 'vitest';
import { arrangeInRowsOfFive, rowCountFor } from './arrange';

describe('arrangeInRowsOfFive', () => {
  it('lays out items in rows of five without overlap', () => {
    const slots = arrangeInRowsOfFive(12);
    expect(slots).toHaveLength(12);
    expect(slots[0]).toEqual({ index: 0, row: 0, col: 0, groupEnd: false });
    expect(slots[4].groupEnd).toBe(true);
    expect(slots[5]).toMatchObject({ row: 1, col: 0 });
    expect(rowCountFor(12)).toBe(3);
    expect(arrangeInRowsOfFive(0)).toEqual([]);
    expect(arrangeInRowsOfFive(99)).toHaveLength(20);
  });
});
