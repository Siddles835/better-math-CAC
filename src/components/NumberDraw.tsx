import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { readDrawing } from '@/lib/cognition';
import type { DigitRead, UnreadableReason } from '@/lib/cognition';
import type { Point, Stroke } from '@/lib/cognition/strokes';
import { useAccessibility } from '@/context/AccessibilityContext';

export type DrawResult = 'correct' | 'incorrect' | 'unreadable' | null;

interface NumberDrawProps {
  prompt: string;
  result: DrawResult;
  unreadableReason?: UnreadableReason | null;
  /** Parent decides when a new check is allowed. */
  checkEnabled: boolean;
  disabled?: boolean;
  showTypeHint?: boolean;
  onRead: (read: DigitRead) => void;
  onChange: () => void;
  onTyped?: (value: number) => void;
}

/**
 * Write a number by drawing it, or by typing it. Both routes answer the same
 * question. The preferred method is offered first. The component never shows
 * the target number.
 */
const NumberDraw: React.FC<NumberDrawProps> = ({
  prompt,
  result,
  unreadableReason,
  checkEnabled,
  disabled,
  showTypeHint,
  onRead,
  onChange,
  onTyped,
}) => {
  const { t } = useTranslation(['common', 'lessons']);
  const { prefs, announce } = useAccessibility();
  const hintFor = (reason: UnreadableReason | null | undefined): string => {
    if (reason === 'too_few_points') return t('lessons:tooFew');
    if (reason === 'too_many_parts' || reason === 'ambiguous') return t('lessons:oneAtATime');
    return t('lessons:tooSmall');
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [typing, setTyping] = useState(
    prefs.answerMethod === 'type' || prefs.answerMethod === 'choose'
  );
  const [typed, setTyped] = useState('');
  const busy = useRef(false);

  const paintAll = useCallback((next: Stroke[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const css = 220;
    if (canvas.width !== Math.round(css * dpr)) {
      canvas.width = Math.round(css * dpr);
      canvas.height = Math.round(css * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, css, css);
    ctx.strokeStyle = '#e8eef8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of next) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    paintAll(strokesRef.current);
  }, [paintAll]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (!point) return;
    drawing.current = [point];
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const prev = drawing.current[drawing.current.length - 1];
    drawing.current.push(point);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = '#e8eef8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drawing.current && drawing.current.length > 1) {
      const next = [...strokesRef.current, drawing.current];
      strokesRef.current = next;
      setStrokes(next);
      onChange();
    }
    drawing.current = null;
  };

  const clear = () => {
    strokesRef.current = [];
    setStrokes([]);
    drawing.current = null;
    paintAll([]);
    onChange();
  };

  const submit = () => {
    if (!checkEnabled || busy.current) return;
    busy.current = true;
    const pending = drawing.current && drawing.current.length > 1 ? [drawing.current] : [];
    const all = [...strokesRef.current, ...pending];
    onRead(readDrawing(all));
    window.setTimeout(() => {
      busy.current = false;
    }, 250);
  };

  const submitTyped = () => {
    if (!onTyped || busy.current) return;
    const value = Number.parseInt(typed, 10);
    if (!Number.isFinite(value)) return;
    busy.current = true;
    onTyped(value);
    window.setTimeout(() => {
      busy.current = false;
    }, 250);
  };

  const message =
    result === 'correct'
      ? t('common:great')
      : result === 'incorrect'
        ? t('common:notQuite')
        : result === 'unreadable'
          ? hintFor(unreadableReason)
          : '';

  useEffect(() => {
    if (message) announce(message);
  }, [message, announce]);

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      {prompt ? <p className="text-base text-muted-foreground">{prompt}</p> : null}
      <div className="flex gap-2" role="group" aria-label={t('common:drawNumber')}>
        <Button
          type="button"
          variant={typing ? 'outline' : 'default'}
          aria-pressed={!typing}
          className="min-h-[44px]"
          onClick={() => setTyping(false)}
        >
          {t('common:drawNumber')}
        </Button>
        {onTyped && (
          <Button
            type="button"
            variant={typing || showTypeHint ? 'default' : 'outline'}
            aria-pressed={typing}
            className="min-h-[44px]"
            onClick={() => setTyping(true)}
          >
            {t('common:typeIt')}
          </Button>
        )}
      </div>
      {!typing && (
        <>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            className="w-[220px] h-[220px] rounded-2xl bg-card border-2 border-border touch-none cursor-crosshair"
            role="img"
            tabIndex={0}
            aria-label={t('common:drawNumber')}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={clear} disabled={disabled}>
              {t('common:clear')}
            </Button>
            <Button
              type="button"
              className="min-h-[44px]"
              onClick={submit}
              disabled={disabled || !checkEnabled || strokes.length === 0}
            >
              {t('common:check')}
            </Button>
          </div>
        </>
      )}
      {showTypeHint && <p className="text-sm text-muted-foreground">{t('common:typeHint')}</p>}
      {typing && onTyped && (
        <form
          className="flex gap-2 items-center"
          onSubmit={(event) => {
            event.preventDefault();
            submitTyped();
          }}
        >
          <label htmlFor="number-answer" className="sr-only">
            {t('common:typeIt')}
          </label>
          <input
            id="number-answer"
            inputMode="numeric"
            value={typed}
            disabled={disabled}
            onChange={(event) => {
              setTyped(event.target.value.replace(/[^\d]/g, '').slice(0, 2));
              onChange();
            }}
            aria-label={t('common:typeIt')}
            className="w-32 text-center text-3xl min-h-[64px] rounded-2xl bg-card border-2 border-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button type="submit" className="min-h-[48px]" disabled={disabled || typed.length === 0}>
            {t('common:check')}
          </Button>
        </form>
      )}
      <p className="text-sm font-medium min-h-[1.25rem]" aria-live="polite">
        {message}
      </p>
      <p className="text-xs text-muted-foreground">{t('common:drawingStays')}</p>
    </div>
  );
};

export default NumberDraw;
