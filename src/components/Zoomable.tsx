import React, { useEffect, useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 3;

interface GestureEventLike extends Event {
  scale: number;
  clientX: number;
  clientY: number;
}

interface ZoomableProps {
  children: React.ReactNode;
  className?: string;
  /** Change this when the lesson step changes so zoom resets. */
  resetKey?: string | number;
}

/**
 * Pinch-to-zoom for lesson visuals (App Store Guideline 4.2).
 * iOS WKWebView will not pinch-zoom a page that is already a vertical scroller
 * (`touch-action: pan-y`), which is why only short "Great job" pages zoomed.
 * This listens for iOS gesture events (and a two-finger pointer fallback) and
 * scales the content in place.
 */
const Zoomable: React.FC<ZoomableProps> = ({ children, className = '', resetKey }) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const startScaleRef = useRef(1);
  const pointerIds = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistance = useRef(0);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const applyScale = (next: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    scaleRef.current = clamped;
    setScale(clamped);
  };

  const setOriginFromPoint = (clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setOrigin({
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    });
  };

  useEffect(() => {
    scaleRef.current = 1;
    startScaleRef.current = 1;
    setScale(1);
    setOrigin({ x: 50, y: 50 });
  }, [resetKey]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onGestureStart = (event: Event) => {
      event.preventDefault();
      const ge = event as GestureEventLike;
      startScaleRef.current = scaleRef.current;
      setOriginFromPoint(ge.clientX, ge.clientY);
    };

    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const ge = event as GestureEventLike;
      applyScale(startScaleRef.current * (ge.scale || 1));
    };

    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      startScaleRef.current = scaleRef.current;
    };

    const distance = () => {
      const pts = [...pointerIds.current.values()];
      if (pts.length < 2) return 0;
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      return Math.hypot(dx, dy);
    };

    const midpoint = () => {
      const pts = [...pointerIds.current.values()];
      if (pts.length < 2) return null;
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    };

    const onPointerDown = (event: PointerEvent) => {
      pointerIds.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointerIds.current.size === 2) {
        pinchStartDistance.current = distance();
        startScaleRef.current = scaleRef.current;
        const mid = midpoint();
        if (mid) setOriginFromPoint(mid.x, mid.y);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerIds.current.has(event.pointerId)) return;
      pointerIds.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointerIds.current.size === 2 && pinchStartDistance.current > 0) {
        event.preventDefault();
        applyScale(startScaleRef.current * (distance() / pinchStartDistance.current));
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      pointerIds.current.delete(event.pointerId);
      if (pointerIds.current.size < 2) {
        pinchStartDistance.current = 0;
        startScaleRef.current = scaleRef.current;
      }
    };

    el.addEventListener('gesturestart', onGestureStart, { passive: false, capture: true });
    el.addEventListener('gesturechange', onGestureChange, { passive: false, capture: true });
    el.addEventListener('gestureend', onGestureEnd, { passive: false, capture: true });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    return () => {
      el.removeEventListener('gesturestart', onGestureStart, true);
      el.removeEventListener('gesturechange', onGestureChange, true);
      el.removeEventListener('gestureend', onGestureEnd, true);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return (
    <div className="relative min-h-full">
      {scale > 1.05 && (
        <button
          type="button"
          onClick={() => applyScale(1)}
          className="sticky top-2 z-20 ml-auto mb-2 mr-1 min-h-[44px] px-3 rounded-full bg-card/95 border border-border text-sm font-semibold shadow-sm block"
        >
          Reset zoom
        </button>
      )}
      <div
        ref={stageRef}
        className={`origin-center will-change-transform ${className}`}
        style={{
          touchAction: 'pan-x pan-y pinch-zoom',
          transform: `scale(${scale})`,
          transformOrigin: `${origin.x}% ${origin.y}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Zoomable;
