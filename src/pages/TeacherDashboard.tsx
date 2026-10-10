import { tx } from '@/i18n/tx';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import AuthNavButton from '@/components/AuthNavButton';
import {
  Classroom,
  deleteStudent,
  setClassDefaultStart,
  setClassUsePlacementCheck,
  subscribeToClass,
} from '@/lib/classroom';
import { clearActiveTeacher, getActiveTeacher, setActiveTeacher } from '@/lib/session';
import { getPlanetLevel, PLANET_LEVEL_LIST } from '@/lib/planetLevels';
import {
  getClassroomUnlockPlanet,
  getLessonForPlanet,
  getTeacherVisiblePlanet,
  PLANET_META,
  type PlanetId,
} from '@/lib/planets';
import { Button } from '@/components/ui/button';
import ClassBriefing from '@/components/ClassBriefing';
import ClassTrends from '@/components/ClassTrends';
import FamilyNote from '@/components/FamilyNote';
import { misconceptionLabel, teacherLineFor } from '@/lib/cognition';
import { SAMPLE_CLASS_CODE, SAMPLE_STUDENTS } from '@/lib/cognition/demoClass';
import { PATHS } from '@/content/catalog';
import PilotOverview from '@/components/PilotOverview';
import { isDemoMode } from '@/lib/demo/mode';

const TeacherDashboard: React.FC = () => {
  const params = useParams();
  const classCode = params['*'] || (params as { classCode?: string }).classCode || '';
  const navigate = useNavigate();
  const [cls, setCls] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [defaultPlanet, setDefaultPlanet] = useState('sun');
  const [savingDefault, setSavingDefault] = useState(false);
  const [defaultSaved, setDefaultSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [pendingRemove, setPendingRemove] = useState<{ key: string; nickname: string } | null>(
    null
  );
  const [usePlacement, setUsePlacement] = useState(false);
  const [defaultPath, setDefaultPath] = useState('foundations');
  const [savingPlacement, setSavingPlacement] = useState(false);

  const sample = classCode.toUpperCase() === SAMPLE_CLASS_CODE;

  useEffect(() => {
    if (!classCode || sample) {
      setLoading(false);
      return;
    }

    const existing = getActiveTeacher();
    setActiveTeacher({
      classCode,
      teacherCode: existing?.classCode === classCode ? existing.teacherCode : existing?.teacherCode,
    });

    const unsubscribe = subscribeToClass(
      classCode,
      (data) => {
        setCls(data);
        setLoading(false);
        if (!data) {
          setLoadError('This class was not found. Check the class code or create a new class.');
          return;
        }
        setLoadError('');
        const unlock = getClassroomUnlockPlanet(data);
        if (unlock) {
          setDefaultPlanet(unlock);
        }
        setUsePlacement(!!data.usePlacementCheck);
        setDefaultPath(data.defaultStart?.pathId || 'foundations');
      },
      () => {
        setLoading(false);
        setLoadError('Could not connect to the class. Check your internet connection.');
      }
    );

    return () => unsubscribe();
  }, [classCode, sample]);

  if (!classCode) {
    return (
      <div className="min-h-screen bg-background subtle-stars flex items-center justify-center p-8">
        <p className="text-xl text-foreground">{tx('ui:s_03e7ac66cf')}</p>
      </div>
    );
  }

  const derivedLesson = getLessonForPlanet(defaultPlanet);
  const teacherPin = cls?.teacherCode || getActiveTeacher()?.teacherCode;
  const classUnlock = getClassroomUnlockPlanet(cls) ?? defaultPlanet;

  const handleBack = () => {
    navigate('/');
  };

  const handleSignOut = () => {
    clearActiveTeacher();
    navigate('/', { replace: true });
  };

  const handleDefaultChange = async (planet: string) => {
    setDefaultPlanet(planet);
    setDefaultSaved(false);
    setSaveError('');
    setSavingDefault(true);
    try {
      await setClassDefaultStart(classCode, planet, defaultPath);
      setDefaultSaved(true);
    } catch (err) {
      console.error(err);
      setSaveError('Could not save unlock setting. Try again.');
    } finally {
      setSavingDefault(false);
    }
  };

  const handlePlacementToggle = async (enabled: boolean) => {
    setUsePlacement(enabled);
    if (sample) return;
    setSavingPlacement(true);
    setSaveError('');
    try {
      await setClassUsePlacementCheck(classCode, enabled);
    } catch (err) {
      console.error(err);
      setUsePlacement(!enabled);
      setSaveError(tx('ui:planetLevel_placementSaveFail'));
    } finally {
      setSavingPlacement(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!pendingRemove || removingKey) return;
    const { key: studentKey, nickname } = pendingRemove;
    setRemovingKey(studentKey);
    setRemoveError('');
    try {
      const removed = await deleteStudent(classCode, studentKey);
      if (!removed) {
        setRemoveError(tx('ui:removeFailed', { name: nickname }));
        return;
      }
      setPendingRemove(null);
    } catch (err) {
      console.error(err);
      setRemoveError(`Could not remove ${nickname}. Try again.`);
    } finally {
      setRemovingKey(null);
    }
  };

  const students = sample
    ? SAMPLE_STUDENTS.map((student) => [student.nickname, student] as const)
    : cls?.students
      ? Object.entries(cls.students)
      : [];
  const roster = students.map(([, s]) => s);
  const earlyWarnings = students
    .map(([, s]) => ({ name: s.nickname, warning: s.lastDiagnosis?.earlyWarning }))
    .filter((row) => row.warning);

  return (
    <div className="min-h-screen bg-background subtle-stars p-4 sm:p-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              {sample ? 'Sample class' : `Class ${classCode}`}
            </h1>
            {sample && (
              <p className="mt-2 text-sm font-medium text-amber-200">{tx('ui:s_90999c1939')}</p>
            )}
            <p className="text-muted-foreground mt-1">{tx('ui:s_d179dda4c4')}</p>
            <p className="text-sm text-muted-foreground mt-1 print:hidden">
              <button
                type="button"
                onClick={() => navigate('/how-it-works')}
                className="underline underline-offset-2 hover:text-foreground"
              >{tx('ui:s_1dd6a17cb4')}</button>
              {' · '}
              <button
                type="button"
                onClick={() => navigate('/methods')}
                className="underline underline-offset-2 hover:text-foreground"
              >{tx('ui:s_7e4ac6803c')}</button>
              {' · '}
              <a
                href="#planet-levels"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {tx('ui:planetLevel_whatLink')}
              </a>
            </p>
            {teacherPin && !sample && (
              <p className="text-sm text-sky-300 mt-1">{tx('ui:s_d3f6dc1626')}<span className="font-semibold tracking-widest">{teacherPin}</span>
                {' '}(keep private)
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/teacher/${classCode}/curriculum`)}
              className="min-h-[48px]"
              data-testid="open-curriculum"
            >{tx('paths:currTitle')}</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/teacher/${classCode}/print`)}
              className="min-h-[48px]"
            >{tx('ui:s_e39c15d303')}</Button>
            <AuthNavButton onClick={handleBack} />
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 border-border bg-card text-foreground hover:bg-muted shadow-sm min-h-[48px]"
            >
              <LogOut className="h-5 w-5 shrink-0 text-foreground" strokeWidth={2.25} aria-hidden />
              <span>{tx('ui:s_61fd08ff5c')}</span>
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
            {loadError}
          </div>
        )}

        <section
          id="planet-levels"
          className="mb-8 bg-card/95 p-6 rounded-2xl border border-border print:hidden scroll-mt-6"
        >
          <h2 className="text-xl font-semibold mb-2">{tx('ui:s_8d52e3c61c')}</h2>
          <p className="text-sm text-muted-foreground mb-3">{tx('ui:planetLevel_lead')}</p>
          <p className="text-sm text-muted-foreground mb-4">{tx('ui:planetLevel_how')}</p>
          <div className="flex flex-wrap gap-4 items-center mb-5">
            <select
              value={defaultPlanet}
              onChange={(e) => handleDefaultChange(e.target.value)}
              disabled={savingDefault || !!loadError || sample}
              className="border border-border rounded-xl px-3 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px] max-w-full"
              aria-label={tx('ui:s_8d52e3c61c')}
            >
              {PLANET_LEVEL_LIST.map((info) => (
                <option key={info.id} value={info.id}>
                  {tx(`ui:${info.labelKey}`)}
                </option>
              ))}
            </select>
            <label className="text-sm">
              <span className="mb-1 block">{tx('paths:defaultPath')}</span>
              <select
                value={defaultPath}
                disabled={savingDefault || !!loadError || sample}
                onChange={(e) => {
                  const pathId = e.target.value;
                  setDefaultPath(pathId);
                  setDefaultSaved(false);
                  setSaveError('');
                  setSavingDefault(true);
                  void setClassDefaultStart(classCode, defaultPlanet, pathId)
                    .then(() => setDefaultSaved(true))
                    .catch((err) => {
                      console.error(err);
                      setSaveError('Could not save unlock setting. Try again.');
                    })
                    .finally(() => setSavingDefault(false));
                }}
                className="border border-border rounded-xl px-3 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[48px]"
                aria-label={tx('paths:defaultPath')}
              >
                {PATHS.map((path) => (
                  <option key={path.id} value={path.id}>{tx(path.titleKey)}</option>
                ))}
              </select>
            </label>
            <span className="text-sm font-medium text-sky-300 px-2">
              {tx('ui:planetLevel_lesson', { topic: tx(`ui:topic_${derivedLesson}`) })}
            </span>
            {savingDefault && <span className="text-sm text-muted-foreground">{tx('ui:s_56a2285c5b')}</span>}
            {defaultSaved && !savingDefault && (
              <span className="text-sm text-emerald-400 font-medium">{tx('ui:s_c0ae8f6ea8')}</span>
            )}
            {saveError && <span className="text-sm text-destructive">{saveError}</span>}
          </div>

          <label className="flex items-start gap-3 mb-5 min-h-[48px] cursor-pointer">
            <input
              type="checkbox"
              className="mt-1.5 h-4 w-4"
              checked={usePlacement}
              disabled={savingPlacement || !!loadError || sample}
              onChange={(e) => void handlePlacementToggle(e.target.checked)}
            />
            <span>
              <span className="font-medium text-foreground block">
                {tx('ui:planetLevel_usePlacement')}
              </span>
              <span className="text-sm text-muted-foreground">
                {tx('ui:planetLevel_usePlacementHelp')}
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-border bg-background/40 p-4 mb-4">
            <h3 className="font-semibold text-foreground mb-2">{tx('ui:planetLevel_whatTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-3">{tx('ui:planetLevel_whatBody')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="font-semibold text-foreground mb-1">{tx('ui:planetLevel_band_count')}</p>
                <p className="text-muted-foreground">{tx('ui:planetLevel_band_count_help')}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="font-semibold text-foreground mb-1">{tx('ui:planetLevel_band_add')}</p>
                <p className="text-muted-foreground">{tx('ui:planetLevel_band_add_help')}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/50 p-3">
                <p className="font-semibold text-foreground mb-1">{tx('ui:planetLevel_band_sub')}</p>
                <p className="text-muted-foreground">{tx('ui:planetLevel_band_sub_help')}</p>
              </div>
            </div>
          </div>

          <details className="rounded-xl border border-border bg-background/40 p-3" open>
            <summary className="cursor-pointer font-medium text-foreground">
              {tx('ui:planetLevel_legendTitle')}
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {PLANET_LEVEL_LIST.map((info) => (
                <li key={info.id}>
                  <span className="font-medium text-foreground">{tx(`ui:planet_${info.id}`)}</span>
                  {' · '}
                  {tx(`ui:topic_${info.topic}`)}
                  {' · '}
                  {tx(`ui:${info.rangeKey}`)}
                  {' — '}
                  {tx(`ui:${info.skillKey}`)}
                </li>
              ))}
            </ul>
          </details>
        </section>

        {!sample && <PilotOverview classCode={classCode} classroom={cls} />}
        {isDemoMode() && !sample && (
          <p className="mb-6 text-sm text-muted-foreground">{tx('paths:demoPin')}</p>
        )}

        <ClassTrends students={roster} sample={sample} />
        {students.length > 0 && (
          <>
            <ClassBriefing students={roster} />
            {earlyWarnings.length > 0 && (
              <section className="mb-8 rounded-2xl border border-border bg-card/95 p-6 print:break-inside-avoid">
                <h2 className="text-xl font-semibold mb-3">{tx('ui:s_970e3adc92')}</h2>
                <div className="space-y-2">
                  {earlyWarnings.map((row) => (
                    <p key={row.name} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{row.name}:</span> {row.warning}
                    </p>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section className="bg-card/95 p-6 rounded-2xl border border-border">
          <h2 className="text-xl font-semibold mb-4">{tx('ui:s_e55198aca4')}</h2>
          {removeError && <p className="mb-3 text-sm text-destructive">{removeError}</p>}
          {loading ? (
            <div className="p-4 text-muted-foreground rounded-xl text-center border border-dashed border-border">{tx('ui:s_522ba51bcc')}</div>
          ) : students.length === 0 ? (
            <div className="p-4 text-muted-foreground rounded-xl text-center border border-dashed border-border">
              {tx('ui:s_emptyroster', { code: classCode })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(([key, s]) => {
                const currentPlanet = getTeacherVisiblePlanet(s, classUnlock);
                const lesson = getLessonForPlanet(currentPlanet);
                return (
                  <div
                    key={key}
                    className="p-4 rounded-xl border border-border bg-background/60"
                  >
                    <div className="text-lg font-semibold text-foreground">{s.nickname}</div>
                    <div className="text-sm font-medium text-sky-300 mt-1">
                      {tx(`ui:${getPlanetLevel(currentPlanet).labelKey}`)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tx('ui:planetLevel_rosterLine', {
                        planet: tx(`ui:planet_${currentPlanet}`),
                        topic: tx(`ui:topic_${lesson}`),
                      })}
                      {' · '}
                      {tx(`ui:${getPlanetLevel(currentPlanet).rangeKey}`)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tx('ui:planetLevel_rosterHint')}
                    </p>
                    {s.lastDiagnosis && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {misconceptionLabel(s.lastDiagnosis.primary)}
                        </p>
                        <p className="mt-1 text-xs">{teacherLineFor(s.lastDiagnosis.primary)}</p>
                      </div>
                    )}
                    {s.lastQuiz && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Last quiz ({PLANET_META[s.lastQuiz.planet as PlanetId]?.name ?? s.lastQuiz.planet}):{' '}
                        {s.lastQuiz.score}/{s.lastQuiz.total}
                        {s.lastQuiz.tries.some((t) => t > 1) && (
                          <p className="mt-1">
                            Extra tries:{' '}
                            {s.lastQuiz.tries
                              .map((t, i) => (t > 1 ? `Q${i + 1} (${t})` : null))
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                    {pendingRemove?.key === key ? (
                      <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          Remove {s.nickname}? Progress and quiz history will be deleted.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={removingKey === key}
                            onClick={handleRemoveStudent}
                            className="flex-1 min-h-[44px]"
                          >
                            {removingKey === key ? 'Removing…' : 'Yes, remove'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!!removingKey}
                            onClick={() => {
                              setPendingRemove(null);
                              setRemoveError('');
                            }}
                            className="flex-1 min-h-[44px]"
                          >{tx('ui:s_77dfd2135f')}</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!!removingKey}
                        onClick={() => {
                          setRemoveError('');
                          setPendingRemove({ key, nickname: s.nickname });
                        }}
                        className="mt-3 w-full border-destructive/40 text-destructive hover:bg-destructive/10 min-h-[44px]"
                      >{tx('ui:s_4fb18541ef')}</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {students.length > 0 && <FamilyNote classCode={classCode} />}
      </div>
    </div>
  );
};

export default TeacherDashboard;
