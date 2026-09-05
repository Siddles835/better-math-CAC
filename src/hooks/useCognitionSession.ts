import { useRef, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { diagnoseTrace, LessonTrace, type Diagnosis } from '@/lib/cognition';
import type { PlanetId } from '@/lib/planets';

/** One lesson session: tap traces stay in memory; only the summary is saved. */
export function useCognitionSession(planet: PlanetId) {
  const { saveDiagnosis } = useGame();
  const traceRef = useRef(new LessonTrace());
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  const publish = () => {
    const result = diagnoseTrace(planet, traceRef.current);
    setDiagnosis(result);
    void saveDiagnosis(result);
    return result;
  };

  return { trace: traceRef.current, diagnosis, publish, setDiagnosis };
}
