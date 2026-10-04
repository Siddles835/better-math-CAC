import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  K2_SPEECH_PITCH,
  K2_SPEECH_RATE,
  K2_SPEECH_RATE_SLOW,
  normalizeSpeechText,
  numberWord,
  pickVoice,
  scoreVoice,
  setSpeechMuted,
  speak,
  splitClauses,
  splitSentences,
  stopSpeaking,
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

describe('pickVoice ranking', () => {
  it('prefers warm local voices over compact novelty voices', () => {
    const chosen = pickVoice('en', [
      voice('Bad News', 'en-US'),
      voice('Samantha', 'en-US'),
      voice('Compact English', 'en-US'),
    ]);
    expect(chosen?.name).toBe('Samantha');
  });

  it('prefers natural/neural/online quality over plain local', () => {
    const chosen = pickVoice('en', [
      voice('English United States', 'en-US'),
      voice('Microsoft Aria Online (Natural) - English (United States)', 'en-US', {
        localService: false,
      }),
    ]);
    expect(chosen?.name).toMatch(/Aria/i);
  });

  it('prefers enhanced/premium labels over robotic eSpeak-style voices', () => {
    const chosen = pickVoice('en', [
      voice('eSpeak English', 'en-US'),
      voice('Samantha (Enhanced)', 'en-US'),
    ]);
    expect(chosen?.name).toMatch(/Samantha/i);
  });

  it('matches BCP-47 fallbacks for Spanish, Chinese, Hindi, Arabic', () => {
    expect(
      pickVoice('es', [voice('Google español de Estados Unidos', 'es-US'), voice('Samantha', 'en-US')])
        ?.lang,
    ).toBe('es-US');
    expect(
      pickVoice('zh-Hans', [voice('Ting-Ting', 'zh-CN'), voice('Samantha', 'en-US')])?.name,
    ).toBe('Ting-Ting');
    expect(pickVoice('hi', [voice('Lekha', 'hi-IN'), voice('Samantha', 'en-US')])?.lang).toBe('hi-IN');
    expect(pickVoice('ar', [voice('Maged', 'ar-SA'), voice('Samantha', 'en-US')])?.lang).toBe('ar-SA');
  });

  it('returns null when no voice matches the language', () => {
    expect(pickVoice('hi', [voice('Samantha', 'en-US')])).toBeNull();
  });

  it('scores preferred locale matches higher', () => {
    const us = voice('English', 'en-US');
    const gb = voice('English', 'en-GB');
    expect(scoreVoice(us, 'en')).toBeGreaterThan(scoreVoice(gb, 'en'));
  });

  it('honours an explicit preferred voiceURI when present', () => {
    const chosen = pickVoice(
      'en',
      [voice('Samantha', 'en-US'), voice('Karen', 'en-AU')],
      'Karen',
    );
    expect(chosen?.name).toBe('Karen');
  });
});

describe('K–2 speech defaults', () => {
  it('uses a gentle rate and natural pitch', () => {
    expect(K2_SPEECH_RATE).toBeGreaterThanOrEqual(0.9);
    expect(K2_SPEECH_RATE).toBeLessThanOrEqual(0.95);
    expect(K2_SPEECH_RATE_SLOW).toBeLessThan(K2_SPEECH_RATE);
    expect(K2_SPEECH_PITCH).toBeCloseTo(1.0);
  });
});

describe('sentence and clause splitting', () => {
  it('splits sentences on end punctuation', () => {
    expect(splitSentences('Hello. Count with me! Ready?')).toEqual([
      'Hello.',
      'Count with me!',
      'Ready?',
    ]);
  });

  it('splits clauses on commas for slight pauses', () => {
    expect(splitClauses('one, two, three')).toEqual(['one,', 'two,', 'three']);
  });
});

describe('number-to-word for all five languages', () => {
  it('converts numbers in English', () => {
    expect(numberWord(7, 'en')).toBe('seven');
    expect(numberWord(21, 'en')).toBe('twenty-one');
    expect(normalizeSpeechText('2 + 3 = ?', 'en')).toContain('plus');
    expect(normalizeSpeechText('⭐ 4 apples', 'en')).toBe('four apples');
  });

  it('converts numbers in Chinese', () => {
    expect(numberWord(7, 'zh-Hans')).toBe('七');
    expect(numberWord(12, 'zh-Hans')).toBe('十二');
    expect(normalizeSpeechText('2 + 3 = ?', 'zh-Hans')).toContain('加');
  });

  it('converts numbers in Hindi', () => {
    expect(numberWord(7, 'hi')).toBe('सात');
    expect(numberWord(21, 'hi')).toContain('एक');
    expect(normalizeSpeechText('2 + 3 = ?', 'hi')).toContain('जमा');
  });

  it('converts numbers in Spanish', () => {
    expect(numberWord(7, 'es')).toBe('siete');
    expect(numberWord(21, 'es')).toContain('veinti');
    expect(normalizeSpeechText('2 + 3 = ?', 'es')).toContain('más');
  });

  it('converts numbers in Arabic', () => {
    expect(numberWord(7, 'ar')).toBe('سبعة');
    expect(numberWord(21, 'ar')).toContain('عشرون');
    expect(normalizeSpeechText('2 + 3 = ?', 'ar')).toContain('زائد');
  });
});

describe('voice on/off blocks and stops speech', () => {
  afterEach(() => {
    setSpeechMuted(false);
    stopSpeaking();
    vi.unstubAllGlobals();
  });

  it('returns muted and does not speak when voice is off', () => {
    const speakFn = vi.fn();
    vi.stubGlobal('speechSynthesis', {
      speaking: false,
      pending: false,
      cancel: vi.fn(),
      speak: speakFn,
      getVoices: () => [voice('Samantha', 'en-US')],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    setSpeechMuted(true);
    expect(speak('Hello there')).toBe('muted');
    expect(speakFn).not.toHaveBeenCalled();
  });

  it('stopSpeaking cancels synthesis', () => {
    const cancel = vi.fn();
    const synthesis = {
      speaking: true,
      pending: false,
      cancel,
      speak: vi.fn(),
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal('window', { ...globalThis, speechSynthesis: synthesis });
    stopSpeaking();
    expect(cancel).toHaveBeenCalled();
  });
});
