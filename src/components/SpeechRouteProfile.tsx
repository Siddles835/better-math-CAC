import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getLessonVoiceProfile, isSunSpeechPath, setLessonVoiceProfile } from '@/lib/speechProfile';
import { stopSpeaking } from '@/lib/speech';

/**
 * Picks the Sun voice from the URL so every Sun page — student lesson,
 * teacher preview, demo, and the native shell — uses the same profile.
 */
const SpeechRouteProfile = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const next = isSunSpeechPath(pathname) ? 'sun' : 'default';
    if (getLessonVoiceProfile() !== next) {
      setLessonVoiceProfile(next);
      stopSpeaking();
      return;
    }
    setLessonVoiceProfile(next);
  }, [pathname]);

  return null;
};

export default SpeechRouteProfile;
