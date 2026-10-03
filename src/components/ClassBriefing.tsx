import { tx } from '@/i18n/tx';
import React, { useState } from 'react';
import type { StudentState } from '@/lib/classroom';
import { briefingHeadline, briefingToText, buildClassBriefing, misconceptionLabel } from '@/lib/cognition';
import { Button } from '@/components/ui/button';

interface ClassBriefingProps {
  students: StudentState[];
}

const ClassBriefing: React.FC<ClassBriefingProps> = ({ students }) => {
  const briefing = buildClassBriefing(students);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefingToText(briefing));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="mb-8 bg-card/95 p-6 rounded-2xl border border-border print:shadow-none print:border print:break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">{tx('ui:s_550f5651a3')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{briefingHeadline(briefing)}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={handleCopy} className="min-h-[44px]">
            {copied ? tx('ui:copied') : tx('ui:copyBriefing')}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()} className="min-h-[44px]">{tx('ui:s_5b221e9c2a')}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <p className="text-2xl font-semibold tabular-nums">{briefing.total}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx('ui:s_fcfac3efb6')}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <p className="text-2xl font-semibold tabular-nums">{briefing.needsAttention}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx('ui:s_4ae2296df4')}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <p className="text-2xl font-semibold tabular-nums">{briefing.onTrack}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx('ui:s_38350e8c01')}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/60 p-3">
          <p className="text-2xl font-semibold tabular-nums">{briefing.quizTaken}</p>
          <p className="text-xs text-muted-foreground mt-1">{tx('ui:s_5206c907b4')}</p>
        </div>
      </div>

      {briefing.actions.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{tx('ui:s_1ee90e989a')}</p>
          {briefing.actions.map((action) => (
            <div key={action.code} className="rounded-xl border border-border bg-background/60 p-4">
              <p className="font-semibold text-foreground">{action.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {action.planetName} · {misconceptionLabel(action.code)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{action.detail}</p>
              <p className="text-sm text-foreground mt-2">{action.students.join(', ')}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{tx('ui:s_f7491f9232')}</p>
      )}
    </section>
  );
};

export default ClassBriefing;
