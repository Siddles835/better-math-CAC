import { tx } from '@/i18n/tx';
import React, { useEffect, useState } from 'react';
import { AppleShape } from '@/components/AppleShape';
import { hapticTap } from '@/lib/haptics';
import { getObjectStore } from '@/lib/objects/store';
import type { BuiltinObjectId } from '@/lib/objects/types';
import { cn } from '@/lib/utils';

export interface ObjectGlyphProps {
  /** builtin:apple, photo uuid, or bare builtin id / 'dot'. */
  objectId?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  label?: string;
  className?: string;
  diePips?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Optional Playwright / test hook. */
  testId?: string;
}

const SIZE = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
} as const;

const resolveBuiltin = (objectId?: string): BuiltinObjectId | 'dot' | null => {
  if (!objectId || objectId === 'dot') return objectId === 'dot' ? 'dot' : 'apple';
  if (objectId.startsWith('builtin:')) return objectId.slice('builtin:'.length) as BuiltinObjectId;
  if (
    ['apple', 'pencil', 'crayon', 'die', 'block', 'button', 'ball', 'coin'].includes(objectId)
  ) {
    return objectId as BuiltinObjectId;
  }
  return null;
};

const BuiltinSvg: React.FC<{ id: BuiltinObjectId | 'dot'; diePips?: number }> = ({
  id,
  diePips = 5,
}) => {
  if (id === 'dot') {
    return <circle cx="12" cy="12" r="8" className="fill-primary stroke-foreground" strokeWidth="1.5" />;
  }
  if (id === 'apple') return <AppleShape />;
  if (id === 'pencil') {
    return (
      <>
        <rect x="10" y="3" width="4" height="14" rx="1" className="fill-[hsl(var(--pencil))]" />
        <polygon points="10,17 14,17 12,21" className="fill-amber-700" />
        <rect x="10" y="3" width="4" height="3" className="fill-pink-400" />
      </>
    );
  }
  if (id === 'crayon') {
    return (
      <>
        <rect x="9" y="4" width="6" height="13" rx="1" className="fill-sky-500" />
        <polygon points="9,17 15,17 12,21" className="fill-sky-700" />
        <rect x="9" y="4" width="6" height="2" className="fill-sky-300" />
      </>
    );
  }
  if (id === 'die') {
    const pips: Record<number, Array<[number, number]>> = {
      1: [[12, 12]],
      2: [
        [8, 8],
        [16, 16],
      ],
      3: [
        [8, 8],
        [12, 12],
        [16, 16],
      ],
      4: [
        [8, 8],
        [16, 8],
        [8, 16],
        [16, 16],
      ],
      5: [
        [8, 8],
        [16, 8],
        [12, 12],
        [8, 16],
        [16, 16],
      ],
      6: [
        [8, 7],
        [16, 7],
        [8, 12],
        [16, 12],
        [8, 17],
        [16, 17],
      ],
    };
    const dots = pips[diePips] ?? pips[5];
    return (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" className="fill-card stroke-foreground" strokeWidth="1.5" />
        {dots.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r="1.6" className="fill-foreground" />
        ))}
      </>
    );
  }
  if (id === 'block') {
    return <rect x="5" y="5" width="14" height="14" rx="2" className="fill-amber-500 stroke-amber-700" strokeWidth="1.2" />;
  }
  if (id === 'button') {
    return (
      <>
        <circle cx="12" cy="12" r="8" className="fill-rose-400 stroke-rose-700" strokeWidth="1.2" />
        <circle cx="10" cy="10" r="1" className="fill-card" />
        <circle cx="14" cy="10" r="1" className="fill-card" />
        <circle cx="10" cy="14" r="1" className="fill-card" />
        <circle cx="14" cy="14" r="1" className="fill-card" />
      </>
    );
  }
  if (id === 'ball') {
    return <circle cx="12" cy="12" r="8" className="fill-orange-400 stroke-orange-700" strokeWidth="1.2" />;
  }
  return <circle cx="12" cy="12" r="7" className="fill-yellow-400 stroke-yellow-700" strokeWidth="1.2" />;
};

const ObjectGlyph: React.FC<ObjectGlyphProps> = ({
  objectId = 'apple',
  size = 'md',
  onClick,
  label,
  className,
  diePips,
  testId,
}) => {
  const builtin = resolveBuiltin(objectId);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoke: string | null = null;
    let cancel = false;
    if (builtin) {
      setPhotoUrl(null);
      return;
    }
    void (async () => {
      const blobs = await getObjectStore().getBlobs(objectId);
      if (cancel || !blobs) return;
      const url = URL.createObjectURL(blobs.thumb);
      revoke = url;
      setPhotoUrl(url);
    })();
    return () => {
      cancel = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [builtin, objectId]);

  const handleClick = onClick
    ? () => {
        hapticTap();
        onClick();
      }
    : undefined;

  const aria = label ?? tx('objects:glyphLabel');

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onClick}
      data-testid={testId}
      className={cn(
        'inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl transition-transform duration-200',
        onClick && 'hover:scale-110 active:scale-95 cursor-pointer',
        !onClick && 'pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'drop-shadow-sm',
        className
      )}
      aria-label={aria}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className={cn(SIZE[size], 'object-contain rounded-md ring-2 ring-card')}
          draggable={false}
        />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className={cn(SIZE[size], 'max-w-full max-h-full')}>
          <BuiltinSvg id={builtin ?? 'apple'} diePips={diePips} />
        </svg>
      )}
    </button>
  );
};

export default ObjectGlyph;
