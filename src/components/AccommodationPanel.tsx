import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  accommodationsForStudent,
  saveStudentAccommodations,
  toggleStudentFeature,
  toggleStudentNeed,
  type StudentAccommodationRecord,
} from '@/lib/accommodations/studentAccommodations';
import {
  ACCOMMODATION_FEATURES,
  ACCOMMODATION_MATRIX,
  ACCOMMODATION_NEEDS,
  isFeatureEnabled,
  type AccommodationFeatureId,
  type AccommodationNeed,
} from '@/lib/accommodations/matrix';

export interface AccommodationStudentOption {
  key: string;
  nickname: string;
  accommodations?: unknown;
}

interface AccommodationPanelProps {
  classCode: string;
  students: AccommodationStudentOption[];
  /** Fired after a successful per-student save (sample roster badges). */
  onSaved?: (studentKey: string, record: StudentAccommodationRecord) => void;
}

const FEATURE_ORDER: AccommodationFeatureId[] = [
  'summaryFirst',
  'workedExampleFirst',
  'soundAsText',
  'colorSafeLabels',
  'calmBackground',
  'reduceMotion',
  'muteSounds',
  'focusMode',
  'dyslexiaFont',
  'easyReadSpacing',
  'textSizeLarge',
  'biggerButtons',
  'breaks',
  'relaxedPacing',
  'autoReadAloud',
  'slowSpeech',
  'highContrast',
];

interface EditorProps {
  classCode: string;
  studentKey: string;
  nickname: string;
  initial: StudentAccommodationRecord;
  onSaved?: (studentKey: string, record: StudentAccommodationRecord) => void;
}

const StudentAccommodationEditor: React.FC<EditorProps> = ({
  classCode,
  studentKey,
  nickname,
  initial,
  onSaved,
}) => {
  const { t } = useTranslation('teacher');
  const { announce } = useAccessibility();
  const [record, setRecord] = useState(initial);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const saveSeq = useRef(0);
  const recordRef = useRef(record);

  const commit = (next: StudentAccommodationRecord) => {
    const previous = recordRef.current;
    const seq = ++saveSeq.current;
    recordRef.current = next;
    setRecord(next);
    setError('');
    void saveStudentAccommodations(classCode, studentKey, next)
      .then(() => {
        if (saveSeq.current !== seq) return;
        setNote(t('acc_saved', { name: nickname }));
        onSaved?.(studentKey, next);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (saveSeq.current !== seq) return;
        recordRef.current = previous;
        setRecord(previous);
        setNote('');
        setError(t('acc_save_fail', { name: nickname }));
      });
  };

  const applyNeed = (need: AccommodationNeed) => {
    const { record: next, turnedOn } = toggleStudentNeed(recordRef.current, need);
    const label = t(ACCOMMODATION_MATRIX[need].labelKey);
    setNote(turnedOn ? t('acc_applied', { need: label }) : t('acc_unlocked'));
    announce(turnedOn ? t('acc_applied', { need: label }) : t('acc_unlocked'));
    commit(next);
  };

  const onToggleFeature = (featureId: AccommodationFeatureId, enabled: boolean) => {
    const next = toggleStudentFeature(recordRef.current, featureId, enabled);
    announce(
      `${t(ACCOMMODATION_FEATURES[featureId].labelKey)} ${enabled ? t('acc_on') : t('acc_off')}`
    );
    commit(next);
  };

  const activeExplain =
    record.needs.length === 0
      ? t('acc_pick_help')
      : record.needs.map((need) => t(ACCOMMODATION_MATRIX[need].explainKey)).join(' ');

  return (
    <div className="space-y-4" data-testid="acc-student-editor">
      <h3 className="font-medium text-foreground">{t('acc_for_student', { name: nickname })}</h3>
      <div className="flex flex-wrap gap-2">
        {ACCOMMODATION_NEEDS.map((need) => {
          const selected = record.needs.includes(need);
          const label = t(ACCOMMODATION_MATRIX[need].labelKey);
          return (
            <div key={need} className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className="min-h-10"
                data-testid={`acc-need-${need}`}
                aria-pressed={selected}
                onClick={() => applyNeed(need)}
              >
                {label}
              </Button>
              {selected ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-10"
                  onClick={() => applyNeed(need)}
                  aria-label={t('acc_remove_need', { need: label })}
                >
                  {t('acc_off')}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground" data-testid="acc-explain">
        {activeExplain}
      </p>

      <div className="space-y-2">
        <h3 className="font-medium text-foreground">{t('acc_features')}</h3>
        <ul className="m-0 list-none space-y-2 p-0">
          {FEATURE_ORDER.map((featureId) => {
            const meta = ACCOMMODATION_FEATURES[featureId];
            const enabled = isFeatureEnabled(record.prefs, featureId);
            return (
              <li
                key={featureId}
                className="flex min-h-[48px] items-start justify-between gap-3 rounded-xl border border-border bg-background/50 p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{t(meta.labelKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(meta.describeKey)}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => onToggleFeature(featureId, checked)}
                  aria-label={t(meta.labelKey)}
                  data-testid={`acc-feature-${featureId}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {note ? (
        <p className="text-sm text-foreground" role="status">
          {note}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

const AccommodationPanel: React.FC<AccommodationPanelProps> = ({ classCode, students, onSaved }) => {
  const { t } = useTranslation('teacher');
  const [preferredKey, setPreferredKey] = useState('');
  const selectedKey = students.some((student) => student.key === preferredKey)
    ? preferredKey
    : (students[0]?.key ?? '');
  const selected = students.find((student) => student.key === selectedKey) ?? null;

  return (
    <section
      className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
      data-testid="accommodation-panel"
      aria-labelledby="acc-panel-heading"
    >
      <div>
        <h2 id="acc-panel-heading" className="text-xl font-semibold">
          {t('acc_title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('acc_lead')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('acc_no_lock')}</p>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="acc-no-students">
          {t('acc_no_students')}
        </p>
      ) : (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('acc_student')}</span>
            <select
              value={selectedKey}
              onChange={(event) => setPreferredKey(event.target.value)}
              className="min-h-[48px] w-full max-w-md rounded-xl border border-border bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('acc_student')}
              data-testid="acc-student-select"
            >
              {students.map((student) => (
                <option key={student.key} value={student.key}>
                  {student.nickname}
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <StudentAccommodationEditor
              key={selected.key}
              classCode={classCode}
              studentKey={selected.key}
              nickname={selected.nickname}
              initial={accommodationsForStudent(classCode, selected.key, selected.accommodations)}
              onSaved={onSaved}
            />
          ) : null}
        </>
      )}
    </section>
  );
};

export default AccommodationPanel;
