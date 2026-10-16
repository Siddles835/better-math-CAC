import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  K2_SPEECH_PITCH,
  K2_SPEECH_RATE,
  K2_SPEECH_RATE_SLOW,
  normalizeSpeechText,
  numberWord,
  packSpeechChunks,
  pickVoice,
  scoreVoice,
  setSpeechMuted,
  smoothProsodyText,
  speak,
  splitClauses,
  splitLongChunk,
  splitSentences,
  stopSpeaking,
  voiceQuality,
} from './speech';

const voice = (
  name: string,
  lang: string,
  extras: Partial<SpeechSynthesisVoice> = {}
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

  it('does not treat every Google or Microsoft voice as high quality', () => {
    const plainGoogle = voice('Google US English', 'en-US');
    const natural = voice('Microsoft Aria Online (Natural)', 'en-US', { localService: false });
    expect(scoreVoice(natural, 'en')).toBeGreaterThan(scoreVoice(plainGoogle, 'en'));
    expect(voiceQuality(plainGoogle)).toBe('standard');
    expect(voiceQuality(natural)).toBe('natural');
  });

  it('matches BCP-47 fallbacks for Spanish, Chinese, Hindi, Arabic', () => {
    expect(
      pickVoice('es', [voice('Google español de Estados Unidos', 'es-US'), voice('Samantha', 'en-US')])
        ?.lang
    ).toBe('es-US');
    expect(
      pickVoice('zh-Hans', [voice('Ting-Ting', 'zh-CN'), voice('Samantha', 'en-US')])?.name
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
    const chosen = pickVoice('en', [voice('Samantha', 'en-US'), voice('Karen', 'en-AU')], 'Karen');
    expect(chosen?.name).toBe('Karen');
  });
});

describe('K–2 speech defaults', () => {
  it('uses a gentle rate and warm pitch', () => {
    expect(K2_SPEECH_RATE).toBeCloseTo(0.86);
    expect(K2_SPEECH_RATE_SLOW).toBeCloseTo(0.76);
    expect(K2_SPEECH_PITCH).toBeCloseTo(1.04);
    expect(K2_SPEECH_PITCH).toBeLessThanOrEqual(1.1);
  });
});

describe('sentence splitting', () => {
  it('splits sentences on end punctuation', () => {
    expect(splitSentences('Hello. Count with me! Ready?')).toEqual([
      'Hello.',
      'Count with me!',
      'Ready?',
    ]);
  });

  it('does not split every comma into a new utterance', () => {
    expect(splitClauses('one, two, three')).toEqual(['one, two, three']);
  });

  it('splits only very long sentences', () => {
    const long = `${'word '.repeat(50)}end.`.trim();
    expect(splitLongChunk(long, 40).length).toBeGreaterThan(1);
  });

  it('packs short multi-sentence lines into one utterance', () => {
    const packed = packSpeechChunks('Hello. Count with me! Ready?');
    expect(packed).toHaveLength(1);
    expect(smoothProsodyText(packed[0])).toMatch(/Hello,/);
  });

  it('does not treat decimal periods as sentence ends after normalization', () => {
    const spoken = normalizeSpeechText('The answer is 3.5 today.', 'en');
    expect(spoken).toContain('point');
    expect(splitSentences(spoken).length).toBe(1);
  });
});

describe('number-to-word for all five languages', () => {
  it('converts numbers in English including large values', () => {
    expect(numberWord(7, 'en')).toBe('seven');
    expect(numberWord(21, 'en')).toBe('twenty-one');
    expect(numberWord(250, 'en')).toBe('two hundred fifty');
    expect(normalizeSpeechText('250 + 5', 'en')).toContain('two hundred fifty');
    expect(normalizeSpeechText('2 + 3 = ?', 'en')).toContain('plus');
    expect(normalizeSpeechText('⭐ 4 apples', 'en')).toBe('four apples');
  });

  it('reads ranges as to, not minus', () => {
    expect(normalizeSpeechText('Adding within 12–20', 'en')).toContain('to');
    expect(normalizeSpeechText('Adding within 12–20', 'en')).not.toContain('minus');
    expect(normalizeSpeechText('12-20', 'en')).toBe('twelve to twenty');
    expect(normalizeSpeechText('8 - 3', 'en')).toBe('eight minus three');
  });

  it('handles decimals and fractions', () => {
    expect(normalizeSpeechText('3.5', 'en')).toBe('three point five');
    expect(normalizeSpeechText('1/2', 'en')).toMatch(/half|over/);
  });

  it('converts numbers in Chinese', () => {
    expect(numberWord(7, 'zh-Hans')).toBe('七');
    expect(numberWord(12, 'zh-Hans')).toBe('十二');
    expect(normalizeSpeechText('2 + 3 = ?', 'zh-Hans')).toContain('加');
  });

  it('uses the full Hindi 0 to 100 table', () => {
    expect(numberWord(7, 'hi')).toBe('सात');
    expect(numberWord(21, 'hi')).toBe('इक्कीस');
    expect(numberWord(24, 'hi')).toBe('चौबीस');
    expect(normalizeSpeechText('2 + 3 = ?', 'hi')).toContain('जमा');
  });

  it('keeps Spanish accents on twenties', () => {
    expect(numberWord(7, 'es')).toBe('siete');
    expect(numberWord(22, 'es')).toBe('veintidós');
    expect(numberWord(23, 'es')).toBe('veintitrés');
    expect(numberWord(26, 'es')).toBe('veintiséis');
    expect(normalizeSpeechText('2 + 3 = ?', 'es')).toContain('más');
  });

  it('converts numbers in Arabic', () => {
    expect(numberWord(7, 'ar')).toBe('سبعة');
    expect(numberWord(21, 'ar')).toContain('عشرون');
    expect(normalizeSpeechText('2 + 3 = ?', 'ar')).toContain('زائد');
  });
});

describe('voice on/off and stale queue', () => {
  afterEach(() => {
    setSpeechMuted(false);
    stopSpeaking();
    vi.unstubAllGlobals();
    vi.useRealTimers();
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
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

  it('ignores stale callbacks after rapid back-to-back speak calls', async () => {
    vi.useFakeTimers();
    const utterances: Array<{
      onend: (() => void) | null;
      onerror: ((e: { error: string }) => void) | null;
      text: string;
      lang: string;
      voice: SpeechSynthesisVoice | null;
      rate: number;
      pitch: number;
    }> = [];
    class FakeUtterance {
      text: string;
      lang = '';
      voice: SpeechSynthesisVoice | null = null;
      rate = 1;
      pitch = 1;
      onend: (() => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    const speakFn = vi.fn((utterance: (typeof utterances)[number]) => {
      utterances.push(utterance);
    });
    const synthesis = {
      speaking: false,
      pending: false,
      cancel: vi.fn(() => {
        const previous = utterances[utterances.length - 1];
        // Chrome fires interrupted/canceled when cancel() runs; must not chain.
        previous?.onerror?.({ error: 'interrupted' });
        previous?.onend?.();
      }),
      speak: speakFn,
      getVoices: () => [voice('Samantha', 'en-US')],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      }))
    );
    vi.stubGlobal('speechSynthesis', synthesis);
    vi.stubGlobal('window', {
      ...globalThis,
      speechSynthesis: synthesis,
      SpeechSynthesisUtterance: FakeUtterance,
    });

    const flush = async () => {
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();
      await Promise.resolve();
    };

    const firstEnd = vi.fn();
    const secondEnd = vi.fn();
    speak('First sentence here.', { onEnd: firstEnd });
    await flush();
    const firstUtteranceCount = utterances.length;
    expect(firstUtteranceCount).toBeGreaterThan(0);

    speak('Second sentence here.', { onEnd: secondEnd });
    await flush();
    expect(utterances.length).toBeGreaterThan(firstUtteranceCount);

    // Completing the first (stale) utterance must not fire firstEnd.
    utterances[0]?.onend?.();
    expect(firstEnd).not.toHaveBeenCalled();

    // Completing the latest utterance fires only the second callback.
    utterances[utterances.length - 1]?.onend?.();
    expect(secondEnd).toHaveBeenCalled();
  });
});
