import { tx } from '@/i18n/tx';
import { useRef, useState, type PointerEvent } from 'react';
import type { Stroke } from '@/lib/cognition/strokes';

interface Sample {
  digit: number;
  script: 'western' | 'arabic' | 'devanagari';
  strokes: Stroke[];
}

/** Dev-only collector. Strokes stay in this browser until you download the file. */
const DigitCollectPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [digit, setDigit] = useState(0);
  const [script, setScript] = useState<Sample['script']>('western');
  const [samples, setSamples] = useState<Sample[]>([]);

  const paint = (next: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    for (const stroke of next) {
      ctx.beginPath();
      stroke.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
  };

  const pointOf = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{tx('ui:s_9045455f66')}</h1>
      <p className="text-sm mb-4">{tx('ui:s_89a43d24af')}</p>
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="border border-black touch-none bg-white"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          current.current = [pointOf(event)];
        }}
        onPointerMove={(event) => {
          if (!current.current) return;
          current.current.push(pointOf(event));
          paint([...strokes, current.current]);
        }}
        onPointerUp={() => {
          if (!current.current) return;
          const next = [...strokes, current.current];
          current.current = null;
          setStrokes(next);
          paint(next);
        }}
      />
      <div className="flex flex-wrap gap-2 my-4">
        <label>{tx('ui:s_2f093cef7e')}<input className="ms-2 w-16 border px-2" type="number" min={0} max={9} value={digit} onChange={(event) => setDigit(Number(event.target.value))} />
        </label>
        <label>{tx('ui:s_ee6d6afa9f')}<select className="ms-2 border px-2" value={script} onChange={(event) => setScript(event.target.value as Sample['script'])}>
            <option value="western">western</option>
            <option value="arabic">arabic</option>
            <option value="devanagari">devanagari</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button type="button" className="border px-3 py-2" onClick={() => { setStrokes([]); paint([]); }}>{tx('ui:s_719ea396ad')}</button>
        <button
          type="button"
          className="border px-3 py-2"
          onClick={() => {
            if (strokes.length === 0) return;
            setSamples((prev) => [...prev, { digit, script, strokes }]);
            setStrokes([]);
            paint([]);
          }}
        >
          Save sample ({samples.length})
        </button>
        <button
          type="button"
          className="border px-3 py-2"
          onClick={() => {
            const blob = new Blob([JSON.stringify({ samples }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'digits.json';
            link.click();
            URL.revokeObjectURL(url);
          }}
        >{tx('ui:s_d296a30a06')}</button>
      </div>
    </main>
  );
};

export default DigitCollectPage;
