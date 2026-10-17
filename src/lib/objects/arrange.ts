/** Lay out up to 20 items in rows of 5 (ten-frame friendly). */
export interface ArrangeSlot {
  index: number;
  row: number;
  col: number;
  /** True after every 5th item for a faint divider. */
  groupEnd: boolean;
}

export const arrangeInRowsOfFive = (count: number): ArrangeSlot[] => {
  const n = Math.max(0, Math.min(20, Math.floor(count)));
  const slots: ArrangeSlot[] = [];
  for (let index = 0; index < n; index += 1) {
    slots.push({
      index,
      row: Math.floor(index / 5),
      col: index % 5,
      groupEnd: (index + 1) % 5 === 0 && index + 1 < n,
    });
  }
  return slots;
};

export const rowCountFor = (count: number): number => Math.ceil(Math.max(0, Math.min(20, count)) / 5);
