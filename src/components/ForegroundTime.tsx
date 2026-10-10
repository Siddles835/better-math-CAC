import { useEffect } from 'react';
import { loadActiveLearner, saveActiveLearner } from '@/lib/paths/activeLearner';
import { addTimeSeconds } from '@/lib/paths/progress';
import { localDayKey, nextTimeSample, type TimeCursor } from '@/lib/reporting/time';
import { getActiveStudent } from '@/lib/session';

/** Counts foreground time for the signed-in learner. Failures stay on device. */
const ForegroundTime = () => {
  useEffect(() => {
    let sample: TimeCursor = { cursor: Date.now(), lastInput: Date.now() };
    let pendingMs = 0;
    const mark = () => {
      sample = { ...sample, lastInput: Date.now() };
    };
    const flush = async () => {
      const visible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      const next = nextTimeSample(sample, Date.now(), visible);
      sample = next.sample;
      pendingMs += next.deltaMs;
      if (pendingMs < 1000) return;
      const seconds = Math.floor(pendingMs / 1000);
      pendingMs -= seconds * 1000;
      const active = getActiveStudent();
      if (!active) return;
      try {
        const loaded = await loadActiveLearner();
        if (!loaded) return;
        await saveActiveLearner(addTimeSeconds(loaded.record, localDayKey(new Date()), seconds));
      } catch (error) {
        console.error('Could not save time', error);
      }
    };
    window.addEventListener('pointerdown', mark);
    window.addEventListener('keydown', mark);
    document.addEventListener('visibilitychange', () => void flush());
    const timer = window.setInterval(() => void flush(), 20000);
    return () => {
      window.removeEventListener('pointerdown', mark);
      window.removeEventListener('keydown', mark);
      window.clearInterval(timer);
      void flush();
    };
  }, []);
  return null;
};

export default ForegroundTime;
