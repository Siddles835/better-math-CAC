import { PATHS } from '@/content/catalog';
import type { Assignment, Curriculum, LearnerRecord, PilotGoals } from '@/content/types';
import type { Classroom, StudentState } from '@/lib/classroom';
import { duplicatePath, splitNode } from '@/lib/curriculum/logic';
import { mulberry32 } from '@/lib/answers/rng';
import { summarizeBands, bandsForPath } from '@/lib/placementBands';
import { emptyPathProgress, recordAttempt } from '@/lib/paths/progress';
import { seededUsername } from '@/lib/usernames';

export const DEMO_CLASS_CODE = 'demo';
export const DEMO_PIN = 'DEMO01';

const keyOf = (name: string): string => name.trim().toLowerCase();

const dayKey = (index: number): string => {
  const date = new Date(Date.UTC(2026, 7, 24 + index));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export interface DemoWorld {
  classroom: Classroom;
  learners: Record<string, LearnerRecord>;
  curricula: Curriculum[];
  assignments: Assignment[];
  goals: PilotGoals;
}

export const buildDemoWorld = (): DemoWorld => {
  const rng = mulberry32(20261010);
  const pathIds = ['foundations', 'addition', 'subtraction', 'multiplication', 'division', 'algebra', 'geometry', 'foundations'];
  const names = Array.from({ length: 8 }, () => seededUsername(rng));
  const students: Record<string, StudentState> = {};
  const learners: Record<string, LearnerRecord> = {};

  names.forEach((name, index) => {
    const key = keyOf(name);
    const pathId = pathIds[index] ?? 'foundations';
    const path = PATHS.find((item) => item.id === pathId) ?? PATHS[0];
    let progress = emptyPathProgress(path);
    const steps = 2 + (index % 3);
    for (let nodeIndex = 0; nodeIndex < Math.min(steps, path.nodes.length); nodeIndex += 1) {
      const node = path.nodes[nodeIndex];
      for (let attempt = 0; attempt < 4; attempt += 1) {
        progress = recordAttempt(progress, node.id, node.topics, attempt < 3 || index % 5 !== 0, node.masteryThreshold, 3);
      }
      if (progress.nodeMastery[node.id]?.mastered) {
        progress = { ...progress, currentNodeId: path.nodes[nodeIndex + 1]?.id ?? node.id };
      }
    }
    const bands = bandsForPath(pathId);
    const first = summarizeBands(bands, Math.max(0, index % 3), Date.UTC(2026, 7, 24));
    const latest = summarizeBands(bands, Math.min(bands.length - 1, 2 + (index % 4)), Date.UTC(2026, 9, 1));
    const timeByDay: Record<string, number> = {};
    for (let day = 0; day < 42; day += 1) {
      const roll = Math.floor(rng() * 900);
      timeByDay[dayKey(day)] = day % 7 === 0 ? 0 : 180 + roll;
    }
    const learner: LearnerRecord = {
      activePathId: pathId,
      paths: { [pathId]: progress },
      curriculumProgress: {},
      assessments: [first, latest],
      timeByDay,
    };
    learners[key] = learner;
    const planet = pathId === 'foundations' ? (progress.currentNodeId || 'sun') : 'sun';
    students[key] = {
      nickname: name,
      planet,
      lesson: planet === 'earth' || planet === 'mars' || planet === 'jupiter' ? 'addition' : planet === 'saturn' || planet === 'uranus' || planet === 'neptune' ? 'subtraction' : 'counting',
      completedPlanets: pathId === 'foundations' ? progress.completedNodeIds : [],
      planetSteps: {},
      lastUpdated: Date.UTC(2026, 9, 4),
    };
  });

  const addition = PATHS.find((path) => path.id === 'addition') ?? PATHS[0];
  let curriculum = duplicatePath(addition, DEMO_CLASS_CODE, 'demo-slower', 'Smaller steps');
  curriculum = splitNode(curriculum, curriculum.nodes[0]?.id ?? '');
  curriculum = {
    ...curriculum,
    status: 'published',
    nodes: curriculum.nodes.map((node) => ({ ...node, extraPractice: 2, masteryThreshold: 60 })),
  };
  const slowKey = keyOf(names[5] ?? names[0]);
  const assignments: Assignment[] = [
    {
      id: 'demo-class',
      curriculumId: curriculum.id,
      scope: { kind: 'class' },
      mode: 'alongside',
      updatedAt: Date.UTC(2026, 8, 1),
    },
    {
      id: 'demo-student',
      curriculumId: curriculum.id,
      scope: { kind: 'student', studentKey: slowKey },
      mode: 'replace',
      updatedAt: Date.UTC(2026, 8, 2),
    },
  ];

  return {
    classroom: {
      classCode: DEMO_CLASS_CODE,
      teacherCode: DEMO_PIN,
      defaultStart: { planet: 'sun', lesson: 'counting', pathId: 'foundations' },
      usePlacementCheck: true,
      students,
    },
    learners,
    curricula: [curriculum],
    assignments,
    goals: {
      whereWeAre: 'Learners are spread across paths. A few need smaller steps.',
      whereWeWant: 'Every learner has a next planet and a topic to practice.',
      updatedAt: Date.UTC(2026, 9, 1),
    },
  };
};
