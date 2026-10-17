import { CURRICULUM_BASE_PATHS, PATHS, getPath } from '@/content/catalog';
import type { Assignment, Curriculum, LearnerRecord, PathProgress, PilotGoals } from '@/content/types';
import type { Classroom, StudentState } from '@/lib/classroom';
import { buildThreeTopicCurriculum } from '@/lib/curriculum/threeTopicBuild';
import { duplicatePath, splitNode } from '@/lib/curriculum/logic';
import { mulberry32 } from '@/lib/answers/rng';
import { summarizeBands, bandsForPath } from '@/lib/placementBands';
import { emptyPathProgress, recordAttempt } from '@/lib/paths/progress';
import { seededUsername } from '@/lib/usernames';

export const DEMO_CLASS_CODE = 'demo';
export const DEMO_PIN = 'DEMO01';

/** First seeded student (mulberry32(20261010)); used by one-tap demo login. */
export const DEMO_STUDENT_NICKNAME = (() => {
  const rng = mulberry32(20261010);
  return seededUsername(rng);
})();

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
  const pathIds = [
    'foundations',
    'foundations',
    'foundations',
    'foundations',
    'operations',
    'operations',
    'operations',
    'operations',
  ];
  const names = Array.from({ length: 8 }, () => seededUsername(rng));
  const students: Record<string, StudentState> = {};
  const learners: Record<string, LearnerRecord> = {};

  names.forEach((name, index) => {
    const key = keyOf(name);
    const pathId = pathIds[index] ?? 'foundations';
    const path = getPath(pathId) ?? PATHS[0];
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
    const planet = progress.currentNodeId || 'sun';
    const lesson =
      pathId === 'operations'
        ? planet === 'earth' || planet === 'mars' || planet === 'jupiter'
          ? 'division'
          : planet === 'saturn' || planet === 'uranus' || planet === 'neptune'
            ? 'algebra'
            : 'multiplication'
        : planet === 'earth' || planet === 'mars' || planet === 'jupiter'
          ? 'addition'
          : planet === 'saturn' || planet === 'uranus' || planet === 'neptune'
            ? 'subtraction'
            : 'counting';
    students[key] = {
      nickname: name,
      planet,
      lesson,
      completedPlanets: progress.completedNodeIds,
      planetSteps: {},
      lastUpdated: Date.UTC(2026, 9, 4),
    };
  });

  const addition =
    CURRICULUM_BASE_PATHS.find((path) => path.id === 'addition') ?? PATHS[0];
  let curriculum = duplicatePath(addition, DEMO_CLASS_CODE, 'demo-slower', 'Smaller steps');
  curriculum = splitNode(curriculum, curriculum.nodes[0]?.id ?? '');
  curriculum = {
    ...curriculum,
    status: 'published',
    nodes: curriculum.nodes.map((node) => ({ ...node, extraPractice: 2, masteryThreshold: 60 })),
  };

  let threeTopic = buildThreeTopicCurriculum({
    classCode: DEMO_CLASS_CODE,
    topics: ['counting', 'addition', 'subtraction'],
    grade: '1',
    pace: 'standard',
    name: 'Demo path: Count · Add · Subtract',
    id: 'demo-three-topic',
  });
  threeTopic = { ...threeTopic, status: 'published', updatedAt: Date.UTC(2026, 8, 3) };

  const slowKey = keyOf(names[5] ?? names[0]);
  const leadKey = keyOf(names[0] ?? DEMO_STUDENT_NICKNAME);
  let leadThree: PathProgress = {
    currentNodeId: threeTopic.nodes[0]?.id ?? 'sun',
    completedNodeIds: [],
    nodeMastery: {},
    topicMastery: {},
  };
  const firstNode = threeTopic.nodes[0];
  if (firstNode) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      leadThree = recordAttempt(
        leadThree,
        firstNode.id,
        firstNode.topics,
        attempt < 3,
        firstNode.masteryThreshold,
        3
      );
    }
  }
  if (learners[leadKey]) {
    learners[leadKey] = {
      ...learners[leadKey],
      curriculumProgress: {
        ...learners[leadKey].curriculumProgress,
        [threeTopic.id]: leadThree,
      },
    };
  }

  const assignments: Assignment[] = [
    {
      id: 'demo-class',
      curriculumId: curriculum.id,
      scope: { kind: 'class' },
      mode: 'alongside',
      updatedAt: Date.UTC(2026, 8, 1),
    },
    {
      id: 'demo-three-topic-class',
      curriculumId: threeTopic.id,
      scope: { kind: 'class' },
      mode: 'alongside',
      updatedAt: Date.UTC(2026, 8, 4),
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
      allowStudentObjectPhotos: true,
      students,
    },
    learners,
    curricula: [curriculum, threeTopic],
    assignments,
    goals: {
      whereWeAre: 'Learners are spread across paths. A few need smaller steps.',
      whereWeWant: 'Every learner has a next planet and a topic to practice.',
      updatedAt: Date.UTC(2026, 9, 1),
    },
  };
};
