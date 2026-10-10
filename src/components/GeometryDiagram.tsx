import { tx } from '@/i18n/tx';
import type { DiagramSpec } from '@/content/types';

const GeometryDiagram = ({ diagram }: { diagram: DiagramSpec }) => {
  const label = tx('paths:diagramLabel');
  if (diagram.shape === 'angle') {
    return (
      <svg viewBox="0 0 220 160" role="img" aria-label={label} className="mx-auto h-40 w-full max-w-xs text-foreground">
        <polygon points="110,24 36,130 184,130" fill="none" stroke="currentColor" strokeWidth="3" />
        <text x="110" y="118" textAnchor="middle" fill="currentColor" fontSize="16">{diagram.labels.ask ?? '?'}</text>
        <text x="58" y="78" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>{diagram.labels.a}</text>
        <text x="150" y="78" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>{diagram.labels.b}</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 150" role="img" aria-label={label} className="mx-auto h-40 w-full max-w-xs text-foreground">
      <rect x="40" y="28" width="140" height="90" fill="none" stroke="currentColor" strokeWidth="3" />
      <text x="110" y="78" textAnchor="middle" fill="currentColor" fontSize="16">{diagram.labels.ask ?? '?'}</text>
      <text x="110" y="22" textAnchor="middle" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>{diagram.labels.width}</text>
      <text x="196" y="80" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>{diagram.labels.height}</text>
    </svg>
  );
};

export default GeometryDiagram;
