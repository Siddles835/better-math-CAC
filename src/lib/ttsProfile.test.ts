import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { isSunSpeechPath, setLessonVoiceProfile, getLessonVoiceProfile } from './speechProfile';
import { resolveSpeechProfile } from './ttsProfile';

const require = createRequire(import.meta.url);
const server = require('../../api/ttsProfile.cjs') as {
  resolveSpeechProfile: (profile?: string | null) => {
    id: string;
    voice: string;
    instructions: string;
  };
};

describe('speech profiles', () => {
  it('uses the same Sun and default voices on the server and in the app', () => {
    expect(server.resolveSpeechProfile('sun')).toEqual(resolveSpeechProfile('sun'));
    expect(server.resolveSpeechProfile('default')).toEqual(resolveSpeechProfile('default'));
    expect(server.resolveSpeechProfile(undefined)).toEqual(resolveSpeechProfile(undefined));
    expect(resolveSpeechProfile('sun').voice).toBe('onyx');
    expect(resolveSpeechProfile('default').voice).toBe('cedar');
  });

  it('treats every Sun page route as the Sun voice', () => {
    expect(isSunSpeechPath('/lesson/counting/sun')).toBe(true);
    expect(isSunSpeechPath('/play/foundations/sun')).toBe(true);
    expect(isSunSpeechPath('/play/c/class-curriculum/sun')).toBe(true);
    expect(isSunSpeechPath('/play/c/class-curriculum/sun-step-2')).toBe(true);
    expect(isSunSpeechPath('/lesson/counting/sun/')).toBe(true);
    expect(isSunSpeechPath('/lesson/counting/mercury')).toBe(false);
    expect(isSunSpeechPath('/teacher/ABC123')).toBe(false);
    expect(isSunSpeechPath('/settings')).toBe(false);
  });

  it('stores the lesson profile for speak()', () => {
    setLessonVoiceProfile('sun');
    expect(getLessonVoiceProfile()).toBe('sun');
    setLessonVoiceProfile('default');
    expect(getLessonVoiceProfile()).toBe('default');
  });
});
