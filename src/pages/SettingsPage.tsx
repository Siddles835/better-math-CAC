import { tx } from '@/i18n/tx';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguagePicker from '@/components/LanguagePicker';
import { useAccessibility } from '@/context/AccessibilityContext';
import { isAppLang } from '@/lib/cognition/readingTime';
import { numberStylesFor, type NumberStyle } from '@/lib/i18n/language';
import {
  clearActiveStudent,
  clearActiveTeacher,
  getActiveStudent,
  getActiveTeacher,
  getStudentDisplayName,
  reconcileExclusiveSession,
  SESSION_CHANGED,
  type ActiveStudent,
  type ActiveTeacher,
} from '@/lib/session';
import { deleteClassroom, deleteStudent } from '@/lib/classroom';
import { clearSoloProgress, isSoloClassCode } from '@/lib/solo';
import { Button } from '@/components/ui/button';
import AccessibilityPanel from '@/components/AccessibilityPanel';
import VoiceToggle from '@/components/VoiceToggle';
import VoiceSettings from '@/components/VoiceSettings';

const SUPPORT_EMAIL = 'mathlift1234@gmail.com';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { prefs, setPref } = useAccessibility();
  const navigate = useNavigate();
  const lang = isAppLang(i18n.language) ? i18n.language : 'en';
  const styles = numberStylesFor(lang);
  const [student, setStudent] = useState<ActiveStudent | null>(null);
  const [teacher, setTeacher] = useState<ActiveTeacher | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<'student' | 'class' | null>(null);

  const refresh = () => {
    reconcileExclusiveSession();
    setStudent(getActiveStudent());
    setTeacher(getActiveTeacher());
  };

  useEffect(() => {
    refresh();
    window.addEventListener(SESSION_CHANGED, refresh);
    return () => window.removeEventListener(SESSION_CHANGED, refresh);
  }, []);

  const handleStudentSignOut = () => {
    clearActiveStudent();
    refresh();
    navigate('/', { replace: true });
  };

  const handleTeacherSignOut = () => {
    clearActiveTeacher();
    refresh();
    navigate('/', { replace: true });
  };

  const handleDeleteStudent = async () => {
    if (!student || busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (isSoloClassCode(student.classCode) || student.solo) {
        clearSoloProgress();
      } else {
        await deleteStudent(student.classCode, student.nickname);
      }
      clearActiveStudent();
      setConfirmDelete(null);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setMessage(tx('ui:settings_deleteStudentFail'));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!teacher || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await deleteClassroom(teacher.classCode);
      clearActiveTeacher();
      setConfirmDelete(null);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setMessage('Could not delete this class. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background subtle-stars text-foreground pb-[max(2rem,env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-lg px-6 py-10 animate-fade-in">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          {t('settings:backHome')}
        </Link>
        <h1 className="text-3xl font-semibold mb-2 mt-6">{t('settings:title')}</h1>
        <p className="text-muted-foreground mb-8">{t('settings:intro')}</p>

        <VoiceToggle className="mb-6" />

        <section className="mb-6 rounded-2xl border border-border bg-card/90 p-5">
          <h2 className="text-lg font-semibold mb-1">{t('settings:voicePickerTitle')}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t('settings:voicePickerIntro')}</p>
          <VoiceSettings />
        </section>

        <section className="mb-6 rounded-2xl border border-border bg-card/90 p-5">
          <h2 className="text-lg font-semibold mb-2">{t('common:language')}</h2>
          <p className="text-sm text-muted-foreground mb-3">{t('settings:languageHelp')}</p>
          <LanguagePicker />
          {styles.length > 1 && (
            <div className="mt-5">
              <h3 className="text-base font-semibold mb-2">{t('common:numberStyle')}</h3>
              <p className="text-sm text-muted-foreground mb-3">{t('settings:numberHelp')}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('common:numberStyle')}>
                {styles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={prefs.numberStyle === style}
                    onClick={() => setPref('numberStyle', style as NumberStyle)}
                    className={`min-h-11 px-3 py-2 rounded-xl text-sm font-semibold border ${
                      prefs.numberStyle === style
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border'
                    }`}
                  >
                    {t(
                      style === 'eastern'
                        ? 'common:numberEastern'
                        : style === 'devanagari'
                          ? 'common:numberDevanagari'
                          : 'common:numberWestern'
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="text-xl font-semibold mb-1">{tx('ui:s_d8f9cb9790')}</h2>
          <p className="text-sm text-muted-foreground mb-4">{tx('ui:s_a37b07078c')}</p>
          <AccessibilityPanel />
        </section>

        {student && (
          <section className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-200/80">{tx('ui:s_f7b63f030b')}</p>
            <p className="text-lg font-semibold mt-1">
              {getStudentDisplayName(student)}
              <span className="text-muted-foreground font-normal">
                {' · '}
                {isSoloClassCode(student.classCode) || student.solo
                  ? tx('ui:solo_badge')
                  : student.classCode}
              </span>
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button type="button" variant="outline" onClick={handleStudentSignOut}>{tx('ui:s_61fd08ff5c')}</Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete('student')}
              >
                {isSoloClassCode(student.classCode) || student.solo
                  ? tx('ui:solo_deleteProgress')
                  : tx('ui:s_26cc101ce0')}
              </Button>
            </div>
          </section>
        )}

        {teacher && (
          <section className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5">
            <p className="text-sm text-sky-200/80">{tx('ui:s_fc25735286')}</p>
            <p className="text-lg font-semibold mt-1">Class {teacher.classCode}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/teacher/${teacher.classCode}`)}
              >{tx('ui:s_b9e922ebbb')}</Button>
              <Button type="button" variant="outline" onClick={handleTeacherSignOut}>{tx('ui:s_61fd08ff5c')}</Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDelete('class')}
              >{tx('ui:s_b38135a837')}</Button>
            </div>
          </section>
        )}

        {!student && !teacher && (
          <section className="mb-6 rounded-2xl border border-border bg-card/90 p-5">
            <p className="text-muted-foreground mb-3">{tx('ui:s_252bb976b9')}</p>
            <Button type="button" onClick={() => navigate('/')}>{tx('ui:s_19445d7286')}</Button>
          </section>
        )}

        {confirmDelete === 'student' && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
            <p className="font-semibold mb-2">{tx('ui:s_790ba564c1')}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {student && (isSoloClassCode(student.classCode) || student.solo)
                ? tx('ui:solo_deleteConfirm')
                : tx('ui:s_12be218899')}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" disabled={busy} onClick={handleDeleteStudent}>
                {busy
                  ? tx('ui:solo_deleting')
                  : student && (isSoloClassCode(student.classCode) || student.solo)
                    ? tx('ui:solo_deleteProgressYes')
                    : tx('ui:solo_deleteAccountYes')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>{tx('ui:s_77dfd2135f')}</Button>
            </div>
          </div>
        )}

        {confirmDelete === 'class' && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
            <p className="font-semibold mb-2">{tx('ui:s_6564ef1713')}</p>
            <p className="text-sm text-muted-foreground mb-4">{tx('ui:s_923432333f')}</p>
            <div className="flex gap-2">
              <Button type="button" variant="destructive" disabled={busy} onClick={handleDeleteClass}>
                {busy ? 'Deleting…' : 'Yes, delete this class'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>{tx('ui:s_77dfd2135f')}</Button>
            </div>
          </div>
        )}

        {message && (
          <p className="mb-6 text-sm text-destructive">{message}</p>
        )}

        <section className="mb-6 rounded-2xl border border-border bg-card/90 p-5 space-y-3">
          <h2 className="text-xl font-semibold">Privacy &amp; data</h2>
          <p className="text-sm text-muted-foreground">{tx('ui:s_cc52584fd6')}</p>
          <div className="flex flex-col gap-2">
            <Link to="/privacy-policy" className="text-primary font-medium hover:underline min-h-[44px] flex items-center">{tx('ui:s_9db108ba6b')}</Link>
            <Link to="/cookie-policy" className="text-primary font-medium hover:underline min-h-[44px] flex items-center">{tx('ui:s_e6e178ccc8')}</Link>
            <Link to="/support" className="text-primary font-medium hover:underline min-h-[44px] flex items-center">{tx('ui:s_f32d5a3b17')}</Link>
            {!teacher && (
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=MathLift%20data%20deletion%20request`}
                className="text-primary font-medium hover:underline min-h-[44px] flex items-center"
              >
                Email a deletion request ({SUPPORT_EMAIL})
              </a>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SettingsPage;
