import React from 'react';

type Planet = { id: string; name: string; color?: string; route?: string };

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

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g>
        {planets.map((p, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const px = cx + Math.cos(angle) * (r - 48);
          const py = cy + Math.sin(angle) * (r - 48);
          const isSelected = p.id === selectedId;
          return (
            <g key={p.id} onClick={() => onSelect?.(p)} style={{ cursor: 'pointer' }}>
              <circle cx={px} cy={py} r={isSelected ? 22 : 18} fill={p.color || '#f3f4f6'} stroke={isSelected ? '#fff' : '#0000'} strokeWidth={isSelected ? 2 : 0} />
              <text x={px} y={py + 36} fontSize={12} textAnchor="middle" fill="#111" style={{ pointerEvents: 'none' }}>{p.name}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default CircleDiagram;
