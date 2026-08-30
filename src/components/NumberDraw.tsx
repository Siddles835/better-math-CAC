import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { readDrawnDigit, type DigitRead } from '@/lib/cognition';
import type { Point, Stroke } from '@/lib/cognition/strokes';

interface NumberDrawProps {
  prompt: string;
  expected?: number;
  disabled?: boolean;
  onRead: (read: DigitRead) => void;
}

const NumberDraw: React.FC<NumberDrawProps> = ({ prompt, expected, disabled, onRead }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [read, setRead] = useState<DigitRead | null>(null);

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
  };

  const match = expected != null && read && read.digit === expected;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
      <p className="text-base text-muted-foreground">{prompt}</p>
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="w-[220px] h-[220px] rounded-2xl bg-card border-2 border-border touch-none cursor-crosshair"
        role="img"
        tabIndex={0}
        aria-label="Draw a number"
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" onClick={clear} disabled={disabled}>
          Clear
        </Button>
        <Button type="button" onClick={submit} disabled={disabled || strokes.length === 0}>
          Read my number
        </Button>
      </div>
      {read && (
        <p className={`text-sm font-medium ${match ? 'text-success' : 'text-foreground'}`}>
          I read a {read.digit}
          {expected != null ? ` (looking for ${expected})` : ''}
          {read.reversal ? ' — that stroke may be reversed' : ''}
          {' · '}
          {Math.round(read.confidence * 100)}% sure
        </p>
      )}
      <p className="text-xs text-muted-foreground">Your drawing stays on this device.</p>
    </div>
  );
};

export default NumberDraw;
