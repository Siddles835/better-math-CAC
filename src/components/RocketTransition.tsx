import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { useAccessibility } from '@/context/AccessibilityContext';

/** Match .animate-rocket-fly duration — clear as soon as the hop finishes. */
export const ROCKET_FLIGHT_MS = 1800;
/** Calm / reduce-motion: brief centered flash, never a long blank sky. */
export const ROCKET_REDUCED_MS = 450;
/** Navigate mid-hop so the lesson is ready under the cover. */
export const ROCKET_NAVIGATE_MS = 700;

const RocketTransition: React.FC = () => {
  const { showRocketTransition, rocketNonce, setShowRocketTransition } = useGame();
  const { prefs } = useAccessibility();
  const location = useLocation();
  const [stars, setStars] = useState<{ x: number; y: number; size: number; delay: number }[]>([]);
  const reduceMotion = prefs.reduceMotion || prefs.calmBackground;

  useEffect(() => {
    const generatedStars = Array.from({ length: 48 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2,
    }));
    setStars(generatedStars);
  }, []);

  // rocketNonce forces a timer restart even when showRocketTransition stays true.
  useEffect(() => {
    if (!showRocketTransition || rocketNonce === 0) return;
    const ms = reduceMotion ? ROCKET_REDUCED_MS : ROCKET_FLIGHT_MS;
    const timer = window.setTimeout(() => {
      setShowRocketTransition(false);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [showRocketTransition, rocketNonce, reduceMotion, setShowRocketTransition]);

  // Abandoned flight (Settings / Home): drop the cover so the page is usable.
  // Lesson routes keep the mid-flight overlay until the timer ends.
  useEffect(() => {
    if (!showRocketTransition) return;
    if (location.pathname.startsWith('/lesson/')) return;
    // Still on the hub when the flight starts — only clear when leaving for a
    // non-lesson route (e.g. Settings), not on the initial /planets render.
    if (location.pathname === '/planets' || location.pathname === '/solar-system') return;
    setShowRocketTransition(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear only on route change
  }, [location.pathname]);

  if (!showRocketTransition) return null;

  return (
    <div
      className="rocket-transition-root fixed inset-0 z-50 overflow-hidden"
      data-testid="rocket-transition"
      aria-hidden
      style={{
        background:
          'linear-gradient(135deg, hsl(230 30% 8%) 0%, hsl(240 25% 12%) 40%, hsl(260 20% 15%) 100%)',
      }}
    >
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: `hsl(45 70% ${65 + (i % 3) * 10}%)`,
            opacity: 0.55,
          }}
        />
      ))}

      {!reduceMotion && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`streak-${i}`}
              className="absolute h-[2px] bg-gradient-to-r from-transparent via-white/35 to-transparent"
              style={{
                top: `${12 + i * 8}%`,
                left: '-100%',
                width: '90px',
                animation: `star-drift 2.2s linear infinite`,
                animationDelay: `${i * 0.25}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={
          reduceMotion
            ? 'rocket-fly-static absolute'
            : 'animate-rocket-fly absolute'
        }
        style={{ top: '42%' }}
      >
        <svg width="320" height="208" viewBox="0 0 100 60" fill="none" aria-hidden>
          <ellipse cx="8" cy="30" rx="14" ry="10" fill="hsl(30 80% 55%)" opacity="0.6" />
          <ellipse cx="5" cy="30" rx="10" ry="7" fill="hsl(40 90% 65%)" opacity="0.7" />
          <ellipse cx="3" cy="30" rx="6" ry="4" fill="hsl(50 95% 75%)" opacity="0.9" />
          <ellipse cx="50" cy="30" rx="35" ry="14" fill="hsl(var(--rocket))" />
          <path
            d="M85 30 L100 30 Q95 20 85 16 L85 30 Q95 20 85 44 L100 30"
            fill="hsl(0 50% 55%)"
          />
          <path d="M85 16 Q95 20 100 30 Q95 40 85 44" fill="hsl(0 55% 60%)" />
          <circle cx="60" cy="30" r="8" fill="hsl(200 60% 80%)" />
          <circle cx="60" cy="30" r="5" fill="hsl(200 70% 90%)" />
          <path d="M20 16 L30 5 L35 16" fill="hsl(0 50% 50%)" />
          <path d="M20 44 L30 55 L35 44" fill="hsl(0 50% 50%)" />
          <rect x="40" y="26" width="20" height="8" rx="2" fill="hsl(var(--rocket))" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
};

export default RocketTransition;
