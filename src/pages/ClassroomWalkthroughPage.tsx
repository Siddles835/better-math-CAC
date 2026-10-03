import { tx } from '@/i18n/tx';
import React from 'react';
import { Link } from 'react-router-dom';
import ClassBriefing from '@/components/ClassBriefing';
import FamilyNote from '@/components/FamilyNote';
import SiteChrome from '@/components/SiteChrome';
import { SAMPLE_CLASS_CODE, SAMPLE_STUDENTS } from '@/lib/cognition/demoClass';
import { misconceptionLabel, teacherLineFor } from '@/lib/cognition';
import { getLessonForPlanet, type PlanetId } from '@/lib/planets';

const ClassroomWalkthroughPage: React.FC = () => {
  return (
    <SiteChrome wide>
      <p className="text-sm font-medium text-muted-foreground mb-2 print:hidden">{tx('ui:s_f12b43b073')}</p>
      <h1 className="text-3xl font-semibold mb-3">{tx('ui:s_a03a2a54a9')}</h1>
      <p className="text-[16px] leading-relaxed text-muted-foreground mb-8 max-w-3xl">{tx('ui:s_d23d51ddca')}</p>

      <p className="text-sm text-muted-foreground mb-6 print:hidden">{tx('ui:s_1636cd7d91')}<span className="font-semibold text-foreground">{SAMPLE_CLASS_CODE}</span>
        {' · '}
        <Link to="/methods" className="underline underline-offset-2 hover:text-foreground">{tx('ui:s_4fc5b59e1b')}</Link>
        {' · '}
        <Link to="/teacher-register" className="underline underline-offset-2 hover:text-foreground">{tx('ui:s_70c0084aca')}</Link>
        {' · '}
        <Link to="/try-practice" className="underline underline-offset-2 hover:text-foreground">{tx('ui:s_c4f6be4b87')}</Link>
      </p>

      <ClassBriefing students={SAMPLE_STUDENTS} />

      <section className="mb-8 bg-card/95 p-6 rounded-2xl border border-border">
        <h2 className="text-xl font-semibold mb-4">{tx('ui:s_e55198aca4')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_STUDENTS.map((s) => {
            const planet = s.planet as PlanetId;
            return (
              <div key={s.nickname} className="p-4 rounded-xl border border-border bg-background/60">
                <div className="text-lg font-semibold text-foreground">{s.nickname}</div>
                <div className="text-sm font-medium text-sky-300 mt-1">
                  {tx(`ui:planet_${planet}`)} · {tx(`ui:topic_${getLessonForPlanet(planet)}`)}
                </div>
                {s.lastDiagnosis && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {misconceptionLabel(s.lastDiagnosis.primary)}
                    </p>
                    <p className="mt-1 text-xs">{teacherLineFor(s.lastDiagnosis.primary)}</p>
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
