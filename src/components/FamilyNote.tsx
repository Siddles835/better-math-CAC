import React from 'react';
import { Button } from '@/components/ui/button';

interface FamilyNoteProps {
  classCode?: string;
}

const FamilyNote: React.FC<FamilyNoteProps> = ({ classCode }) => {
  return (
    <section className="mb-8 bg-card/95 p-6 rounded-2xl border border-border print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Note for families</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A one-page letter you can print or send home.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden min-h-[44px]"
        >
          Print note
        </Button>
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
        <p>
          The app watches how a child builds an answer — not only whether it is right. Drawings and
          tap traces stay on the device. The teacher sees a short summary: a named practice pattern
          and a suggested next activity. Nothing is sold or used for advertising.
        </p>
        <p>
          If you have questions, ask the classroom teacher or email{' '}
          <a href="mailto:mathlift1234@gmail.com" className="underline underline-offset-2">
            mathlift1234@gmail.com
          </a>
          .
        </p>
      </div>
    </section>
  );
};

export default FamilyNote;
