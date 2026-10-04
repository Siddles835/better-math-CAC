import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { needsConfirm, readDrawing } from '@/lib/cognition';
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
 * Write a number by drawing it, or by typing it. Live preview updates after each
 * stroke. The Type it pad stays visible. Unreadable / rejected confirms are never wrong.
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
  const { announce } = useAccessibility();
  const hintFor = (reason: UnreadableReason | null | undefined): string => {
    if (reason === 'too_few_points') return t('lessons:tooFew');
    if (reason === 'too_many_parts' || reason === 'ambiguous') return t('lessons:oneAtATime');
    return t('lessons:tooSmall');
  };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [typed, setTyped] = useState('');
  const [preview, setPreview] = useState<DigitRead | null>(null);
  const [pending, setPending] = useState<DigitRead | null>(null);
  const busy = useRef(false);

  const contentBox = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const style = window.getComputedStyle(canvas);
    const left = Number.parseFloat(style.borderLeftWidth) || 0;
    const right = Number.parseFloat(style.borderRightWidth) || 0;
    const top = Number.parseFloat(style.borderTopWidth) || 0;
    const bottom = Number.parseFloat(style.borderBottomWidth) || 0;
    return {
      width: Math.max(1, rect.width - left - right),
      height: Math.max(1, rect.height - top - bottom),
      left,
      top,
      rect,
    };
  };

  const paintAll = useCallback((next: Stroke[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const style = window.getComputedStyle(canvas);
    const left = Number.parseFloat(style.borderLeftWidth) || 0;
    const right = Number.parseFloat(style.borderRightWidth) || 0;
    const top = Number.parseFloat(style.borderTopWidth) || 0;
    const bottom = Number.parseFloat(style.borderBottomWidth) || 0;
    const width = Math.max(1, rect.width - left - right);
    const height = Math.max(1, rect.height - top - bottom);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bitmapW = Math.round(width * dpr);
    const bitmapH = Math.round(height * dpr);
    if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
      canvas.width = bitmapW;
      canvas.height = bitmapH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#e8eef8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of next) {
      if (stroke.length < 1) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.01, stroke[0].y + 0.01);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    paintAll(strokesRef.current);
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => paintAll(strokesRef.current));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paintAll]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const box = contentBox();
    if (!box) return null;
    const x = event.clientX - box.rect.left - box.left;
    const y = event.clientY - box.rect.top - box.top;
    if (x < -2 || y < -2 || x > box.width + 2 || y > box.height + 2) return null;
    return { x: Math.min(box.width, Math.max(0, x)), y: Math.min(box.height, Math.max(0, y)) };
  };

  const refreshPreview = (next: Stroke[]) => {
    if (next.length === 0) {
      setPreview(null);
      return;
    }
    setPreview(readDrawing(next));
  };

  const commitStroke = (stroke: Stroke) => {
    if (stroke.length === 0) return;
    const normalized =
      stroke.length === 1 ? [stroke[0], { x: stroke[0].x + 0.5, y: stroke[0].y + 0.5 }] : stroke;
    const next = [...strokesRef.current, normalized];
    strokesRef.current = next;
    setStrokes(next);
    setPending(null);
    refreshPreview(next);
    onChange();
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const stroke = drawing.current;
    drawing.current = null;
    if (stroke) commitStroke(stroke);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.preventDefault();
    if (drawing.current) commitStroke(drawing.current);
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

  const clear = () => {
    strokesRef.current = [];
    setStrokes([]);
    drawing.current = null;
    setPending(null);
    setPreview(null);
    paintAll([]);
    onChange();
  };

  const submit = () => {
    if (!checkEnabled || busy.current || pending) return;
    busy.current = true;
    const open = drawing.current && drawing.current.length > 0 ? [drawing.current] : [];
    const all = [...strokesRef.current, ...open];
    const read = preview && open.length === 0 ? preview : readDrawing(all);
    setPreview(read);
    if (needsConfirm(read)) {
      setPending(read);
      busy.current = false;
      return;
    }
    // Unreadable is passed through; parents must not score it as wrong.
    onRead(read);
    window.setTimeout(() => {
      busy.current = false;
    }, 250);
  };

  const acceptPending = () => {
    if (!pending) return;
    const read = pending;
    setPending(null);
    onRead(read);
  };

  const rejectPending = () => {
    // "No" must never count as a wrong attempt — clear and let the child try again.
    setPending(null);
    clear();
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

  const previewLabel =
    preview && preview.status === 'ok'
      ? t('common:iSee', { digit: preview.digit })
      : preview && preview.status === 'unreadable'
        ? t('common:iSeeUnreadable')
        : '';

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      {prompt ? <p className="text-base text-muted-foreground">{prompt}</p> : null}
      <canvas
        ref={canvasRef}
        data-testid="number-draw-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={(event) => {
          if (drawing.current) finishStroke(event);
        }}
        className="w-[220px] h-[220px] max-w-full rounded-2xl bg-card border-2 border-border touch-none cursor-crosshair"
        style={{ touchAction: 'none' }}
        role="img"
        tabIndex={0}
        aria-label={t('common:drawNumber')}
      />
      <p
        className="text-3xl font-semibold min-h-[2.5rem] text-center"
        data-testid="number-draw-preview"
        dir="ltr"
        aria-live="polite"
      >
        {previewLabel}
      </p>
      {pending && (
        <div
          className="w-full rounded-2xl border-2 border-border bg-card p-4 text-center"
          data-testid="number-draw-confirm"
        >
          <p className="text-2xl font-semibold mb-1" dir="ltr">
            {t('common:iSee', { digit: pending.digit })}
          </p>
          <p className="text-2xl font-semibold mb-4" dir="ltr">
            {t('common:didYouWrite', { digit: pending.digit })}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" className="min-h-[56px] min-w-[96px] text-lg" onClick={acceptPending}>
              {t('common:yes')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[56px] min-w-[96px] text-lg"
              onClick={rejectPending}
            >
              {t('common:no')}
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" className="min-h-[44px]" onClick={clear} disabled={disabled}>
          {pending ? t('common:redraw') : t('common:clear')}
        </Button>
        <Button
          type="button"
          className="min-h-[44px]"
          onClick={submit}
          disabled={disabled || !checkEnabled || strokes.length === 0 || pending !== null}
          data-testid="number-draw-check"
        >
          {t('common:check')}
        </Button>
      </div>

      {onTyped && (
        <div className="w-full border-t border-border pt-3 mt-1" data-testid="number-draw-type-pad">
          <p className="text-sm font-medium mb-2 text-center">{t('common:typeIt')}</p>
          {showTypeHint && <p className="text-sm text-muted-foreground text-center mb-2">{t('common:typeHint')}</p>}
          <form
            className="flex gap-2 items-center justify-center"
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
                setTyped(event.target.value.replace(/[^\d]/g, '').slice(0, 3));
                onChange();
              }}
              aria-label={t('common:typeIt')}
              className="w-32 text-center text-3xl min-h-[64px] rounded-2xl bg-card border-2 border-border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Button type="submit" className="min-h-[48px]" disabled={disabled || typed.length === 0}>
              {t('common:check')}
            </Button>
          </form>
        </div>
      )}

      <p className="text-sm font-medium min-h-[1.25rem]" aria-live="polite">
        {message}
      </p>
      <p className="text-xs text-muted-foreground">{t('common:drawingStays')}</p>
    </div>
  );
};

export default NumberDraw;
