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
  improvement: number;
  curriculumId: string | null;
}

export const accuracyOf = (progress: PathProgress): number => {
  let correct = 0;
  let attempts = 0;
  for (const stat of Object.values(progress.nodeMastery)) {
    correct += stat.correct;
    attempts += stat.attempts;
  }
  if (attempts === 0) return 0;
  return correct / attempts;
};

export const improvementOf = (assessments: AssessmentSummary[] | undefined): number => {
  const list = assessments ?? [];
  if (list.length < 2) return 0;
  return list[list.length - 1].clearedIndex - list[0].clearedIndex;
};

export const totalTime = (record: LearnerRecord): number =>
  Object.values(record.timeByDay).reduce((sum, value) => sum + value, 0);

export const studentReport = (
  spaceName: string,
  record: LearnerRecord,
  curriculumId: string | null,
  diagnosisTopic?: string | null
): StudentReport => {
  const progress = progressFor(record, record.activePathId || 'foundations');
  const struggling = lowestTopics(record, 3);
  if (diagnosisTopic && !struggling.includes(diagnosisTopic)) struggling.push(diagnosisTopic);
  const latest = record.assessments[record.assessments.length - 1] ?? null;
  return {
    spaceName,
    activePathId: record.activePathId || 'foundations',
    currentNodeId: progress.currentNodeId,
    accuracy: accuracyOf(progress),
    timeSeconds: totalTime(record),
    struggling,
    latestAssessment: latest,
    improvement: improvementOf(record.assessments),
    curriculumId,
  };
};

export const classAverages = (reports: StudentReport[], progress: number[] = []) => {
  const count = reports.length || 1;
  return {
    students: reports.length,
    teachers: reports.length === 0 ? 0 : 1,
    averageProgress: progress.reduce((sum, value) => sum + value, 0) / Math.max(progress.length, 1),
    averageAccuracy: reports.reduce((sum, report) => sum + report.accuracy, 0) / count,
    averageImprovement: reports.reduce((sum, report) => sum + report.improvement, 0) / count,
    averageTime: reports.reduce((sum, report) => sum + report.timeSeconds, 0) / count,
  };
};

export const progressRatio = (record: LearnerRecord): number => {
  const path = getPathOrFoundations(record.activePathId);
  const progress = progressFor(record, path.id);
  const done = progress.completedNodeIds.length;
  return done / Math.max(path.nodes.length, 1);
};

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
      formatCsvNumber(report.improvement),
      report.curriculumId ?? '',
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
      formatCsvNumber(avg.averageImprovement),
      '',
    ]);
  }
  return toCsv(rows);
};
