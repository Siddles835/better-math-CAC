import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readDrawnDigit, type DigitRead } from '@/lib/cognition';
import type { Point, Stroke } from '@/lib/cognition/strokes';
import { useAccessibility } from '@/context/AccessibilityContext';

interface NumberDrawProps {
  prompt: string;
  expected?: number;
  disabled?: boolean;
  onRead: (read: DigitRead) => void;
}

/**
 * Write a number by drawing it — or, for anyone who cannot or would rather
 * not draw, by typing it. Both routes answer the same question and are
 * always available; the student's preferred method is offered first.
 */
const NumberDraw: React.FC<NumberDrawProps> = ({ prompt, expected, disabled, onRead }) => {
  const { prefs, announce } = useAccessibility();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [read, setRead] = useState<DigitRead | null>(null);
  const [typed, setTyped] = useState('');
  const [mode, setMode] = useState<'draw' | 'type'>(
    prefs.answerMethod === 'type' || prefs.answerMethod === 'choose' ? 'type' : 'draw'
  );

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const paint = (from: Point, to: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#e8eef8';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (!point) return;
    drawing.current = [point];
    setRead(null);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const prev = drawing.current[drawing.current.length - 1];
    drawing.current.push(point);
    paint(prev, point);
  };

  const onPointerUp = () => {
    if (drawing.current && drawing.current.length > 1) {
      setStrokes((prev) => [...prev, drawing.current as Stroke]);
    }
    drawing.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrokes([]);
    setRead(null);
    drawing.current = null;
  };

  const submit = () => {
    const pending = drawing.current && drawing.current.length > 1 ? [drawing.current] : [];
    const all = [...strokes, ...pending];
    const result = readDrawnDigit(all);
    if (!result) return;
    setRead(result);
    onRead(result);
    announce(`I read a ${result.digit}`);
  };

  const submitTyped = () => {
    const digit = Number.parseInt(typed, 10);
    if (Number.isNaN(digit)) return;
    // A typed answer is the same answer, just given another way.
    const result: DigitRead = {
      digit, confidence: 1, reversal: false, strokeCount: 0, startQuadrant: 0,
    };
    setRead(result);
    onRead(result);
    announce(`You answered ${digit}`);
  };

  const match = expected != null && read && read.digit === expected;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      {prompt ? <p className="text-base text-muted-foreground">{prompt}</p> : null}

      <div className="flex gap-2" role="group" aria-label="How to answer">
        <Button type="button" variant={mode === 'draw' ? 'default' : 'outline'}
          aria-pressed={mode === 'draw'} className="min-h-[44px]" onClick={() => setMode('draw')}>
          Draw it
        </Button>
        <Button type="button" variant={mode === 'type' ? 'default' : 'outline'}
          aria-pressed={mode === 'type'} className="min-h-[44px]" onClick={() => setMode('type')}>
          Type it
        </Button>
      </div>

      {mode === 'draw' ? (
        <>
          <canvas
            ref={canvasRef} width={220} height={220}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            className="w-[220px] h-[220px] rounded-2xl bg-card border-2 border-border touch-none cursor-crosshair"
            role="img" tabIndex={0}
            aria-label="Draw a number, or choose Type it instead"
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={clear} disabled={disabled}>
              Clear
            </Button>
            <Button type="button" className="min-h-[44px]" onClick={submit}
              disabled={disabled || strokes.length === 0}>
              Read my number
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 w-full">
          <label htmlFor="number-answer" className="text-sm text-muted-foreground">
            Type your number
          </label>
          <input
            id="number-answer" type="number" inputMode="numeric" value={typed} disabled={disabled}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitTyped(); }}
            className="w-32 text-center text-3xl min-h-[64px] rounded-2xl bg-card border-2 border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button type="button" className="min-h-[48px]" onClick={submitTyped}
            disabled={disabled || typed.trim() === ''}>
            That is my answer
          </Button>
        </div>
      )}

      {read && (
        <p className={`text-sm font-medium ${match ? 'text-success' : 'text-foreground'}`}>
          {/* A word carries the result too, never colour alone. */}
          {expected != null ? (match ? '✓ Correct — ' : '• Not yet — ') : ''}
          {read.strokeCount > 0 ? `I read a ${read.digit}` : `You answered ${read.digit}`}
          {expected != null ? ` (looking for ${expected})` : ''}
          {read.reversal ? ' — that stroke may be reversed' : ''}
          {read.strokeCount > 0 ? ` · ${Math.round(read.confidence * 100)}% sure` : ''}
        </p>
      )}

      <p data-secondary="true" className="text-xs text-muted-foreground">
        Your drawing stays on this device.
      </p>
    </div>
  );
};

export default NumberDraw;
