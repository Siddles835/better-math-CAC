import type { DigitRead, TraceEvent } from './types';

export class LessonTrace {
  readonly startedAt = Date.now();
  readonly events: TraceEvent[] = [];
  digit: DigitRead | null = null;
  equationSwap = 0;
  private firstActionAt: number | null = null;

  record(kind: TraceEvent['kind'], extra?: { value?: number; target?: number; extra?: number }) {
    const t = Date.now();
    if (this.firstActionAt === null && (kind === 'tap' || kind === 'draw' || kind === 'equation')) {
      this.firstActionAt = t;
    }
    this.events.push({ t, kind, ...extra });
  }

  tap(value?: number, target?: number) {
    this.record('tap', { value, target });
  }

  remove() {
    this.record('remove');
  }

  check(value: number, target: number) {
    this.record('check', { value, target });
  }

  reset() {
    this.record('reset');
  }

  setDigit(read: DigitRead, expected?: number) {
    this.digit = read;
    this.record('draw', { value: read.digit, target: expected, extra: read.reversal ? 1 : 0 });
  }

  setEquationSwap(swapped: boolean) {
    this.equationSwap = swapped ? 1 : 0;
    this.record('equation', { extra: this.equationSwap });
  }

  timeToFirstSec() {
    if (this.firstActionAt === null) return 0;
    return (this.firstActionAt - this.startedAt) / 1000;
  }
}
