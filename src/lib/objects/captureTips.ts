const TIPS_KEY = 'mathlift:object-capture-tips-seen.v1';

export const haveSeenCaptureTips = (): boolean => {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(TIPS_KEY) === '1';
  } catch {
    return true;
  }
};

export const markCaptureTipsSeen = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(TIPS_KEY, '1');
  } catch {
    /* private mode */
  }
};
