/**
 * Shared read-aloud profiles for /api/tts.
 * Keep in sync with src/lib/ttsProfile.ts (a unit test checks they match).
 *
 * Sun pages use one traditional masculine voice on every student and teacher
 * screen. Other pages stay on Cedar. The server owns the instructions so a
 * browser, the iOS shell, and a teacher preview cannot drift apart.
 */

const CEDAR_INSTRUCTIONS =
  'Speak as a warm, natural adult man with a relaxed everyday voice. ' +
  'Sound like a calm kindergarten teacher talking to one child. ' +
  'Use your normal speaking accent. Do not imitate or exaggerate any accent. ' +
  'Keep a steady, unhurried pace. Say each number clearly. ' +
  'Do not sound like a radio announcer or a deep movie-trailer voice.';

const SUN_INSTRUCTIONS =
  'Speak as a traditional adult American man with a steady masculine voice, ' +
  'like a classic elementary school teacher. General American accent: rhotic R, ' +
  'American vowels, and “zee” for the letter Z. Clear and unhurried. ' +
  'Do not sound young, soft, British, Australian, or like a cartoon. ' +
  'Say each number crisply as a whole word.';

const PROFILES = {
  default: { id: 'default', voice: 'cedar', instructions: CEDAR_INSTRUCTIONS },
  sun: { id: 'sun', voice: 'onyx', instructions: SUN_INSTRUCTIONS },
};

function resolveSpeechProfile(profile) {
  return profile === 'sun' ? PROFILES.sun : PROFILES.default;
}

module.exports = { PROFILES, resolveSpeechProfile };
