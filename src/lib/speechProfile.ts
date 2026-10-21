import type { SpeechProfileId } from '@/lib/ttsProfile';

let lessonVoiceProfile: SpeechProfileId = 'default';

/**
 * Sun lesson routes, including split curriculum pages such as sun-step-2.
 * Student lessons, teacher previews, and the iOS shell share these paths.
 */
export const isSunSpeechPath = (pathname: string): boolean => {
  const path = pathname.split('?')[0].split('#')[0];
  const segment = path.split('/').filter(Boolean).pop() ?? '';
  return segment === 'sun' || segment.startsWith('sun-');
};

export const setLessonVoiceProfile = (profile: SpeechProfileId) => {
  lessonVoiceProfile = profile === 'sun' ? 'sun' : 'default';
};

export const getLessonVoiceProfile = (): SpeechProfileId => lessonVoiceProfile;
