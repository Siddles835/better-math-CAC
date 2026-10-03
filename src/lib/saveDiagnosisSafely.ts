import type { Diagnosis } from '@/lib/cognition';

/** A failed or offline save must never crash a lesson or block the next step. */
export const saveDiagnosisSafely = (
  save: (diagnosis: Diagnosis) => Promise<void>,
  diagnosis: Diagnosis
) => {
  void Promise.resolve()
    .then(() => save(diagnosis))
    .catch((error: unknown) => {
      console.error('Could not save diagnosis', error);
    });
};
