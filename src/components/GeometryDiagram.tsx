import { tx } from '@/i18n/tx';
import type { DiagramSpec } from '@/content/types';
import { formatPathText } from '@/lib/paths/text';

const objectCaption = (diagram: DiagramSpec): string => {
  if (diagram.compareKey) return formatPathText(diagram.compareKey);
  if (diagram.object) return formatPathText(`paths:geo_object_${diagram.object}`, undefined, diagram.object);
  return '';
};

const GeometryDiagram = ({ diagram }: { diagram: DiagramSpec }) => {
  const label = tx('paths:diagramLabel');
  const caption = objectCaption(diagram);

  if (diagram.shape === 'angle') {
    return (
      <figure className="mx-auto w-full max-w-xs">
        <svg viewBox="0 0 220 160" role="img" aria-label={label} className="h-40 w-full text-foreground">
          <polygon points="110,24 36,130 184,130" fill="hsl(var(--primary) / 0.12)" stroke="currentColor" strokeWidth="3" />
          <text x="110" y="118" textAnchor="middle" fill="currentColor" fontSize="16">
            {diagram.labels.ask ?? '?'}
          </text>
          <text x="58" y="78" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>
            {diagram.labels.a}°
          </text>
          <text x="150" y="78" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>
            {diagram.labels.b}°
          </text>
        </svg>
        {caption && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className="mx-auto w-full max-w-xs">
      <svg viewBox="0 0 220 150" role="img" aria-label={label} className="h-40 w-full text-foreground">
        <rect
          x="40"
          y="28"
          width="140"
          height="90"
          fill="hsl(var(--primary) / 0.12)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <text x="110" y="78" textAnchor="middle" fill="currentColor" fontSize="16">
          {diagram.labels.ask ?? '?'}
        </text>
        <text x="110" y="22" textAnchor="middle" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>
          {diagram.labels.width}
        </text>
        <text x="196" y="80" fill="currentColor" fontSize="16" style={{ direction: 'ltr' }}>
          {diagram.labels.height}
        </text>
      </svg>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  );
};

export default GeometryDiagram;
