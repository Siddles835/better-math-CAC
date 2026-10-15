// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LessonDrill from './LessonDrill';

vi.mock('@/components/PathActivity', () => ({
  default: () => <div>drill</div>,
}));

vi.mock('@/components/TeachStory', () => {
  const MockTeachStory = ({ onReady }: { onReady: (ready: boolean) => void }) => {
    useEffect(() => {
      onReady(false);
    }, [onReady]);
    return (
      <button type="button" onClick={() => onReady(true)}>
        reveal
      </button>
    );
  };
  return { default: MockTeachStory };
});

vi.mock('@/lib/lessonDuration', async () => {
  const actual = await vi.importActual<typeof import('@/lib/lessonDuration')>('@/lib/lessonDuration');
  return {
    ...actual,
    drillItem: () => ({
      id: 'x',
      kind: 'count_on',
      prompt: '',
      speak: '',
      start: 1,
      add: 1,
      target: 2,
    }),
  };
});

describe('LessonDrill teach steps', () => {
  it('does not mark teach ready on the first render', async () => {
    const onReady = vi.fn();
    render(<LessonDrill planet="mercury" index={0} onReady={onReady} />);
    await act(async () => {});
    expect(onReady.mock.calls.some((call) => call[0] === true)).toBe(false);
    await act(async () => {
      document.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onReady).toHaveBeenCalledWith(true);
  });
});
