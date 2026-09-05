import { PLANET_META, type PlanetId } from '@/lib/planets';
import type { StudentState } from '@/lib/classroom';
import { MISCONCEPTION_LABEL, NEXT_PLANET, PRACTICE_TITLE, TEACHER_LINE } from './catalog';
import type { MisconceptionCode } from './types';

export interface BriefingAction {
  code: MisconceptionCode;
  title: string;
  detail: string;
  planet: PlanetId;
  planetName: string;
  students: string[];
}

export interface ClassBriefing {
  total: number;
  withSignal: number;
  onTrack: number;
  needsAttention: number;
  quizTaken: number;
  actions: BriefingAction[];
}

const ATTENTION: MisconceptionCode[] = [
  'COUNT_ALL',
  'OVERSHOOT',
  'SUB_FLIP',
  'COMMUTE',
  'DIGIT_REV',
  'WORD_GAP',
  'PLACE_SPLIT',
];

export const buildClassBriefing = (students: StudentState[]): ClassBriefing => {
  const groups = new Map<MisconceptionCode, string[]>();
  let quizTaken = 0;
  let onTrack = 0;
  let withSignal = 0;

  for (const student of students) {
    if (student.lastQuiz) quizTaken += 1;
    const code = student.lastDiagnosis?.primary;
    if (!code) continue;
    withSignal += 1;
    if (code === 'STEADY') onTrack += 1;
    const list = groups.get(code) ?? [];
    list.push(student.nickname);
    groups.set(code, list);
  }

  const actions: BriefingAction[] = ATTENTION.filter((code) => (groups.get(code)?.length ?? 0) > 0)
    .map((code) => {
      const planet = NEXT_PLANET[code];
      return {
        code,
        title: PRACTICE_TITLE[code],
        detail: TEACHER_LINE[code],
        planet,
        planetName: PLANET_META[planet].name,
        students: groups.get(code) ?? [],
      };
    })
    .sort((a, b) => b.students.length - a.students.length);

  return {
    total: students.length,
    withSignal,
    onTrack,
    needsAttention: withSignal - onTrack,
    quizTaken,
    actions,
  };
};

export const briefingHeadline = (briefing: ClassBriefing): string => {
  if (briefing.total === 0) return 'No students have joined yet.';
  if (briefing.withSignal === 0) {
    return 'Students have joined. Signals appear after a checked activity or quiz.';
  }
  if (briefing.actions.length === 0) {
    return 'The class is on track. Keep the current unlock planet.';
  }
  const first = briefing.actions[0];
  const n = first.students.length;
  const verb = n === 1 ? 'needs' : 'need';
  return `${n} student${n === 1 ? '' : 's'} ${verb} practice with ${MISCONCEPTION_LABEL[first.code].toLowerCase()}.`;
};

export const briefingToText = (briefing: ClassBriefing): string => {
  const lines = [
    'MathLift class briefing',
    briefingHeadline(briefing),
    '',
    `Students: ${briefing.total}`,
    `Need a short group: ${briefing.needsAttention}`,
    `On track: ${briefing.onTrack}`,
    `Finished a quiz: ${briefing.quizTaken}`,
  ];
  if (briefing.actions.length > 0) {
    lines.push('', 'Tomorrow’s ten minutes');
    for (const action of briefing.actions) {
      lines.push(
        '',
        action.title,
        `${action.planetName} · ${MISCONCEPTION_LABEL[action.code]}`,
        action.detail,
        action.students.join(', ')
      );
    }
  }
  return lines.join('\n');
};
