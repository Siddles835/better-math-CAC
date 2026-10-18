import type { AssessmentSummary, LearnerRecord, PathProgress } from '@/content/types';
import { getPathOrFoundations } from '@/content/catalog';
import { lowestTopics, progressFor } from '@/lib/paths/progress';
import { formatCsvNumber, toCsv } from '@/lib/reporting/csv';

export interface StudentReport {
  spaceName: string;
  activePathId: string;
  currentNodeId: string;
  accuracy: number;
  timeSeconds: number;
  struggling: string[];
  latestAssessment: AssessmentSummary | null;
  improvement: number | null;
  curriculumId: string | null;
  /** True when progress came from a sparse/legacy fallback, not a full learner doc. */
  legacyOnly?: boolean;
}

export const accuracyOf = (progress: PathProgress): number => {
  let correct = 0;
  let attempts = 0;
  for (const stat of Object.values(progress.nodeMastery ?? {})) {
    correct += stat.correct;
    attempts += stat.attempts;
  }
  if (attempts === 0) return 0;
  return correct / attempts;
};

export const improvementOf = (assessments: AssessmentSummary[] | undefined): number | null => {
  const list = assessments ?? [];
  if (list.length < 2) return null;
  return list[list.length - 1].clearedIndex - list[0].clearedIndex;
};

export const totalTime = (record: LearnerRecord): number =>
  Object.values(record.timeByDay ?? {}).reduce((sum, value) => sum + value, 0);

/** Harden incomplete learner docs so one bad record cannot crash the pilot panel. */
export const normalizeLearnerRecord = (record: LearnerRecord): LearnerRecord => {
  const paths = record.paths ?? {};
  const safePaths: LearnerRecord['paths'] = {};
  for (const [pathId, progress] of Object.entries(paths)) {
    safePaths[pathId] = {
      currentNodeId: progress?.currentNodeId ?? '',
      completedNodeIds: Array.isArray(progress?.completedNodeIds) ? progress.completedNodeIds : [],
      nodeMastery: progress?.nodeMastery ?? {},
      topicMastery: progress?.topicMastery ?? {},
    };
  }
  return {
    ...record,
    activePathId: record.activePathId || 'foundations',
    paths: safePaths,
    timeByDay: record.timeByDay ?? {},
    assessments: Array.isArray(record.assessments) ? record.assessments : [],
    curriculumProgress: record.curriculumProgress ?? {},
  };
};

export const studentReport = (
  spaceName: string,
  record: LearnerRecord,
  curriculumId: string | null,
  diagnosisTopic?: string | null,
  legacyOnly = false
): StudentReport => {
  const safe = normalizeLearnerRecord(record);
  const progress = progressFor(safe, safe.activePathId || 'foundations');
  const struggling = lowestTopics(safe, 3);
  if (diagnosisTopic && !struggling.includes(diagnosisTopic)) struggling.push(diagnosisTopic);
  const latest = safe.assessments[safe.assessments.length - 1] ?? null;
  return {
    spaceName,
    activePathId: safe.activePathId || 'foundations',
    currentNodeId: progress.currentNodeId,
    accuracy: accuracyOf(progress),
    timeSeconds: totalTime(safe),
    struggling,
    latestAssessment: latest,
    improvement: improvementOf(safe.assessments),
    curriculumId,
    legacyOnly,
  };
};

export const classAverages = (reports: StudentReport[], progress: number[] = []) => {
  const count = reports.length || 1;
  const knownImprovement = reports
    .map((report) => report.improvement)
    .filter((value): value is number => typeof value === 'number');
  return {
    students: reports.length,
    teachers: reports.length === 0 ? 0 : 1,
    averageProgress: progress.reduce((sum, value) => sum + value, 0) / Math.max(progress.length, 1),
    averageAccuracy: reports.reduce((sum, report) => sum + report.accuracy, 0) / count,
    averageImprovement:
      knownImprovement.length === 0
        ? null
        : knownImprovement.reduce((sum, value) => sum + value, 0) / knownImprovement.length,
    averageTime: reports.reduce((sum, report) => sum + report.timeSeconds, 0) / count,
  };
};

export const progressRatio = (record: LearnerRecord): number => {
  const safe = normalizeLearnerRecord(record);
  const path = getPathOrFoundations(safe.activePathId);
  const progress = progressFor(safe, path.id);
  const done = progress.completedNodeIds.length;
  return done / Math.max(path.nodes.length, 1);
};

export const formatPercent = (ratio: number): string =>
  `${formatCsvNumber(Math.round(ratio * 100))}%`;

export const reportsToCsv = (reports: StudentReport[]): string => {
  const header = [
    'space_name',
    'path',
    'current_node',
    'accuracy',
    'time_seconds',
    'struggling',
    'improvement',
    'curriculum',
    'legacy_only',
  ];
  const rows: Array<Array<string | number>> = [header];
  for (const report of reports) {
    rows.push([
      report.spaceName,
      report.activePathId,
      report.currentNodeId,
      formatCsvNumber(report.accuracy),
      formatCsvNumber(report.timeSeconds),
      report.struggling.join('|'),
      report.improvement === null ? '' : formatCsvNumber(report.improvement),
      report.curriculumId ?? '',
      report.legacyOnly ? '1' : '0',
    ]);
  }
  if (reports.length > 0) {
    const avg = classAverages(reports);
    rows.push([
      'CLASS',
      '',
      '',
      formatCsvNumber(avg.averageAccuracy),
      formatCsvNumber(avg.averageTime),
      '',
      avg.averageImprovement === null ? '' : formatCsvNumber(avg.averageImprovement),
      '',
      '',
    ]);
  }
  return toCsv(rows);
};
