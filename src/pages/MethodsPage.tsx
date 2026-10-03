import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SiteChrome from '@/components/SiteChrome';
import { useAccessibility } from '@/context/AccessibilityContext';
import { asNumber, asRecord, metricText } from '@/lib/cognition/evalView';
import shipped from '@/lib/cognition/models/eval.json';

const pilotModules = import.meta.glob('../lib/cognition/models/pilot_eval.json', {
  eager: true,
  import: 'default',
});

const omitPath = (source: unknown, path: string | null): unknown => {
  if (!path) return source;
  const clone = JSON.parse(JSON.stringify(source)) as Record<string, unknown>;
  const parts = path.split('.');
  let cursor: unknown = clone;
  for (let i = 0; i < parts.length - 1; i += 1) {
    cursor = asRecord(cursor)?.[parts[i]];
  }
  const parent = asRecord(cursor);
  if (parent) delete parent[parts[parts.length - 1]];
  return clone;
};

const MethodsPage: React.FC = () => {
  const { t } = useTranslation('methods');
  const { prefs } = useAccessibility();
  const [tableOn, setTableOn] = useState(false);
  const omit = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('omit') : null;
  const evalData = useMemo(() => asRecord(omitPath(shipped, omit)) ?? {}, [omit]);
  const tree = asRecord(evalData.misconceptionTree);
  const digits = asRecord(evalData.digitModel);
  const recommendation = asRecord(evalData.recommendation);
  const pilot = (Object.values(pilotModules)[0] as unknown) ?? null;
  const pilotRecord = asRecord(pilot);

  const bins = Array.isArray(asRecord(tree?.calibration)?.bins)
    ? (asRecord(tree?.calibration)?.bins as Array<Record<string, unknown>>)
    : [];
  const chartRows = bins.map((bin, index) => ({
    name: `${metricText(bin.lo)}-${metricText(bin.hi)}`,
    accuracy: asNumber(bin.accuracy) ?? 0,
    count: asNumber(bin.count) ?? 0,
    key: index,
  }));

  return (
    <SiteChrome>
      <p className="text-sm font-medium text-muted-foreground mb-2">{t('kicker')}</p>
      <h1 className="text-3xl font-semibold mb-4">{t('title')}</h1>

      <Section title={t('what')}>
        <p>
          {t('tree')}: {metricText(tree?.accuracy)} accuracy, macro-F1 {metricText(tree?.macroF1)}. {t('sampleSize', { count: metricText(tree?.testSize) })}.
        </p>
        <p>
          {t('digits')}: easy {metricText(digits?.easyAccuracy)}, hard held-out {metricText(digits?.hardAccuracy)}. {t('sampleSize', { count: metricText(digits?.hardSize) })}.
        </p>
        <p>
          {t('recommend')}: {metricText(recommendation?.accuracy)}. {t('sampleSize', { count: metricText(recommendation?.testSize) })}.
        </p>
      </Section>

      <Section title={t('trained')}>
        <p>{t('synthetic')}</p>
        <p>
          dataSource: {typeof evalData.dataSource === 'string' ? evalData.dataSource : t('notAvailable', { defaultValue: 'not available' })}. Generated {typeof evalData.generatedAt === 'string' ? evalData.generatedAt : 'not available'}.
        </p>
        <p>{t('assumption')}</p>
        <p>{t('strokes')}</p>
        <MultiplierTable values={asRecord(asRecord(evalData.readingTimeMultipliers)?.values)} />
      </Section>

      <Section title={t('howWell')}>
        <p>
          Majority baseline {metricText(asRecord(tree?.baselines)?.majorityAccuracy)}. Rule baseline {metricText(asRecord(tree?.baselines)?.ruleAccuracy)}. Tree improvement over majority {metricText(asRecord(tree?.baselines)?.improvementOverMajority)}.
        </p>
        <ClassTable rows={Array.isArray(tree?.perClass) ? tree.perClass : []} />
        <Heatmap matrix={asRecord(tree?.confusionMatrix)} />
        <h3 className="text-lg font-semibold mt-6 mb-2">Calibration</h3>
        <p>ECE {metricText(asRecord(tree?.calibration)?.ece)}.</p>
        <BandList bands={asRecord(asRecord(tree?.calibration)?.bands)} />
        {chartRows.length > 0 ? (
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="accuracy" fill="#0072B2" isAnimationActive={!prefs.reduceMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p>not available</p>
        )}
        <button type="button" className="mt-3 text-sm underline" onClick={() => setTableOn((on) => !on)}>
          {tableOn ? t('hideTable') : t('showTable')}
        </button>
        <table className={tableOn ? 'mt-3 w-full text-sm' : 'sr-only'}>
          <caption>Calibration bins</caption>
          <thead>
            <tr>
              <th>Bin</th>
              <th>Accuracy</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {chartRows.map((row) => (
              <tr key={row.key}>
                <td>{row.name}</td>
                <td>{row.accuracy}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="text-lg font-semibold mt-6 mb-2">{t('digits')}</h3>
        <ClassTable rows={Array.isArray(digits?.perDigit) ? digits.perDigit : []} />
        <Heatmap matrix={asRecord(digits?.confusionMatrix)} />
        <h3 className="text-lg font-semibold mt-6 mb-2">Per language</h3>
        <LanguageTable languages={asRecord(tree?.perLanguage)} />
        <p>Worst language gap in macro-F1: {metricText(tree?.worstLanguageGapMacroF1)}.</p>
        <h3 className="text-lg font-semibold mt-6 mb-2">Per script</h3>
        <ScriptTable scripts={asRecord(digits?.perScript)} />
      </Section>

      <Section title={t('whenWrong')}>
        <p>Timing noise: {pairText(asRecord(asRecord(tree?.robustness)?.timingNoiseAccuracy))}</p>
        <p>Label flips: {pairText(asRecord(asRecord(tree?.robustness)?.labelFlipAccuracy))}</p>
        <p>Distribution shift: {metricText(asRecord(tree?.robustness)?.distributionShiftAccuracy)}</p>
        <p>Digit jitter: {pairText(asRecord(digits?.jitterAccuracy))}</p>
        <p>{typeof digits?.reversalNote === 'string' ? digits.reversalNote : 'not available'}</p>
        <ScriptTable scripts={asRecord(digits?.reversalHeuristic)} />
        <p>
          Rejection thresholds met target: {String(asRecord(digits?.thresholds)?.metTarget ?? 'not available')}. Clean accept {metricText(asRecord(digits?.thresholds)?.cleanAcceptRate)}. Bad reject {metricText(asRecord(digits?.thresholds)?.badRejectRate)}.
        </p>
      </Section>

      <Section title={t('whatWrong')}>
        <ConfusionList rows={Array.isArray(tree?.topConfusions) ? tree.topConfusions : []} />
        <ul className="list-disc ps-5 space-y-2">
          <li>{t('limitGrade')}</li>
          <li>{t('strokes')}</li>
          <li>Hard held-out digit accuracy is much lower than the easy split. Treat drawing checks as a hint, not a certainty.</li>
        </ul>
      </Section>

      <Section title={t('compared')}>
        {pilotRecord && typeof pilotRecord.agreement === 'number' ? (
          <p>
            Agreement {metricText(pilotRecord.agreement)}. Cohen kappa {metricText(pilotRecord.kappa)}. {t('sampleSize', { count: metricText(pilotRecord.support) })}.
          </p>
        ) : (
          <p>{t('pilotMissing')}</p>
        )}
      </Section>

      <Section title={t('privacy')}>
        <p>{t('limitPrivacy')}</p>
      </Section>

      <Section title={t('limits')}>
        <ul className="list-disc ps-5 space-y-2">
          <li>{t('limitGrade')}</li>
          <li>{t('limitDisability')}</li>
          <li>{t('limitTeacher')}</li>
        </ul>
      </Section>

      <p className="text-sm text-muted-foreground">
        <Link to="/classroom" className="underline underline-offset-2">sample classroom</Link>
        {' · '}
        <Link to="/how-it-works" className="underline underline-offset-2">how a session runs</Link>
      </p>
    </SiteChrome>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-8 rounded-2xl border border-border bg-card/90 p-6 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
    {children}
  </section>
);

const ClassTable: React.FC<{ rows: unknown[] }> = ({ rows }) => {
  if (rows.length === 0) return <p>not available</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="text-start border border-border px-2 py-1">Label</th>
            <th className="text-start border border-border px-2 py-1">Precision</th>
            <th className="text-start border border-border px-2 py-1">Recall</th>
            <th className="text-start border border-border px-2 py-1">F1</th>
            <th className="text-start border border-border px-2 py-1">Support</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const item = asRecord(row);
            return (
              <tr key={String(item?.label ?? index)}>
                <td className="border border-border px-2 py-1">{String(item?.label ?? 'not available')}</td>
                <td className="border border-border px-2 py-1">{metricText(item?.precision)}</td>
                <td className="border border-border px-2 py-1">{metricText(item?.recall)}</td>
                <td className="border border-border px-2 py-1">{metricText(item?.f1)}</td>
                <td className="border border-border px-2 py-1">{metricText(item?.support)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Heatmap: React.FC<{ matrix: Record<string, unknown> | null }> = ({ matrix }) => {
  const labels = Array.isArray(matrix?.labels) ? matrix.labels : [];
  const cells = Array.isArray(matrix?.matrix) ? matrix.matrix : [];
  if (labels.length === 0 || cells.length === 0) return <p>not available</p>;
  return (
    <div className="overflow-x-auto mt-3">
      <table className="text-xs border-collapse" aria-label="Confusion matrix">
        <thead>
          <tr>
            <th className="border border-border px-1 py-1">Actual</th>
            {labels.map((label) => (
              <th key={String(label)} className="border border-border px-1 py-1">{String(label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, rowIndex) => {
            const values = Array.isArray(row) ? row : [];
            const rowMax = Math.max(1, ...values.map((value) => (typeof value === 'number' ? value : 0)));
            return (
              <tr key={String(labels[rowIndex] ?? rowIndex)}>
                <th className="border border-border px-1 py-1 text-start">{String(labels[rowIndex] ?? '')}</th>
                {values.map((value, colIndex) => {
                  const count = typeof value === 'number' ? value : 0;
                  const shade = Math.round((count / rowMax) * 70);
                  return (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className="border border-border px-1 py-1 text-center"
                      style={{ backgroundColor: `rgba(0, 114, 178, ${shade / 100})` }}
                    >
                      {count}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const LanguageTable: React.FC<{ languages: Record<string, unknown> | null }> = ({ languages }) => {
  if (!languages) return <p>not available</p>;
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr>
          <th className="text-start border border-border px-2 py-1">Language</th>
          <th className="text-start border border-border px-2 py-1">Accuracy</th>
          <th className="text-start border border-border px-2 py-1">Macro-F1</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(languages).map(([lang, value]) => {
          const row = asRecord(value);
          return (
            <tr key={lang}>
              <td className="border border-border px-2 py-1">{lang}</td>
              <td className="border border-border px-2 py-1">{metricText(row?.accuracy)}</td>
              <td className="border border-border px-2 py-1">{metricText(row?.macroF1)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const ScriptTable: React.FC<{ scripts: Record<string, unknown> | null }> = ({ scripts }) => {
  if (!scripts) return <p>not available</p>;
  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {Object.entries(scripts).map(([name, value]) => (
          <tr key={name}>
            <th className="text-start border border-border px-2 py-1">{name}</th>
            <td className="border border-border px-2 py-1">{pairText(asRecord(value))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const MultiplierTable: React.FC<{ values: Record<string, unknown> | null }> = ({ values }) => {
  if (!values) return <p>not available</p>;
  return (
    <ul className="list-disc ps-5">
      {Object.entries(values).map(([lang, value]) => (
        <li key={lang}>{lang}: {metricText(value)}</li>
      ))}
    </ul>
  );
};

const BandList: React.FC<{ bands: Record<string, unknown> | null }> = ({ bands }) => {
  if (!bands) return <p>not available</p>;
  return (
    <ul className="list-disc ps-5">
      {Object.entries(bands).map(([name, value]) => {
        const row = asRecord(value);
        return (
          <li key={name}>
            {name}: accuracy {metricText(row?.accuracy)}, {metricText(row?.count)} samples
          </li>
        );
      })}
    </ul>
  );
};

const ConfusionList: React.FC<{ rows: unknown[] }> = ({ rows }) => {
  if (rows.length === 0) return <p>not available</p>;
  return (
    <ul className="list-disc ps-5">
      {rows.slice(0, 5).map((row, index) => {
        const item = asRecord(row);
        return (
          <li key={index}>
            {String(item?.actual ?? 'not available')} predicted as {String(item?.predicted ?? 'not available')} ({metricText(item?.count)} of the row, rate {metricText(item?.rate)})
          </li>
        );
      })}
    </ul>
  );
};

const pairText = (record: Record<string, unknown> | null): string => {
  if (!record) return 'not available';
  return Object.entries(record)
    .map(([key, value]) => `${key} ${metricText(value)}`)
    .join(', ');
};

export default MethodsPage;
