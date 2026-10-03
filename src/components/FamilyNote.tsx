import { tx } from '@/i18n/tx';
import React from 'react';
import { Button } from '@/components/ui/button';

interface FamilyNoteProps {
  classCode?: string;
}

const FamilyNote: React.FC<FamilyNoteProps> = ({ classCode }) => {
  return (
    <section
      data-secondary="true"
      className="mb-8 bg-card/95 p-6 rounded-2xl border border-border print:break-inside-avoid"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">{tx('ui:s_a435b0a7c3')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{tx('ui:s_4b87d3902f')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden min-h-[44px]"
        >{tx('ui:s_d35db43c4a')}</Button>
      </div>

      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          Our class is using MathLift for short counting, addition, and subtraction practice. Each
          child joins with a generated space name
          {classCode ? (
            <>
              {' '}
              in class <span className="font-medium text-foreground">{classCode}</span>
            </>
          ) : null}
          . They do not type a legal name or email.
        </p>
        <p>{tx('ui:s_e5c6265281')}</p>
        <p>
          If you have questions, ask the classroom teacher or email{' '}
          <a href="mailto:mathlift1234@gmail.com" className="underline underline-offset-2">{tx('ui:s_593bab7ab3')}</a>
          .
        </p>
      </div>
    </section>
  );
};

export default FamilyNote;
