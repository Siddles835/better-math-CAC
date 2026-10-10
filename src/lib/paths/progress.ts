import { ASSESSMENT_CAP, DEFAULT_MASTERY, TIME_DAY_CAP } from '@/content/types';
import type {
  AssessmentSummary,
  LearnerRecord,
  Path,
  PathProgress,
} from '@/content/types';
import type { StudentState } from '@/lib/classroom';
import { getPathOrFoundations } from '@/content/catalog';

export const emptyPathProgress = (path: Path): PathProgress => ({
  currentNodeId: path.nodes[0]?.id ?? '',
  completedNodeIds: [],
  nodeMastery: {},
  topicMastery: {},
});

export const emptyLearner = (pathId = 'foundations'): LearnerRecord => ({
  activePathId: pathId,
  paths: {},
  curriculumProgress: {},
  assessments: [],
  timeByDay: {},
});

/** Old student documents have planet fields and no path record. */
export const learnerFromLegacy = (
  student: Partial<StudentState> | null | undefined,
  pathId = 'foundations'
): LearnerRecord => {
  const record = emptyLearner(pathId || 'foundations');
  const path = getPathOrFoundations(record.activePathId);
  if (record.activePathId === 'foundations') {
    const completed = Array.isArray(student?.completedPlanets) ? student!.completedPlanets! : [];
    const current = typeof student?.planet === 'string' && student.planet ? student.planet : path.nodes[0]?.id ?? 'sun';
    const mastered: PathProgress['nodeMastery'] = {};
    for (const id of completed) {
      mastered[id] = { correct: 1, attempts: 1, mastered: true };
    }
    record.paths.foundations = {
      currentNodeId: current,
      completedNodeIds: [...completed],
      nodeMastery: mastered,
      topicMastery: {},
    };
  } else if (!record.paths[record.activePathId]) {
    record.paths[record.activePathId] = emptyPathProgress(path);
  }
  return record;
};

export const progressFor = (record: LearnerRecord, pathId: string): PathProgress => {
  const existing = record.paths[pathId];
  if (existing) return existing;
  return emptyPathProgress(getPathOrFoundations(pathId));
};

export const isNodeUnlocked = (path: Path, progress: PathProgress, nodeId: string): boolean => {
  const node = path.nodes.find((item) => item.id === nodeId);
  if (!node) return false;
  return node.prerequisites.every(
    (id) => progress.completedNodeIds.includes(id) || progress.nodeMastery[id]?.mastered
  );
};

export const recordAttempt = (
  progress: PathProgress,
  nodeId: string,
  topics: string[],
  correct: boolean,
  threshold = DEFAULT_MASTERY,
  minAttempts = 3
): PathProgress => {
  const prev = progress.nodeMastery[nodeId] ?? { correct: 0, attempts: 0, mastered: false };
  const nextNode = {
    correct: prev.correct + (correct ? 1 : 0),
    attempts: prev.attempts + 1,
    mastered: false,
  };
  const ratio = nextNode.attempts === 0 ? 0 : nextNode.correct / nextNode.attempts;
  nextNode.mastered = nextNode.attempts >= minAttempts && ratio * 100 >= threshold;
  const topicMastery = { ...progress.topicMastery };
  for (const topic of topics) {
    const was = topicMastery[topic] ?? { correct: 0, attempts: 0 };
    topicMastery[topic] = {
      correct: was.correct + (correct ? 1 : 0),
      attempts: was.attempts + 1,
    };
  }
  const completed = new Set(progress.completedNodeIds);
  if (nextNode.mastered) completed.add(nodeId);
  return {
    ...progress,
    completedNodeIds: [...completed],
    nodeMastery: { ...progress.nodeMastery, [nodeId]: nextNode },
    topicMastery,
    currentNodeId: progress.currentNodeId,
  };
};

export const switchPath = (record: LearnerRecord, pathId: string): LearnerRecord => {
  const path = getPathOrFoundations(pathId);
  const existing = record.paths[pathId] ?? emptyPathProgress(path);
  return {
    ...record,
    activePathId: pathId,
    paths: { ...record.paths, [pathId]: existing },
  };
};

export const appendAssessment = (
  record: LearnerRecord,
  summary: AssessmentSummary
): LearnerRecord => ({
  ...record,
  assessments: [...record.assessments, summary].slice(-ASSESSMENT_CAP),
});

export const addTimeSeconds = (
  record: LearnerRecord,
  day: string,
  seconds: number
): LearnerRecord => {
  if (seconds <= 0) return record;
  const timeByDay = { ...record.timeByDay, [day]: (record.timeByDay[day] ?? 0) + Math.round(seconds) };
  const keys = Object.keys(timeByDay).sort();
  while (keys.length > TIME_DAY_CAP) {
    const drop = keys.shift();
    if (drop) delete timeByDay[drop];
  }
  return { ...record, timeByDay };
};

export const lowestTopics = (record: LearnerRecord, limit = 3): string[] => {
  const totals = new Map<string, { correct: number; attempts: number }>();
  for (const progress of Object.values(record.paths)) {
    for (const [topic, stat] of Object.entries(progress.topicMastery)) {
      const prev = totals.get(topic) ?? { correct: 0, attempts: 0 };
      totals.set(topic, {
        correct: prev.correct + stat.correct,
        attempts: prev.attempts + stat.attempts,
      });
    }
  }
  return [...totals.entries()]
    .filter(([, stat]) => stat.attempts > 0)
    .sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts)
    .slice(0, limit)
    .map(([topic]) => topic);
};
