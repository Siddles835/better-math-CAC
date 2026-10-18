/** @vitest-environment jsdom */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import {
  AccessibilityProvider,
  ANNOUNCE_VISIBLE_MS,
  useAccessibility,
} from './AccessibilityContext';
import { savePrefs, DEFAULT_PREFS } from '@/lib/accessibility';

const LessonPage: React.FC = () => {
  const { announce } = useAccessibility();
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => announce('Nice work — you finished a step!')}>
        announce
      </button>
      <button type="button" onClick={() => navigate('/teacher')}>
        go-teacher
      </button>
    </div>
  );
};

describe('AccessibilityProvider announce captions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    savePrefs({ ...DEFAULT_PREFS, soundAsText: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    savePrefs(DEFAULT_PREFS);
  });

  const mountApp = () =>
    render(
      <MemoryRouter initialEntries={['/lesson']}>
        <AccessibilityProvider>
          <Routes>
            <Route path="/lesson" element={<LessonPage />} />
            <Route path="/teacher" element={<p>Teacher dashboard</p>} />
          </Routes>
        </AccessibilityProvider>
      </MemoryRouter>
    );

  it('auto-clears after 3 seconds so it cannot cover Back', async () => {
    mountApp();
    expect(ANNOUNCE_VISIBLE_MS).toBe(3000);

    await act(async () => {
      screen.getByRole('button', { name: 'announce' }).click();
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByTestId('a11y-announce').textContent).toContain('Nice work');

    await act(async () => {
      vi.advanceTimersByTime(ANNOUNCE_VISIBLE_MS + 20);
    });
    expect(screen.getByTestId('a11y-announce').textContent).toBe('');
  });

  it('clears when navigating away', async () => {
    mountApp();

    await act(async () => {
      screen.getByRole('button', { name: 'announce' }).click();
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByTestId('a11y-announce').textContent).toContain('Nice work');

    await act(async () => {
      screen.getByRole('button', { name: 'go-teacher' }).click();
    });
    expect(screen.getByText('Teacher dashboard')).toBeTruthy();
    expect(screen.getByTestId('a11y-announce').textContent).toBe('');
  });
});
