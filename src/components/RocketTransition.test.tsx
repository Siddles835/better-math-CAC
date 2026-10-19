// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import React from 'react';
import RocketTransition, { ROCKET_FLIGHT_MS } from './RocketTransition';
import { GameProvider, useGame } from '@/context/GameContext';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { DEFAULT_PREFS, savePrefs } from '@/lib/accessibility';

const Controls: React.FC = () => {
  const navigate = useNavigate();
  const { startRocketTransition, showRocketTransition } = useGame();
  return (
    <div>
      <button type="button" data-testid="launch" onClick={() => startRocketTransition()}>
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

  it('shows the rocket hop and clears when the short flight ends', () => {
    renderApp();
    act(() => {
      screen.getByTestId('launch').click();
    });
    expect(screen.getByTestId('rocket-transition')).toBeTruthy();
    expect(screen.getByTestId('rocket-transition').querySelector('svg')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(ROCKET_FLIGHT_MS - 1);
    });
    expect(screen.getByTestId('rocket-transition')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByTestId('rocket-transition')).toBeNull();
    expect(screen.getByTestId('rocket-flag').textContent).toBe('off');
  });

  it('restarts the clear timer when launched again while already showing', () => {
    renderApp();
    act(() => {
      screen.getByTestId('launch').click();
    });
    act(() => {
      vi.advanceTimersByTime(ROCKET_FLIGHT_MS - 200);
    });
    act(() => {
      screen.getByTestId('launch').click();
    });
    act(() => {
      vi.advanceTimersByTime(ROCKET_FLIGHT_MS - 1);
    });
    expect(screen.getByTestId('rocket-transition')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(screen.queryByTestId('rocket-transition')).toBeNull();
  });

  it('drops the overlay when navigating to settings mid-flight', () => {
    renderApp();
    act(() => {
      screen.getByTestId('launch').click();
    });
    expect(screen.getByTestId('rocket-transition')).toBeTruthy();

    act(() => {
      screen.getByTestId('go-settings').click();
    });
    expect(screen.queryByTestId('rocket-transition')).toBeNull();
  });

  it('keeps the overlay while navigating into a lesson mid-flight', () => {
    renderApp();
    act(() => {
      screen.getByTestId('launch').click();
    });
    expect(screen.getByTestId('rocket-transition')).toBeTruthy();

    act(() => {
      screen.getByTestId('go-lesson').click();
    });
    expect(screen.getByTestId('rocket-transition')).toBeTruthy();
  });
});
