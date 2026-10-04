import { describe, expect, it } from 'vitest';
import {
  K2_SPEECH_PITCH,
  K2_SPEECH_RATE,
  normalizeSpeechText,
  pickVoice,
  scoreVoice,
} from './speech';

const voice = (
  name: string,
  lang: string,
  extras: Partial<SpeechSynthesisVoice> = {},
): SpeechSynthesisVoice =>
  ({
    name,
    lang,
    localService: true,
    default: false,
    voiceURI: name,
    ...extras,
  }) as SpeechSynthesisVoice;

describe('pickVoice', () => {
  it('prefers warm local voices over compact novelty voices', () => {
    const chosen = pickVoice('en', [
      voice('Bad News', 'en-US'),
      voice('Samantha', 'en-US'),
      voice('Compact English', 'en-US'),
    ]);
    expect(chosen?.name).toBe('Samantha');
  });

  it('prefers natural/neural quality labels when available', () => {
    const chosen = pickVoice('en', [
      voice('English United States', 'en-US'),
      voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US', {
        localService: false,
      }),
    ]);
    expect(chosen?.name).toMatch(/Aria/i);
  });

  it('matches locale prefixes for Spanish and Chinese', () => {
    expect(
      pickVoice('es', [voice('Google español de Estados Unidos', 'es-US'), voice('Samantha', 'en-US')])
        ?.lang,
    ).toBe('es-US');
    expect(
      pickVoice('zh-Hans', [voice('Ting-Ting', 'zh-CN'), voice('Samantha', 'en-US')])?.name,
    ).toBe('Ting-Ting');
  });

  it('returns null when no voice matches the language', () => {
    expect(pickVoice('hi', [voice('Samantha', 'en-US')])).toBeNull();
  });

  it('scores preferred locale matches higher', () => {
    const us = voice('English', 'en-US');
    const gb = voice('English', 'en-GB');
    expect(scoreVoice(us, 'en')).toBeGreaterThan(scoreVoice(gb, 'en'));
  });
});

describe('K–2 speech defaults', () => {
  it('uses a gentle rate and pitch', () => {
    expect(K2_SPEECH_RATE).toBeGreaterThan(0.85);
    expect(K2_SPEECH_RATE).toBeLessThan(1);
    expect(K2_SPEECH_PITCH).toBeGreaterThan(1);
    expect(K2_SPEECH_PITCH).toBeLessThan(1.15);
  });

  it('still normalizes math phrases for speech', () => {
    expect(normalizeSpeechText('2 + 3 = ?', 'en')).toContain('plus');
  });
});
