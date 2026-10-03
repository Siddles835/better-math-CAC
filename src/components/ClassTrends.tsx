import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StudentState } from '@/lib/classroom';
import {
  MISCONCEPTION_COLOR,
  MISCONCEPTION_ORDER,
  buildClassTrend,
  resolvedStudents,
  studentSummary,
  trendTableRows,
  type ClassTrend,
} from '@/lib/cognition/trends';
import { PLANET_META } from '@/lib/planets';
import { useAccessibility } from '@/context/AccessibilityContext';
import { Button } from '@/components/ui/button';

interface ClassTrendsProps {
  students: StudentState[];
  sample?: boolean;
  compact?: boolean;
}

const ClassTrends: React.FC<ClassTrendsProps> = ({ students, sample = false, compact = false }) => {
  const { t } = useTranslation(['teacher', 'cognition', 'common']);
  const { prefs } = useAccessibility();
  const reduceMotion =
    prefs.reduceMotion ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const trend = buildClassTrend(students);
  const resolved = resolvedStudents(students);
  const [tableOn, setTableOn] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const student = students.find((entry) => entry.nickname === selected) ?? null;
  const rows = chartRows(trend);

  return (
    <section className="mb-8 bg-card/95 p-4 sm:p-6 rounded-2xl border border-border print:break-inside-avoid print:bg-white print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">{t('teacher:progress')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('teacher:progressHelp')}</p>
        </div>
        {sample && (
          <p className="text-sm font-medium rounded-full border border-border px-3 py-1">{t('common:sampleData')}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl border border-border p-3">
          <p className="text-2xl font-semibold tabular-nums">{resolved.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('teacher:resolved')}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-sm text-muted-foreground">
            {resolved.length === 0
              ? t('teacher:resolvedEmpty')
              : resolved.map((row) => row.nickname).join(', ')}
          </p>
        </div>
      </div>

      {!trend.enough ? (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border p-4">
          {students.length === 0
            ? t('teacher:emptyTrends')
            : t('teacher:emptyTrends')}
        </p>
      ) : (
        <>
          <div className="flex justify-end mb-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => setTableOn((on) => !on)}>
              {tableOn ? t('teacher:hideTable') : t('teacher:showTable')}
            </Button>
          </div>
          <div className={compact ? 'h-28' : 'h-64'} aria-hidden={tableOn}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ payload, label }) => {
                    const carried = Number(payload?.[0]?.payload?.carried ?? 0);
                    return (
                      <div className="rounded-lg border bg-background p-2 text-xs">
                        <p className="font-medium mb-1">{label}</p>
                        {payload?.map((entry) => (
                          <p key={String(entry.dataKey)}>
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                        {carried > 0 && (
                          <p className="mt-1 text-muted-foreground">
                            {t('teacher:carried', { count: carried })}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                {!compact && <Legend />}
                {MISCONCEPTION_ORDER.map((code) => (
                  <Bar
                    key={code}
                    dataKey={code}
                    name={t(`cognition:${code}`)}
                    stackId="mis"
                    fill={MISCONCEPTION_COLOR[code]}
                    stroke="#111"
                    strokeWidth={0.4}
                    isAnimationActive={!reduceMotion}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TrendTable trend={trend} visible={tableOn} />
        </>
      )}

      {!compact && students.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">{t('teacher:byStudent')}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {students.map((entry) => (
              <Button
                key={entry.nickname}
                type="button"
                size="sm"
                variant={selected === entry.nickname ? 'default' : 'outline'}
                onClick={() => setSelected(entry.nickname)}
              >
                {entry.nickname}
              </Button>
            ))}
          </div>
          {student && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-sm mb-3">{studentSummary(student)}</p>
              <ol className="space-y-2">
                {(student.diagnosisHistory ?? []).map((snap) => (
                  <li key={`${snap.at}-${snap.primary}`} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: MISCONCEPTION_COLOR[snap.primary] }}
                      aria-hidden
                    />
                    <span>
                      {new Date(snap.at).toLocaleDateString()} · {t(`cognition:${snap.primary}`)} ·{' '}
                      {PLANET_META[snap.planet].name}
                    </span>
                  </li>
                ))}
                {(student.diagnosisHistory ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">No sessions yet.</li>
                )}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const chartRows = (trend: ClassTrend) =>
  trend.buckets.map((bucket) => ({
    label: bucket.label,
    carried: bucket.carried,
    ...bucket.counts,
  }));

const TrendTable: React.FC<{ trend: ClassTrend; visible: boolean }> = ({ trend, visible }) => {
  const rows = trendTableRows(trend);
  return (
    <div className={visible ? 'overflow-x-auto' : 'sr-only'}>
    <table className="mt-4 w-full text-xs border-collapse">
      <caption className={visible ? 'text-start mb-2' : 'sr-only'}>
        Students by misconception and {trend.unit}. Carried-forward values are included in the counts.
      </caption>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row[0] ?? index}>
            {row.map((cell, cellIndex) =>
              index === 0 ? (
                <th key={`${index}-${cellIndex}`} className="border border-border px-1 py-1 text-left font-medium">
                  {cell}
                </th>
              ) : (
                <td key={`${index}-${cellIndex}`} className="border border-border px-1 py-1">
                  {cell}
                </td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
};

export default ClassTrends;
