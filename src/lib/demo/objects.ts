import { patchObjectPrefs } from '@/lib/objects/prefs';

/** Starter pack for demos: pencil active, pictures on, grown-up already unlocked. */
export const seedDemoObjectPrefs = (): void => {
  patchObjectPrefs({
    activeId: 'builtin:pencil',
    showPicturesWithProblems: true,
    grownUpUnlocked: true,
  });
};
