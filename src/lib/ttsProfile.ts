/**
 * Read-aloud profiles. Must match api/ttsProfile.cjs — ttsProfile.test.ts checks.
 * Sun pages use Onyx (traditional masculine General American). Everything else
 * uses Cedar. The server applies the same instructions, so student, teacher,
 * web, and the iOS shell hear the same voice.
 */

export type SpeechProfileId = 'default' | 'sun';

export const CEDAR_INSTRUCTIONS =
  'Speak as a warm, natural adult man with a relaxed everyday voice. ' +
  'Sound like a calm kindergarten teacher talking to one child. ' +
  'Use your normal speaking accent. Do not imitate or exaggerate any accent. ' +
  'Keep a steady, unhurried pace. Say each number clearly. ' +
  'Do not sound like a radio announcer or a deep movie-trailer voice.';

export const SUN_INSTRUCTIONS =
  'Speak as a traditional adult American man with a steady masculine voice, ' +
  'like a classic elementary school teacher. General American accent: rhotic R, ' +
  'American vowels, and “zee” for the letter Z. Clear and unhurried. ' +
  'Do not sound young, soft, British, Australian, or like a cartoon. ' +
  'Say each number crisply as a whole word.';

export interface SpeechProfile {
  id: SpeechProfileId;
  voice: 'cedar' | 'onyx';
  instructions: string;
}

const PROFILES: Record<SpeechProfileId, SpeechProfile> = {
  default: { id: 'default', voice: 'cedar', instructions: CEDAR_INSTRUCTIONS },
  sun: { id: 'sun', voice: 'onyx', instructions: SUN_INSTRUCTIONS },
};

export const resolveSpeechProfile = (profile?: string | null): SpeechProfile =>
  profile === 'sun' ? PROFILES.sun : PROFILES.default;
