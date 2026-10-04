import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import NumberDraw, { type DrawResult } from '@/components/NumberDraw';
import ReflectionPrompt from '@/components/explore/ReflectionPrompt';
import {
  appendExploreSignal,
  saveExploreCollectionItem,
  type ExploreActivityId,
} from '@/lib/explore';
import { useAccessibility } from '@/context/AccessibilityContext';
import type { DigitRead } from '@/lib/cognition';

export const useExploreSave = (activityId: ExploreActivityId) => {
  const { t } = useTranslation('explore');
  const { announce } = useAccessibility();

  const persist = (waysFound: number, label: string) => {
    appendExploreSignal({ activityId, waysFound, at: Date.now() });
    saveExploreCollectionItem({ activityId, waysFound, label });
    announce(t('collection_saved'));
  };

  return { persist, announce };
};

export const WaysFooter: React.FC<{
  waysFound: number;
  onAnother: () => void;
  onSave: () => void;
}> = ({ waysFound, onAnother, onSave }) => {
  const { t } = useTranslation('explore');
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium" aria-live="polite">
        {t('ways_found', { count: waysFound })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" onClick={onAnother}>
          {t('another_way')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onSave}>
          {t('save_collection')}
        </Button>
      </div>
      <ReflectionPrompt />
    </div>
  );
};

export const OptionalDraw: React.FC<{
  open: boolean;
  onToggle: () => void;
  onRead: (value: number) => void;
}> = ({ open, onToggle, onRead }) => {
  const { t } = useTranslation('explore');
  const [result, setResult] = React.useState<DrawResult>(null);
  const [enabled, setEnabled] = React.useState(true);

  if (!open) {
    return (
      <Button type="button" variant="outline" className="min-h-11" onClick={onToggle}>
        {t('draw_option')}
      </Button>
    );
  }

  return (
    <div className="space-y-2" dir="ltr">
      <NumberDraw
        prompt={t('draw_option')}
        result={result}
        checkEnabled={enabled}
        onChange={() => {
          setResult(null);
          setEnabled(true);
        }}
        onRead={(read: DigitRead) => {
          if (read.status !== 'ok') {
            setResult('unreadable');
            return;
          }
          setResult(null);
          setEnabled(false);
          onRead(read.digit);
        }}
        onTyped={(value) => {
          setResult(null);
          setEnabled(false);
          onRead(value);
        }}
      />
      <Button type="button" variant="ghost" className="min-h-11" onClick={onToggle}>
        {t('done_drawing')}
      </Button>
    </div>
  );
};
