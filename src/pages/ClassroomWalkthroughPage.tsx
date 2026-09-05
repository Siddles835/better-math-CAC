import React from 'react';
import { Link } from 'react-router-dom';
import ClassBriefing from '@/components/ClassBriefing';
import FamilyNote from '@/components/FamilyNote';
import SiteChrome from '@/components/SiteChrome';
import { SAMPLE_CLASS_CODE, SAMPLE_STUDENTS } from '@/lib/cognition/demoClass';
import { MISCONCEPTION_LABEL, TEACHER_LINE } from '@/lib/cognition';
import { PLANET_META, getLessonForPlanet, type PlanetId } from '@/lib/planets';

const ClassroomWalkthroughPage: React.FC = () => {
  return (
    <SiteChrome wide>
      <p className="text-sm font-medium text-muted-foreground mb-2 print:hidden">
        Sample classroom — no account required
      </p>
      <h1 className="text-3xl font-semibold mb-3">What a teacher sees after one session</h1>
      <p className="text-[16px] leading-relaxed text-muted-foreground mb-8 max-w-3xl">
        These nine students are a fixed example, not a live class. The briefing below is the same
        view a teacher gets after children practice. Names are generated space names. Create a class
        to see this update in real time.
      </p>

      <p className="text-sm text-muted-foreground mb-6 print:hidden">
        Class code <span className="font-semibold text-foreground">{SAMPLE_CLASS_CODE}</span>
        {' · '}
        <Link to="/methods" className="underline underline-offset-2 hover:text-foreground">
          How the models work
        </Link>
        {' · '}
        <Link to="/teacher-register" className="underline underline-offset-2 hover:text-foreground">
          Create your class
        </Link>
      </p>

      <ClassBriefing students={SAMPLE_STUDENTS} />

      <section className="mb-8 bg-card/95 p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-semibold mb-4">Roster</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_STUDENTS.map((s) => {
            const planet = s.planet as PlanetId;
            return (
              <div key={s.nickname} className="p-4 rounded-xl border border-border bg-background/60">
                <div className="text-lg font-semibold text-foreground">{s.nickname}</div>
                <div className="text-sm font-medium text-sky-300 mt-1">
                  {PLANET_META[planet].name} — {getLessonForPlanet(planet)}
                </div>
                {s.lastDiagnosis && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {MISCONCEPTION_LABEL[s.lastDiagnosis.primary]}
                    </p>
                    <p className="mt-1 text-xs">{TEACHER_LINE[s.lastDiagnosis.primary]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <FamilyNote classCode={SAMPLE_CLASS_CODE} />
    </SiteChrome>
  );
};

export default ClassroomWalkthroughPage;
