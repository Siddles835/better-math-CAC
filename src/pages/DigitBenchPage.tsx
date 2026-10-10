import { useCallback, useEffect, useRef, useState } from 'react';
import { needsConfirm, readDrawing } from '@/lib/cognition';
import type { DigitRead } from '@/lib/cognition';
import type { Point, Stroke } from '@/lib/cognition/strokes';

/**
 * locale-check-ignore: dev-only Playwright harness, not learner-facing copy.
 * Exposes window.__digitBench so tests can clear, inspect strokes, and read.
 */
const DigitBenchPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [lastRead, setLastRead] = useState<DigitRead | null>(null);

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
    const box = contentBox();
    if (!box) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bitmapW = Math.round(box.width * dpr);
    const bitmapH = Math.round(box.height * dpr);
    if (canvas.width !== bitmapW || canvas.height !== bitmapH) {
      canvas.width = bitmapW;
      canvas.height = bitmapH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of next) {
      if (stroke.length < 1) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      if (stroke.length === 1) {
        ctx.lineTo(stroke[0].x + 0.01, stroke[0].y + 0.01);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    paintAll(strokesRef.current);
  }, [paintAll, strokes]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const box = contentBox();
    if (!box) return null;
    const x = event.clientX - box.rect.left - box.left;
    const y = event.clientY - box.rect.top - box.top;
    return {
      x: Math.min(box.width, Math.max(0, x)),
      y: Math.min(box.height, Math.max(0, y)),
    };
  };

  const commitStroke = (stroke: Stroke) => {
    if (stroke.length === 0) return;
    const normalized = stroke.length === 1 ? [stroke[0], { x: stroke[0].x + 0.5, y: stroke[0].y + 0.5 }] : stroke;
    const next = [...strokesRef.current, normalized];
    strokesRef.current = next;
    setStrokes(next);
    setLastRead(null);
  };

  const clear = () => {
    strokesRef.current = [];
    drawing.current = null;
    setStrokes([]);
    setLastRead(null);
    paintAll([]);
  };

  const evaluate = (): DigitRead => {
    const open = drawing.current && drawing.current.length > 0 ? [drawing.current] : [];
    const all = [...strokesRef.current, ...open];
    const read = readDrawing(all);
    setLastRead(read);
    return read;
  };

  useEffect(() => {
    const api = {
      clear,
      evaluate,
      getStrokes: () => strokesRef.current,
      needsConfirm,
      canvasSize: () => {
        const box = contentBox();
        return box ? { width: box.width, height: box.height } : { width: 360, height: 360 };
      },
    };
    (window as unknown as { __digitBench: typeof api }).__digitBench = api;
    return () => {
      delete (window as unknown as { __digitBench?: typeof api }).__digitBench;
    };
  });

  return (
    <main className="min-h-screen bg-white text-black p-4" data-testid="digit-bench">
      <h1 className="text-xl font-semibold mb-2">Digit bench</h1>
      <canvas
        ref={canvasRef}
        data-testid="digit-bench-canvas"
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          const point = pointFromEvent(event);
          if (!point) return;
          drawing.current = [point];
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const point = pointFromEvent(event);
          if (!point) return;
          drawing.current.push(point);
          paintAll([...strokesRef.current, drawing.current]);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          const stroke = drawing.current;
          drawing.current = null;
          if (stroke) commitStroke(stroke);
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          const stroke = drawing.current;
          drawing.current = null;
          if (stroke) commitStroke(stroke);
        }}
        onPointerLeave={(event) => {
          if (!drawing.current) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          const stroke = drawing.current;
          drawing.current = null;
          if (stroke) commitStroke(stroke);
        }}
        className="w-[360px] h-[360px] max-w-full border-2 border-black touch-none bg-white"
        style={{ touchAction: 'none', width: 360, height: 360 }}
      />
      <p data-testid="digit-bench-stroke-count">strokes: {strokes.length}</p>
      <p data-testid="digit-bench-last-read">
        {lastRead
          ? `status=${lastRead.status} digit=${lastRead.digit} conf=${lastRead.confidence.toFixed(3)}`
          : 'no read'}
      </p>
      <button type="button" data-testid="digit-bench-clear" onClick={clear}>
        Clear
      </button>
      <button type="button" data-testid="digit-bench-eval" onClick={() => evaluate()}>
        Evaluate
      </button>
    </main>
  );
};

export default DigitBenchPage;
