/** Locale-independent number text. No grouping separators. */
export const formatCsvNumber = (value: number): string => {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
};

/**
 * Spreadsheet formula injection guard.
 * Cells that start with =, +, -, or @ are prefixed with a single quote.
 */
export const csvCell = (value: string | number): string => {
  let text = typeof value === 'number' ? formatCsvNumber(value) : String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const toCsv = (rows: Array<Array<string | number>>): string =>
  `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;

export const csvFilename = (demo: boolean): string =>
  demo ? 'DEMO-mathlift-export.csv' : 'mathlift-export.csv';
