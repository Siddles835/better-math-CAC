import {
  getFurthestProgressPlanet,
  getLessonForPlanet,
  getNextPlanet,
  getPlanetIndex,
  normalizePlanetId,
  type PlanetId,
} from '@/lib/planets';

export type ArrayUnionValue = { __arrayUnion: string[] };

export const arrayUnionValue = (...ids: string[]): ArrayUnionValue => ({
  __arrayUnion: ids,
});

export const isArrayUnion = (value: unknown): value is ArrayUnionValue =>
  !!value &&
  typeof value === 'object' &&
  Array.isArray((value as ArrayUnionValue).__arrayUnion);

export interface ProgressView {
  planet: PlanetId;
  lesson: ReturnType<typeof getLessonForPlanet>;
  lastPlanet: PlanetId;
  completedPlanets: PlanetId[];
  planetSteps: Record<string, number>;
}

export interface RemoteStudent {
  planet?: string;
  lesson?: ProgressView['lesson'];
  lastPlanet?: string;
  completedPlanets?: string[];
  planetSteps?: Record<string, number>;
}

const asPlanet = (id: string | null | undefined): PlanetId => normalizePlanetId(id) ?? 'sun';

const uniquePlanets = (ids: string[]): PlanetId[] => {
  const out: PlanetId[] = [];
  for (const id of ids) {
    const planet = normalizePlanetId(id);
    if (planet && !out.includes(planet)) out.push(planet);
  }
  return out;
};

export const emptyProgress = (): ProgressView => ({
  planet: 'sun',
  lesson: 'counting',
  lastPlanet: 'sun',
  completedPlanets: [],
  planetSteps: {},
});

/** Furthest planet, union of completions, and the higher step on each planet. */
export const mergeProgressView = (
  local: ProgressView,
  remote: RemoteStudent,
  keepLocalLastPlanet: boolean
): ProgressView => {
  const planetSteps = { ...local.planetSteps };
  for (const [planet, step] of Object.entries(remote.planetSteps ?? {})) {
    planetSteps[planet] = Math.max(planetSteps[planet] ?? 0, step);
  }
  const completedPlanets = uniquePlanets([
    ...local.completedPlanets,
    ...(remote.completedPlanets ?? []),
  ]);
  const planet = getFurthestProgressPlanet({
    planet:
      getPlanetIndex(local.planet) >= getPlanetIndex(asPlanet(remote.planet))
        ? local.planet
        : asPlanet(remote.planet),
    completedPlanets,
    planetSteps,
  });
  const remoteLast = normalizePlanetId(remote.lastPlanet);
  return {
    planet,
    lesson: getLessonForPlanet(planet),
    lastPlanet: keepLocalLastPlanet ? local.lastPlanet : remoteLast ?? local.lastPlanet,
    completedPlanets,
    planetSteps,
  };
};

export interface StudentWriter {
  view: () => ProgressView;
  seed: (remote: RemoteStudent, keepLocalLastPlanet: boolean) => void;
  savePlanetStep: (planetId: PlanetId, step: number) => Promise<void>;
  completePlanet: (planetId: PlanetId) => Promise<void>;
  markVisited: (planetId: PlanetId) => Promise<void>;
  enqueueFields: (read: () => Record<string, unknown>) => Promise<void>;
  persistProgress: () => Promise<void>;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One queue per student. Each job sends only the fields it owns, read at
 * execution time, so an older step save cannot write an older planet back.
 */
export const createStudentWriter = (options: {
  write: (fields: Record<string, unknown>) => Promise<void>;
  initial?: ProgressView;
  retries?: number;
  retryDelayMs?: number;
}): StudentWriter => {
  let current: ProgressView = options.initial
    ? {
        ...options.initial,
        completedPlanets: [...options.initial.completedPlanets],
        planetSteps: { ...options.initial.planetSteps },
      }
    : emptyProgress();
  const retries = options.retries ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 200;
  let chain: Promise<void> = Promise.resolve();

  const snapshot = (): ProgressView => ({
    planet: current.planet,
    lesson: current.lesson,
    lastPlanet: current.lastPlanet,
    completedPlanets: [...current.completedPlanets],
    planetSteps: { ...current.planetSteps },
  });

  const enqueue = (read: () => Record<string, unknown>) => {
    const job = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < retries; attempt += 1) {
        try {
          await options.write(read());
          return;
        } catch (error) {
          lastError = error;
          if (attempt < retries - 1 && retryDelayMs > 0) {
            await delay(retryDelayMs * (attempt + 1));
          }
        }
      }
      console.error('Could not save student progress', lastError);
    };
    const next = chain.then(job, job);
    chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };

  const progressFields = (): Record<string, unknown> => {
    const fields: Record<string, unknown> = {
      planet: current.planet,
      lesson: current.lesson,
      lastPlanet: current.lastPlanet,
    };
    if (current.completedPlanets.length > 0) {
      fields.completedPlanets = arrayUnionValue(...current.completedPlanets);
    }
    return fields;
  };

  return {
    view: snapshot,
    seed(remote, keepLocalLastPlanet) {
      current = mergeProgressView(current, remote, keepLocalLastPlanet);
    },
    savePlanetStep(planetId, step) {
      current.planetSteps = {
        ...current.planetSteps,
        [planetId]: Math.max(current.planetSteps[planetId] ?? 0, step),
      };
      return enqueue(() => ({
        [`planetSteps.${planetId}`]: current.planetSteps[planetId] ?? 0,
      }));
    },
    completePlanet(planetId) {
      if (!current.completedPlanets.includes(planetId)) {
        current.completedPlanets = [...current.completedPlanets, planetId];
      }
      const next = getNextPlanet(planetId) ?? planetId;
      if (getPlanetIndex(next) >= getPlanetIndex(current.planet)) {
        current.planet = next;
        current.lesson = getLessonForPlanet(next);
      }
      current.lastPlanet = next;
      return enqueue(() => progressFields());
    },
    markVisited(planetId) {
      current.lastPlanet = planetId;
      if (getPlanetIndex(planetId) > getPlanetIndex(current.planet)) {
        current.planet = planetId;
        current.lesson = getLessonForPlanet(planetId);
      }
      return enqueue(() => ({
        lastPlanet: current.lastPlanet,
        planet: current.planet,
        lesson: current.lesson,
      }));
    },
    enqueueFields(read) {
      return enqueue(read);
    },
    persistProgress() {
      return enqueue(() => progressFields());
    },
  };
};
