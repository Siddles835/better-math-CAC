import { useCallback, useRef, useState } from 'react';
import {
  beginCheck,
  finishCheck,
  initialAnswerCheck,
  markChanged,
  canCheck,
  type AnswerCheckState,
  type AnswerVerdict,
} from '@/lib/answerCheck';

/**
 * React wrapper around the pure check state.
 * A locked success is never rewritten by a later change.
 */
export const useAnswerCheck = () => {
  const [state, setState] = useState<AnswerCheckState>(initialAnswerCheck);
  const stateRef = useRef(state);
  stateRef.current = state;

  const noteChange = useCallback(() => {
    const next = markChanged(stateRef.current);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const submit = useCallback((verdict: Exclude<AnswerVerdict, null>, hasContent = true) => {
    const begun = beginCheck(stateRef.current, hasContent);
    if (!begun) return null;
    const next = finishCheck(begun, verdict);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const reset = useCallback(() => {
    const next = initialAnswerCheck();
    stateRef.current = next;
    setState(next);
  }, []);

  return {
    state,
    noteChange,
    submit,
    reset,
    canSubmit: (hasContent: boolean) => canCheck(state, hasContent),
  };
};
