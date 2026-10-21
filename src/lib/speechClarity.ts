/**
 * Make spoken audio easier to hear in classrooms:
 * full volume + a light speech-band presence boost (Web Audio when available).
 */

let clarityCtx: AudioContext | null = null;

const getClarityContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!clarityCtx) clarityCtx = new AC();
  return clarityCtx;
};

/** Resume the shared clarity graph after a user gesture (iOS / autoplay policies). */
export const unlockSpeechClarity = (): void => {
  const ctx = getClarityContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }
};

/**
 * Route an HTMLAudioElement through a clarity EQ so consonants and numbers
 * cut through phone/tablet speakers. Falls back to plain full-volume playback.
 */
export const prepareClearPlayback = (audio: HTMLAudioElement): void => {
  audio.volume = 1;
  try {
    // Prefer keeping pitch when any caller sets playbackRate.
    if ('preservesPitch' in audio) {
      (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
    }
  } catch {
    /* ignore */
  }

  const marked = audio as HTMLAudioElement & { __mathliftClarity?: boolean };
  if (marked.__mathliftClarity) return;

  try {
    const ctx = getClarityContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const source = ctx.createMediaElementSource(audio);

    // Drop rumble that muddies little speakers.
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 90;
    highpass.Q.value = 0.7;

    // Speech intelligibility band (~2–4 kHz).
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2800;
    presence.Q.value = 0.85;
    presence.gain.value = 6.5;

    // Slight air / consonant lift.
    const air = ctx.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = 5500;
    air.gain.value = 3.5;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 16;
    compressor.ratio.value = 2.8;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;

    // Gentle makeup so the compressor does not make speech quieter.
    const makeup = ctx.createGain();
    makeup.gain.value = 1.35;

    source.connect(highpass);
    highpass.connect(presence);
    presence.connect(air);
    air.connect(compressor);
    compressor.connect(makeup);
    makeup.connect(ctx.destination);

    marked.__mathliftClarity = true;
  } catch {
    // Plain HTMLAudio playback if Web Audio wiring fails.
  }
};
