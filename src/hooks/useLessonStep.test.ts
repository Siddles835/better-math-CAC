// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLessonStep } from './useLessonStep';

let planetSteps: Record<string, number> = {};
let notify = () => {};
let deliverClass: (value: unknown) => void = () => {};

vi.mock('@/context/GameContext', () => ({
  useGame: () => ({
    planetSteps,
    getPlanetStep: (id: string) => planetSteps[id] ?? 0,
    savePlanetStep: async (planet: string, step: number) => {
      planetSteps = {
        ...planetSteps,
        [planet]: Math.max(planetSteps[planet] ?? 0, step),
      };
      notify();
    },
    markPlanetVisited: async () => {},
  }),
}));

vi.mock('@/lib/classroom', () => ({
  findStudentKey: () => 'ava',
  getClass: () =>
    new Promise((resolve) => {
      deliverClass = resolve as (value: unknown) => void;
    }),
}));

vi.mock('@/lib/session', () => ({
  getActiveStudent: () => ({ classCode: 'room', nickname: 'Ava' }),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({
    state: null,
    pathname: '/lesson/addition/earth',
    search: '',
    hash: '',
    key: 'test',
  }),
}));

function Wrapper({ children }: { children: ReactNode }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    notify = () => setTick((n) => n + 1);
  }, []);
  return children;
}

describe('useLessonStep backward navigation', () => {
  beforeEach(() => {
    planetSteps = {};
    notify = () => {};
    deliverClass = () => {};
  });

  it('stays on a lower step when planetSteps updates and a snapshot arrives', async () => {
    const { result } = renderHook(() => useLessonStep('earth'), { wrapper: Wrapper });
    await act(async () => {});

    await act(async () => {
      result.current[1](3);
    });
    expect(result.current[0]).toBe(3);

    await act(async () => {
      result.current[1](2);
    });
    expect(result.current[0]).toBe(2);

    await act(async () => {
      deliverClass({
        students: { ava: { planetSteps: { earth: 3 } } },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current[0]).toBe(2);
  });

  it('hydrates the saved step once, then keeps a later move backward', async () => {
    const { result, rerender } = renderHook(() => useLessonStep('earth'), { wrapper: Wrapper });
    await act(async () => {});
    expect(result.current[0]).toBe(0);

    planetSteps = { earth: 4 };
    rerender();
    await act(async () => {});
    expect(result.current[0]).toBe(4);

    await act(async () => {
      result.current[1](1);
    });
    expect(result.current[0]).toBe(1);

    planetSteps = { earth: 4, sun: 2 };
    await act(async () => {
      notify();
      deliverClass({
        students: { ava: { planetSteps: { earth: 4 } } },
      });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current[0]).toBe(1);
  });
});
