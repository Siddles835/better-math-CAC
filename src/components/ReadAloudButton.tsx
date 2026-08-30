import React, { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { speak, stopSpeaking, isSpeechSupported } from '@/lib/speech';

interface ReadAloudButtonProps {
  /** The text to read aloud when tapped. */
  text: string;
  className?: string;
  /** Speak once when the button appears (label can then say "again"). */
  autoPlay?: boolean;
  /** Called the first time speech actually starts (tap or autoplay). */
  onPlayed?: () => void;
}

/**
 * Kid-sized speaker button that reads the given text aloud.
 * Stops speech automatically when the text changes or the button unmounts.
 */
const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  text,
  className = '',
  autoPlay = false,
  onPlayed,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playedRef = useRef(false);
  const onPlayedRef = useRef(onPlayed);
  onPlayedRef.current = onPlayed;

  const clearSafety = () => {
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
  };

  const markPlayed = () => {
    if (!playedRef.current) {
      playedRef.current = true;
      onPlayedRef.current?.();
    }
  };

  const queueSpeech = () => {
    const queued = speak(text, {
      onEnd: () => {
        clearSafety();
        setIsSpeaking(false);
      },
    });
    if (!queued) {
      setIsSpeaking(false);
      return false;
    }
    setIsSpeaking(true);
    markPlayed();
    clearSafety();
    safetyTimer.current = setTimeout(() => setIsSpeaking(false), 30000);
    return true;
  };

  useEffect(() => {
    setIsSpeaking(false);
    playedRef.current = false;
    clearSafety();
    stopSpeaking();
  }, [text]);

  useEffect(() => {
    if (!autoPlay || !isSpeechSupported()) return;
    queueSpeech();
    return () => {
      clearSafety();
      stopSpeaking();
    };
    // Auto-play only when this instance first appears with this text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text]);

  useEffect(
    () => () => {
      clearSafety();
      stopSpeaking();
    },
    []
  );

  if (!isSpeechSupported()) return null;

  const handleClick = () => {
    if (isSpeaking) {
      clearSafety();
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    queueSpeech();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
      className={`inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-card text-primary shadow-sm transition-all duration-200 hover:bg-primary/10 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer touch-manipulation ${
        isSpeaking ? 'bg-primary/15 ring-2 ring-primary/40 animate-pulse' : ''
      } ${className}`}
    >
      <Volume2 className="w-6 h-6" />
    </button>
  );
};

export default ReadAloudButton;
