import { tx } from '@/i18n/tx';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Printer, ChevronDown } from 'lucide-react';
import AuthNavButton from '@/components/AuthNavButton';
import {
  Classroom,
  deleteStudent,
  setClassAllowStudentObjectPhotos,
  setClassDefaultStart,
  setClassUsePlacementCheck,
  subscribeToClass,
} from '@/lib/classroom';
import { clearActiveTeacher, getActiveTeacher, setActiveTeacher } from '@/lib/session';
import { getPlanetLevel, planetLevelsForPath } from '@/lib/planetLevels';
import {
  getClassroomUnlockPlanet,
  getLessonForPlanet,
  getTeacherVisiblePlanet,
  PLANET_META,
  setSolarPathHint,
  type PlanetId,
} from '@/lib/planets';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import ClassBriefing from '@/components/ClassBriefing';
import ClassTrends from '@/components/ClassTrends';
import FamilyNote from '@/components/FamilyNote';
import { misconceptionLabel, teacherLineFor } from '@/lib/cognition';
import { SAMPLE_CLASS_CODE, SAMPLE_STUDENTS } from '@/lib/cognition/demoClass';
import { isTopicStartPlanet } from '@/content/solarSystems';
import PilotOverview from '@/components/PilotOverview';
import { isDemoMode } from '@/lib/demo/mode';
import { cn } from '@/lib/utils';

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
  const [allowStudentPhotos, setAllowStudentPhotos] = useState(false);
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);

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
          setLoadError(tx('ui:dashClassMissing'));
          return;
        }
        setLoadError('');
        const unlock = getClassroomUnlockPlanet(data);
        if (unlock) {
          setDefaultPlanet(unlock);
        }
        setUsePlacement(!!data.usePlacementCheck);
        setAllowStudentPhotos(!!data.allowStudentObjectPhotos);
        setSolarPathHint('foundations');
      },
      () => {
        setLoading(false);
        setLoadError(tx('ui:dashConnectFail'));
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

  const derivedLesson = getLessonForPlanet(defaultPlanet, 'foundations');
  const planetOptions = planetLevelsForPath('foundations');
  const teacherPin = cls?.teacherCode || getActiveTeacher()?.teacherCode;
  const classUnlock = getClassroomUnlockPlanet(cls) ?? defaultPlanet;
  const pathwayBands = [
    ['planetLevel_band_count', 'planetLevel_band_count_help'],
    ['planetLevel_band_add', 'planetLevel_band_add_help'],
    ['planetLevel_band_sub', 'planetLevel_band_sub_help'],
  ] as const;

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
      await setClassDefaultStart(classCode, planet, 'foundations');
      setDefaultSaved(true);
    } catch (err) {
      console.error(err);
      setSaveError(tx('ui:dashSaveFail'));
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

  const handleStudentPhotosToggle = async (enabled: boolean) => {
    setAllowStudentPhotos(enabled);
    if (sample) return;
    setSavingPhotos(true);
    setSaveError('');
    try {
      await setClassAllowStudentObjectPhotos(classCode, enabled);
    } catch (err) {
      console.error(err);
      setAllowStudentPhotos(!enabled);
      setSaveError(tx('ui:dashSaveFail'));
    } finally {
      setSavingPhotos(false);
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
      setRemoveError(tx('ui:removeFailed', { name: nickname }));
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
    <div
      data-testid="teacher-dashboard"
      className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {tx('ui:dashWorkshop')}
            </p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              {sample ? tx('ui:dashSampleClass') : tx('ui:dashClassTitle', { code: classCode })}
            </h1>
            {teacherPin && !sample && (
              <p className="mt-1 text-sm text-muted-foreground">
                {tx('ui:s_d3f6dc1626')}{' '}
                <span className="font-semibold tracking-widest text-foreground">{teacherPin}</span>
                <span className="ms-1 text-xs">({tx('ui:dashPinPrivate')})</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              type="button"
              className="min-h-[48px] gap-2"
              onClick={() => navigate(`/teacher/${classCode}/curriculum`)}
              data-testid="open-curriculum"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              {tx('paths:currTitle')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px] gap-2"
              onClick={() => navigate(`/teacher/${classCode}/print`)}
            >
              <Printer className="h-4 w-4" aria-hidden />
              {tx('ui:s_e39c15d303')}
            </Button>
            <AuthNavButton onClick={handleBack} />
            <Button
              type="button"
              variant="outline"
              onClick={handleSignOut}
              className="min-h-[48px] gap-2"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {tx('ui:s_61fd08ff5c')}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 animate-fade-in">
        {sample && (
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
            {tx('ui:s_90999c1939')}
          </p>
        )}

        {loadError && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
            {loadError}
          </div>
        )}

        {/* Class setup — starting planet */}
        <section
          id="planet-levels"
          className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6 print:hidden"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold">{tx('ui:s_8d52e3c61c')}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{tx('ui:planetLevel_lead')}</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
              {tx('ui:planetLevel_lesson', { topic: tx(`ui:topic_${derivedLesson}`) })}
            </span>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{tx('ui:s_8d52e3c61c')}</span>
            <select
              value={defaultPlanet}
              onChange={(e) => handleDefaultChange(e.target.value)}
              disabled={savingDefault || !!loadError || sample}
              className="min-h-[48px] w-full max-w-md rounded-xl border border-border bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={tx('ui:s_8d52e3c61c')}
            >
              {planetOptions.map((info) => (
                <option key={info.id} value={info.id}>
                  {tx(`ui:${info.labelKey}`)}
                  {isTopicStartPlanet(info.id) ? ` (${tx('paths:topicStartTag')})` : ''}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-2 text-sm text-muted-foreground">{tx('ui:planetLevel_how')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tx('paths:topicStartsHelp')}</p>
          {(savingDefault || defaultSaved || saveError) && (
            <p
              className={cn(
                'mt-2 text-sm',
                saveError ? 'text-destructive' : defaultSaved ? 'text-success' : 'text-muted-foreground'
              )}
            >
              {saveError || (savingDefault ? tx('ui:s_56a2285c5b') : tx('ui:s_c0ae8f6ea8'))}
            </p>
          )}

          <label className="mt-5 flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
            <Switch
              checked={usePlacement}
              disabled={savingPlacement || !!loadError || sample}
              onCheckedChange={(checked) => void handlePlacementToggle(checked)}
              aria-label={tx('ui:planetLevel_usePlacement')}
            />
            <span>
              <span className="block font-medium text-foreground">{tx('ui:planetLevel_usePlacement')}</span>
              <span className="text-sm text-muted-foreground">{tx('ui:planetLevel_usePlacementHelp')}</span>
            </span>
          </label>

          <label className="mt-3 flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
            <Switch
              checked={allowStudentPhotos}
              disabled={savingPhotos || !!loadError || sample}
              onCheckedChange={(checked) => void handleStudentPhotosToggle(checked)}
              aria-label={tx('paths:allowStudentPhotos')}
            />
            <span>
              <span className="block font-medium text-foreground">{tx('paths:allowStudentPhotos')}</span>
              <span className="text-sm text-muted-foreground">{tx('paths:allowStudentPhotosHelp')}</span>
            </span>
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {pathwayBands.map(([title, help]) => (
              <div key={title} className="rounded-xl border border-border bg-background/40 p-4">
                <p className="font-semibold text-foreground">{tx(`ui:${title}`)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tx(`ui:${help}`)}</p>
              </div>
            ))}
          </div>

          <details className="mt-4 rounded-xl border border-border bg-background/40 p-3">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-2 font-medium text-foreground">
              {tx('ui:planetLevel_legendTitle')}
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {planetOptions.map((info) => (
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
          <p className="text-sm text-muted-foreground">{tx('paths:demoPin')}</p>
        )}

        <ClassTrends students={roster} sample={sample} />

        {students.length > 0 && (
          <>
            <ClassBriefing students={roster} />
            {earlyWarnings.length > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 print:break-inside-avoid">
                <h2 className="mb-3 text-xl font-semibold">{tx('ui:s_970e3adc92')}</h2>
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

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{tx('ui:s_e55198aca4')}</h2>
            <p className="text-sm text-muted-foreground">
              {tx('ui:dashRosterCount', { count: students.length })}
            </p>
          </div>
          {removeError && <p className="mb-3 text-sm text-destructive">{removeError}</p>}
          {loading ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              {tx('ui:s_522ba51bcc')}
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              {tx('ui:s_emptyroster', { code: classCode })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {students.map(([key, s]) => {
                const currentPlanet = getTeacherVisiblePlanet(s, classUnlock);
                const lesson = getLessonForPlanet(currentPlanet, 'foundations');
                const level = getPlanetLevel(currentPlanet, 'foundations');
                return (
                  <article
                    key={key}
                    className="flex flex-col rounded-2xl border border-border bg-background/60 p-4"
                  >
                    <div className="text-lg font-semibold text-foreground">{s.nickname}</div>
                    <div className="mt-2 inline-flex w-fit rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground">
                      {tx(`ui:${level.labelKey}`)}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {tx('ui:planetLevel_rosterLine', {
                        planet: tx(`ui:planet_${currentPlanet}`),
                        topic: tx(`ui:topic_${lesson}`),
                      })}
                      {' · '}
                      {tx(`ui:${level.rangeKey}`)}
                    </p>
                    {s.lastDiagnosis && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {misconceptionLabel(s.lastDiagnosis.primary)}
                        </p>
                        <p className="mt-1 text-xs">{teacherLineFor(s.lastDiagnosis.primary)}</p>
                      </div>
                    )}
                    {s.lastQuiz && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {PLANET_META[s.lastQuiz.planet as PlanetId]?.name ?? s.lastQuiz.planet}:{' '}
                        <span dir="ltr">
                          {s.lastQuiz.score}/{s.lastQuiz.total}
                        </span>
                      </div>
                    )}
                    <div className="mt-auto pt-3">
                      {pendingRemove?.key === key ? (
                        <div className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                          <p className="text-sm font-medium text-foreground">
                            {tx('ui:dashConfirmRemove', { name: s.nickname })}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={removingKey === key}
                              onClick={handleRemoveStudent}
                              className="min-h-[48px] flex-1"
                            >
                              {removingKey === key ? tx('ui:dashRemoving') : tx('ui:dashYesRemove')}
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
                              className="min-h-[48px] flex-1"
                            >
                              {tx('ui:s_77dfd2135f')}
                            </Button>
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
                          className="min-h-[48px] w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          {tx('ui:s_4fb18541ef')}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {students.length > 0 && <FamilyNote classCode={classCode} />}

        <p className="print:hidden text-center text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => navigate('/how-it-works')}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {tx('ui:s_1dd6a17cb4')}
          </button>
          {' · '}
          <button
            type="button"
            onClick={() => navigate('/methods')}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {tx('ui:s_7e4ac6803c')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default TeacherDashboard;
