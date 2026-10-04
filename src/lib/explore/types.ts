/** Open-ended Explore activities (Prompt C). */
export type ExploreActivityId =
  | 'show-me'
  | 'quick-look'
  | 'number-talk'
  | 'wodb'
  | 'make-ten'
  | 'number-line'
  | 'build-story'
  | 'pattern-skip';

export const EXPLORE_ACTIVITY_IDS: ExploreActivityId[] = [
  'show-me',
  'quick-look',
  'number-talk',
  'wodb',
  'make-ten',
  'number-line',
  'build-story',
  'pattern-skip',
];

/** Coarse on-device signal only — no free text, no drawings. */
export interface ExploreSignal {
  activityId: ExploreActivityId;
  waysFound: number;
  at: number;
}

export interface ExploreCollectionItem {
  id: string;
  activityId: ExploreActivityId;
  label: string;
  waysFound: number;
  at: number;
}

export type ExploreBand = 'to10' | 'to20' | 'to100';

export interface ShowMePrompt {
  kind: 'show-me';
  target: number;
  seed: number;
}

export interface QuickLookPrompt {
  kind: 'quick-look';
  dots: number;
  /** Structured groups for “how do you see it” (e.g. [3,2]). */
  groups: number[];
  flashMs: number | null;
  seed: number;
}

export interface NumberTalkPrompt {
  kind: 'number-talk';
  total: number;
  pattern: 'dice' | 'ten-frame' | 'rows';
  groups: number[];
  observationKeys: string[];
  seed: number;
}

export interface WodbOption {
  id: string;
  /** Dot count or shape code for rendering. */
  dots: number;
  arrangement: 'line' | 'triangle' | 'square' | 'scatter';
  /** Reason keys that validly justify picking this option. */
  reasonKeys: string[];
}

export interface WodbPrompt {
  kind: 'wodb';
  options: WodbOption[];
  /** Every option id that can be a valid “doesn’t belong” with some reason. */
  validOptionIds: string[];
  seed: number;
}

export interface MakeTenPrompt {
  kind: 'make-ten';
  goal: 10 | 20 | 100;
  seed: number;
}

export interface NumberLinePrompt {
  kind: 'number-line';
  min: number;
  max: number;
  start: number;
  compare: number;
  hop: number;
  seed: number;
}

export interface BuildStoryPrompt {
  kind: 'build-story';
  op: 'add' | 'sub';
  a: number;
  b: number;
  objectKey: 'star' | 'moon' | 'rocket' | 'pebble';
  seed: number;
}

export interface PatternSkipPrompt {
  kind: 'pattern-skip';
  step: 2 | 5 | 10;
  start: number;
  sequence: number[];
  /** Index in sequence that is broken (or -1 if extend mode). */
  breakIndex: number;
  mode: 'extend' | 'break';
  seed: number;
}

export type ExplorePrompt =
  | ShowMePrompt
  | QuickLookPrompt
  | NumberTalkPrompt
  | WodbPrompt
  | MakeTenPrompt
  | NumberLinePrompt
  | BuildStoryPrompt
  | PatternSkipPrompt;
