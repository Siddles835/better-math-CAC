import { tx } from '@/i18n/tx';
import React from 'react';
import { Link } from 'react-router-dom';
import SiteChrome from '@/components/SiteChrome';

const HowItWorksPage: React.FC = () => {
  return (
    <SiteChrome>
      <p className="text-sm font-medium text-muted-foreground mb-2">{tx('ui:s_359126366d')}</p>
      <h1 className="text-3xl font-semibold mb-4">{tx('ui:s_6fe7815240')}</h1>
      <p className="text-[16px] leading-relaxed text-muted-foreground mb-10">{tx('ui:s_70a0b3af2b')}</p>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">{tx('ui:s_4c5b4aea9a')}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{tx('ui:s_e98ba247b9')}</p>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-4">{tx('ui:s_b366fd115a')}</h2>
        <ol className="space-y-4 text-[15px] text-muted-foreground list-decimal ps-5">
          <li>
            <span className="text-foreground font-medium">{tx('ui:s_8abcf7f8c5')}</span>{tx('ui:s_838e46281b')}</li>
          <li>
            <span className="text-foreground font-medium">{tx('ui:s_d89f7febe6')}</span>{' '}
            {tx('ui:howModel')}
          </li>
          <li>
            <span className="text-foreground font-medium">{tx('ui:s_16decc16c4')}</span>{' '}
            {tx('ui:howPractice')}
          </li>
          <li>
            <span className="text-foreground font-medium">{tx('ui:s_e5ee1a7366')}</span>{tx('ui:s_7baeb6ce1d')}</li>
        </ol>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">{tx('ui:s_0cfad637b2')}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-3">{tx('ui:s_5eaa525500')}</p>
        <ul className="space-y-2 text-[15px] text-muted-foreground list-disc ps-5">
          <li>{tx('ui:s_efae73bd10')}</li>
          <li>{tx('ui:s_53ddc2bd14')}</li>
          <li>{tx('ui:s_d748d0b77b')}</li>
          <li>{tx('ui:s_87531746df')}</li>
          <li>{tx('ui:s_f49b93c38a')}</li>
          <li>{tx('ui:s_c908efaafb')}</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          Technical detail is on the{' '}
          <Link to="/methods" className="underline underline-offset-2 hover:text-foreground">
            methods
          </Link>{' '}
          page. A filled-in teacher view is in the{' '}
          <Link to="/classroom" className="underline underline-offset-2 hover:text-foreground">{tx('ui:s_5e3f5556ee')}</Link>
          .
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6">
        <h2 className="text-xl font-semibold mb-3">{tx('ui:s_cf01481f62')}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{tx('ui:s_4da2e3befc')}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card/90 p-6 print:hidden">
        <h2 className="text-xl font-semibold mb-3">Try it</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground mb-4">{tx('ui:s_89f895399f')}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/teacher-register"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-500"
          >{tx('ui:s_1f492628cf')}</Link>
          <Link
            to="/student-register"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >{tx('ui:s_609f1ff09d')}</Link>
          <Link
            to="/classroom"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >{tx('ui:s_902367725d')}</Link>
          <Link
            to="/try-practice"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >{tx('ui:s_9c5159552d')}</Link>
        </div>
      </section>
    </SiteChrome>
  );
};

export default HowItWorksPage;
