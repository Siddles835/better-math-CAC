/**
 * Shared check / re-check rules for lessons and practice.
 *
 * Success lock: once a check is correct, that success stays recorded.
 * A later edit must not silently turn the saved success into a failure.
 * The check button stays disabled after a lock, and diagnosis is not rewritten.
 *
 * A wrong or unreadable check does not lock. If the child changes the thing
 * being measured (count, equation, or strokes), the visible result clears and
 * they can check the latest state again.
 *
 * An unreadable drawing is not a wrong attempt.
 */

export type AnswerVerdict = 'correct' | 'incorrect' | 'unreadable' | null;

export interface AnswerCheckState {
  lockedSuccess: boolean;
  verdict: AnswerVerdict;
  wrongAttempts: number;
  unreadableStreak: number;
  /** True when the measured answer changed since the last finished check. */
  dirty: boolean;
  inFlight: boolean;
}

export const initialAnswerCheck = (): AnswerCheckState => ({
  lockedSuccess: false,
  verdict: null,
  wrongAttempts: 0,
  unreadableStreak: 0,
  dirty: true,
  inFlight: false,
});

export const canCheck = (state: AnswerCheckState, hasContent: boolean): boolean => {
  if (!hasContent || state.lockedSuccess || state.inFlight) return false;
  return state.verdict === null || state.dirty;
};

/** Start a check. Returns null when a second tap should be ignored. */
export const beginCheck = (state: AnswerCheckState, hasContent: boolean): AnswerCheckState | null => {
  if (!canCheck(state, hasContent)) return null;
  return { ...state, inFlight: true };
};

export const finishCheck = (
  state: AnswerCheckState,
  verdict: Exclude<AnswerVerdict, null>
): AnswerCheckState => {
  if (verdict === 'unreadable') {
    return {
      ...state,
      inFlight: false,
      verdict: 'unreadable',
      dirty: false,
      unreadableStreak: state.unreadableStreak + 1,
    };
  }
  if (verdict === 'correct') {
    return {
      ...state,
      inFlight: false,
      verdict: 'correct',
      lockedSuccess: true,
      dirty: false,
      unreadableStreak: 0,
    };
  }
  return {
    ...state,
    inFlight: false,
    verdict: 'incorrect',
    wrongAttempts: state.wrongAttempts + 1,
    dirty: false,
    unreadableStreak: 0,
  };
};

/**
 * The child changed the measured thing. A locked success stays locked.
 * Otherwise the previous message is cleared so the next check reads the new state.
 */
export const markChanged = (state: AnswerCheckState): AnswerCheckState => {
  if (state.lockedSuccess) return state;
  return {
    ...state,
    verdict: null,
    dirty: true,
    inFlight: false,
  };
};
