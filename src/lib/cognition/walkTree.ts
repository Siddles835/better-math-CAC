export interface ExportedTree {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  classes: string[];
  values: number[][][];
}

export const walkTree = (
  tree: ExportedTree,
  values: number[]
): { label: string; confidence: number; shares: Record<string, number> } => {
  let node = 0;
  while (true) {
    const featureIndex = tree.feature[node];
    if (featureIndex === -2) break;
    const value = values[featureIndex] ?? 0;
    node = value <= tree.threshold[node] ? tree.children_left[node] : tree.children_right[node];
  }

  const counts = tree.values[node][0];
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const shares: Record<string, number> = {};
  let bestIndex = 0;
  for (let i = 0; i < counts.length; i++) {
    shares[tree.classes[i]] = counts[i] / total;
    if (counts[i] > counts[bestIndex]) bestIndex = i;
  }

  return {
    label: tree.classes[bestIndex],
    confidence: counts[bestIndex] / total,
    shares,
  };
};
