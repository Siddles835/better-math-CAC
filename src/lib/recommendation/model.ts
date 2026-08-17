import treeData from './decision_tree.json';
import type { LessonPerformance } from './features';

export type Recommendation =
  | 'review'
  | 'practice'
  | 'advance'
  | 'challenge';

interface DecisionTree {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  classes: string[];
  values: number[][][];
}

const tree = treeData as DecisionTree;

/**
 * IMPORTANT:
 *
 * These must stay in exactly the same order as the
 * columns used when training train.py.
 */
const FEATURE_ORDER: (keyof LessonPerformance)[] = [
  'planet',
  'lessonDifficulty',
  'accuracy',
  'avgTime',
  'hints',
  'retries',
  'improvement',
  'consistency',
  'streak',
];

const getFeatureValue = (
  features: LessonPerformance,
  index: number
): number => {
  const name = FEATURE_ORDER[index];
  return features[name];
};

/**
 * Run the exported sklearn decision tree.
 */
export const predictRecommendation = (
  features: LessonPerformance
): Recommendation => {
  let node = 0;

  while (true) {
    const featureIndex = tree.feature[node];

    // sklearn uses -2 to indicate a leaf.
    if (featureIndex === -2) {
      break;
    }

    const value = getFeatureValue(features, featureIndex);
    const threshold = tree.threshold[node];

    if (value <= threshold) {
      node = tree.children_left[node];
    } else {
      node = tree.children_right[node];
    }
  }

  const counts = tree.values[node][0];

  let bestIndex = 0;

  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[bestIndex]) {
      bestIndex = i;
    }
  }

  return tree.classes[bestIndex] as Recommendation;
};