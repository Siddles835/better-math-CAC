// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/setup';
import { DEFAULT_PREFS } from '@/lib/accessibility';
import ArrayGrid from './ArrayGrid';
import ManipulativeBoard from './ManipulativeBoard';

vi.mock('@/context/AccessibilityContext', () => ({
  useAccessibility: () => ({
    prefs: { ...DEFAULT_PREFS, reduceMotion: true, muteSounds: true },
    setPref: () => undefined,
    patchPrefs: () => undefined,
    resetPrefs: () => undefined,
    announce: () => undefined,
  }),
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/objects/ActiveObjectGlyph', () => ({
  default: ({ index }: { index?: number }) => (
    <span data-testid={`glyph-${index ?? 0}`} aria-hidden />
  ),
}));

const wrap = (node: React.ReactNode) =>
  render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);

describe('manipulatives', () => {
  it('keeps displayed value equal to counter count', () => {
    wrap(<ManipulativeBoard />);
    const value = screen.getByTestId('manipulative-board-value');
    expect(value.textContent).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(value.textContent).toBe('2');
    expect(screen.getByTestId('manipulative-board-tokens').querySelectorAll('[role="listitem"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(value.textContent).toBe('1');
    expect(screen.getByTestId('manipulative-board-tokens').querySelectorAll('[role="listitem"]')).toHaveLength(1);

    fireEvent.click(screen.getByTestId('manipulative-board-undo'));
    expect(value.textContent).toBe('2');
  });

  it('updates array product when rows or cols change', () => {
    wrap(<ArrayGrid initialRows={2} initialCols={3} />);
    const product = screen.getByTestId('array-grid-product');
    expect(product.textContent).toContain('2');
    expect(product.textContent).toContain('3');
    expect(product.textContent).toContain('6');
    expect(screen.getByTestId('array-grid-cells').querySelectorAll('[role="gridcell"]')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: /add row/i }));
    expect(screen.getByTestId('array-grid-cells').querySelectorAll('[role="gridcell"]')).toHaveLength(9);
    expect(screen.getByTestId('array-grid-product').textContent).toContain('9');
  });
});
