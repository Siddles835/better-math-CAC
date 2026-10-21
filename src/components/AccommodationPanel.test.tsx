// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/setup';
import AccommodationPanel from './AccommodationPanel';

vi.mock('@/context/AccessibilityContext', () => ({
  useAccessibility: () => ({
    announce: () => undefined,
  }),
}));

const students = [
  { key: 'quietcomet21', nickname: 'QuietComet21' },
  { key: 'braveotter8', nickname: 'BraveOtter8' },
];

const renderPanel = (props: Partial<React.ComponentProps<typeof AccommodationPanel>> = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <AccommodationPanel classCode="SAMPLE" students={students} {...props} />
    </I18nextProvider>
  );

describe('AccommodationPanel per student', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps disability and feature toggles separate for each student', async () => {
    renderPanel();

    expect(screen.getByTestId('acc-student-select')).toHaveProperty('value', 'quietcomet21');
    fireEvent.click(screen.getByTestId('acc-need-dyscalculia'));
    expect(await screen.findByText('Saved for QuietComet21.')).toBeTruthy();
    expect(screen.getByTestId('acc-need-dyscalculia').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('acc-feature-summaryFirst').getAttribute('data-state')).toBe('checked');

    fireEvent.change(screen.getByTestId('acc-student-select'), {
      target: { value: 'braveotter8' },
    });
    expect(screen.getByText('Accommodations for BraveOtter8')).toBeTruthy();
    expect(screen.getByTestId('acc-need-dyscalculia').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('acc-feature-summaryFirst').getAttribute('data-state')).toBe('unchecked');

    fireEvent.change(screen.getByTestId('acc-student-select'), {
      target: { value: 'quietcomet21' },
    });
    expect(screen.getByTestId('acc-need-dyscalculia').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('acc-feature-summaryFirst').getAttribute('data-state')).toBe('checked');
  });

  it('hides toggles until a student has joined', () => {
    renderPanel({ students: [] });
    expect(screen.getByTestId('acc-no-students')).toBeTruthy();
    expect(screen.queryByTestId('acc-student-select')).toBeNull();
    expect(screen.queryByTestId('acc-need-adhd')).toBeNull();
  });
});
