// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import React from 'react';
import RocketTransition from './RocketTransition';
import { GameProvider, useGame } from '@/context/GameContext';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { DEFAULT_PREFS, savePrefs } from '@/lib/accessibility';

const ROCKET_FLIGHT_MS = 5500;

const Controls: React.FC = () => {
  const navigate = useNavigate();
  const { setShowRocketTransition, showRocketTransition } = useGame();
  return (
    <div>
      <button type="button" data-testid="launch" onClick={() => setShowRocketTransition(true)}>
        launch
      </button>
      <button type="button" data-testid="go-settings" onClick={() => navigate('/settings')}>
        settings
      </button>
      <button type="button" data-testid="go-lesson" onClick={() => navigate('/lesson/counting/sun')}>
        lesson
      </button>
      <span data-testid="rocket-flag">{showRocketTransition ? 'on' : 'off'}</span>
    </div>
  );
};

const renderApp = (initialPath = '/planets') =>
  render(
    <GameProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AccessibilityProvider>
          <RocketTransition />
          <Controls />
          <Routes>
            <Route path="/planets" element={<div>hub</div>} />
            <Route path="/settings" element={<div>settings</div>} />
            <Route path="/lesson/counting/sun" element={<div>lesson</div>} />
          </Routes>
        </AccessibilityProvider>
      </MemoryRouter>
    </GameProvider>
  );

describe('RocketTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    savePrefs({ ...DEFAULT_PREFS, reduceMotion: false, calmBackground: false });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows the classic rocket SVG and clears after the full 5.5s fly', () => {
    renderApp();
    act(() => {
      screen.getByTestId('launch').click();
    });
    expect(document.querySelector('.animate-rocket-fly')).toBeTruthy();
    expect(document.querySelector('.animate-rocket-fly svg')).toBeTruthy();
    expect(screen.getByTestId('rocket-flag').textContent).toBe('on');

    act(() => {
      vi.advanceTimersByTime(ROCKET_FLIGHT_MS);
    });
    expect(document.querySelector('.animate-rocket-fly')).toBeNull();
    expect(screen.getByTestId('rocket-flag').textContent).toBe('off');
  });

  it('keeps the overlay while navigating into a lesson mid-flight', () => {
    renderApp();
    act(() => {
      screen.getByTestId('launch').click();
    });
    expect(document.querySelector('.animate-rocket-fly')).toBeTruthy();

    act(() => {
      screen.getByTestId('go-lesson').click();
    });
    expect(document.querySelector('.animate-rocket-fly')).toBeTruthy();
    expect(screen.getByTestId('rocket-flag').textContent).toBe('on');
  });

  it('does not clear early when navigating to settings mid-flight (self-clears at 5.5s)', () => {
    renderApp();
    act(() => {
      screen.getByTestId('launch').click();
    });
    expect(document.querySelector('.animate-rocket-fly')).toBeTruthy();

    act(() => {
      screen.getByTestId('go-settings').click();
    });
    expect(document.querySelector('.animate-rocket-fly')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(ROCKET_FLIGHT_MS);
    });
    expect(document.querySelector('.animate-rocket-fly')).toBeNull();
  });
});
