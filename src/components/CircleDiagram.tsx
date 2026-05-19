import React from 'react';

type Planet = {
  id: string;
  name: string;
  color?: string;
  route?: string;
  disabled?: boolean;
};

interface Props {
  planets: Planet[];
  size?: number;
  onSelect?: (p: Planet) => void;
  selectedId?: string;
}

const CircleDiagram: React.FC<Props> = ({ planets, size = 360, onSelect, selectedId }) => {
  const r = size / 2;
  const cx = r;
  const cy = r;
  const angleStep = (Math.PI * 2) / planets.length;
  const labelOffset = 34;

  const pad = 36;
  const viewSize = size + pad * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${viewSize} ${viewSize}`}
      overflow="visible"
      className="mx-auto block overflow-visible"
      role="img"
      aria-label="Planet selection diagram"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r - 52}
        fill="none"
        stroke="hsl(var(--muted-foreground) / 0.35)"
        strokeWidth={1.5}
      />
      <g>
        {planets.map((p, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const px = cx + Math.cos(angle) * (r - 52);
          const py = cy + Math.sin(angle) * (r - 52);
          const labelY = py + labelOffset;
          const isSelected = p.id === selectedId;
          const isDisabled = p.disabled;

          return (
            <g
              key={p.id}
              onClick={() => !isDisabled && onSelect?.(p)}
              style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
              opacity={isDisabled ? 0.35 : 1}
            >
              <circle
                cx={px}
                cy={py}
                r={isSelected ? 22 : 18}
                fill={p.color || '#f3f4f6'}
                stroke={isSelected ? '#fff' : isDisabled ? '#666' : '#e2e8f0'}
                strokeWidth={isSelected ? 2.5 : 1}
              />
              <text
                x={px}
                y={labelY}
                fontSize={13}
                fontWeight={600}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default CircleDiagram;
