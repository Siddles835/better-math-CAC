const KEY = 'mathlift:demo';

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      window.localStorage.setItem(KEY, '1');
      return true;
    }
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const enableDemo = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, '1');
};

export const disableDemo = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
};
