export type MathSymbolCategory =
  | 'operations'
  | 'equality'
  | 'inequalities'
  | 'fractions'
  | 'placeValue'
  | 'geometry';

export interface MathSymbolEntry {
  id: string;
  symbol: string;
  category: MathSymbolCategory;
  nameKey: string;
  meaningKey: string;
  spokenKey: string;
  exampleKey: string;
  exampleVisual?: string;
}

/** Symbols and terms covered by the live foundations curriculum (and nearby). */
export const MATH_SYMBOLS: MathSymbolEntry[] = [
  {
    id: 'plus',
    symbol: '+',
    category: 'operations',
    nameKey: 'sym_plus_name',
    meaningKey: 'sym_plus_meaning',
    spokenKey: 'sym_plus_spoken',
    exampleKey: 'sym_plus_example',
    exampleVisual: '3 + 2 = 5',
  },
  {
    id: 'minus',
    symbol: '−',
    category: 'operations',
    nameKey: 'sym_minus_name',
    meaningKey: 'sym_minus_meaning',
    spokenKey: 'sym_minus_spoken',
    exampleKey: 'sym_minus_example',
    exampleVisual: '7 − 3 = 4',
  },
  {
    id: 'times',
    symbol: '×',
    category: 'operations',
    nameKey: 'sym_times_name',
    meaningKey: 'sym_times_meaning',
    spokenKey: 'sym_times_spoken',
    exampleKey: 'sym_times_example',
    exampleVisual: '3 × 4 = 12',
  },
  {
    id: 'divide',
    symbol: '÷',
    category: 'operations',
    nameKey: 'sym_divide_name',
    meaningKey: 'sym_divide_meaning',
    spokenKey: 'sym_divide_spoken',
    exampleKey: 'sym_divide_example',
    exampleVisual: '12 ÷ 3 = 4',
  },
  {
    id: 'equals',
    symbol: '=',
    category: 'equality',
    nameKey: 'sym_equals_name',
    meaningKey: 'sym_equals_meaning',
    spokenKey: 'sym_equals_spoken',
    exampleKey: 'sym_equals_example',
    exampleVisual: '4 + 1 = 5',
  },
  {
    id: 'notEquals',
    symbol: '≠',
    category: 'equality',
    nameKey: 'sym_neq_name',
    meaningKey: 'sym_neq_meaning',
    spokenKey: 'sym_neq_spoken',
    exampleKey: 'sym_neq_example',
    exampleVisual: '3 ≠ 5',
  },
  {
    id: 'greater',
    symbol: '>',
    category: 'inequalities',
    nameKey: 'sym_gt_name',
    meaningKey: 'sym_gt_meaning',
    spokenKey: 'sym_gt_spoken',
    exampleKey: 'sym_gt_example',
    exampleVisual: '8 > 5',
  },
  {
    id: 'less',
    symbol: '<',
    category: 'inequalities',
    nameKey: 'sym_lt_name',
    meaningKey: 'sym_lt_meaning',
    spokenKey: 'sym_lt_spoken',
    exampleKey: 'sym_lt_example',
    exampleVisual: '2 < 9',
  },
  {
    id: 'fraction',
    symbol: '½',
    category: 'fractions',
    nameKey: 'sym_half_name',
    meaningKey: 'sym_half_meaning',
    spokenKey: 'sym_half_spoken',
    exampleKey: 'sym_half_example',
    exampleVisual: '½ of 8 = 4',
  },
  {
    id: 'tens',
    symbol: '10',
    category: 'placeValue',
    nameKey: 'sym_tens_name',
    meaningKey: 'sym_tens_meaning',
    spokenKey: 'sym_tens_spoken',
    exampleKey: 'sym_tens_example',
    exampleVisual: '23 = 2 tens + 3 ones',
  },
  {
    id: 'ones',
    symbol: '1',
    category: 'placeValue',
    nameKey: 'sym_ones_name',
    meaningKey: 'sym_ones_meaning',
    spokenKey: 'sym_ones_spoken',
    exampleKey: 'sym_ones_example',
    exampleVisual: '7 ones = 7',
  },
  {
    id: 'group',
    symbol: '∴',
    category: 'geometry',
    nameKey: 'sym_group_name',
    meaningKey: 'sym_group_meaning',
    spokenKey: 'sym_group_spoken',
    exampleKey: 'sym_group_example',
    exampleVisual: '●●●  ●●●',
  },
];

export const MATH_SYMBOL_CATEGORIES: MathSymbolCategory[] = [
  'operations',
  'equality',
  'inequalities',
  'fractions',
  'placeValue',
  'geometry',
];

export const searchMathSymbols = (query: string): MathSymbolEntry[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return MATH_SYMBOLS;
  return MATH_SYMBOLS.filter(
    (entry) =>
      entry.symbol.toLowerCase().includes(needle) ||
      entry.id.toLowerCase().includes(needle) ||
      entry.exampleVisual?.toLowerCase().includes(needle)
  );
};
