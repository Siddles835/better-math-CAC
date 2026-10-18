import type { AccessibilityPrefs } from '@/lib/accessibility';
import { withLowVision } from '@/lib/accessibility';

/** Learner needs mapped to recommended preference patches and feature ids. */
export type AccommodationNeed =
  | 'dyscalculia'
  | 'adhd'
  | 'autism'
  | 'dyslexia'
  | 'speech'
  | 'hearing'
  | 'lowVision'
  | 'intellectual'
  | 'anxiety'
  | 'sensory';

export const ACCOMMODATION_NEEDS: AccommodationNeed[] = [
  'dyscalculia',
  'adhd',
  'autism',
  'dyslexia',
  'speech',
  'hearing',
  'lowVision',
  'intellectual',
  'anxiety',
  'sensory',
];

export type AccommodationFeatureId =
  | 'summaryFirst'
  | 'workedExampleFirst'
  | 'soundAsText'
  | 'colorSafeLabels'
  | 'calmBackground'
  | 'reduceMotion'
  | 'muteSounds'
  | 'focusMode'
  | 'dyslexiaFont'
  | 'easyReadSpacing'
  | 'textSizeLarge'
  | 'biggerButtons'
  | 'breaks'
  | 'relaxedPacing'
  | 'autoReadAloud'
  | 'slowSpeech'
  | 'highContrast';

export interface AccommodationPreset {
  need: AccommodationNeed;
  /** Preference patches to apply. Never locks further edits. */
  prefs: Partial<AccessibilityPrefs>;
  featureIds: AccommodationFeatureId[];
  /** i18n key under teacher namespace explaining the need. */
  explainKey: string;
  labelKey: string;
}

export const ACCOMMODATION_FEATURES: Record<
  AccommodationFeatureId,
  { prefKey?: keyof AccessibilityPrefs; describeKey: string; labelKey: string }
> = {
  summaryFirst: { prefKey: 'summaryFirst', describeKey: 'acc_feat_summaryFirst_help', labelKey: 'acc_feat_summaryFirst' },
  workedExampleFirst: {
    prefKey: 'workedExampleFirst',
    describeKey: 'acc_feat_workedExampleFirst_help',
    labelKey: 'acc_feat_workedExampleFirst',
  },
  soundAsText: { prefKey: 'soundAsText', describeKey: 'acc_feat_soundAsText_help', labelKey: 'acc_feat_soundAsText' },
  colorSafeLabels: {
    prefKey: 'colorSafeLabels',
    describeKey: 'acc_feat_colorSafeLabels_help',
    labelKey: 'acc_feat_colorSafeLabels',
  },
  calmBackground: { prefKey: 'calmBackground', describeKey: 'acc_feat_calm_help', labelKey: 'acc_feat_calm' },
  reduceMotion: { prefKey: 'reduceMotion', describeKey: 'acc_feat_reduceMotion_help', labelKey: 'acc_feat_reduceMotion' },
  muteSounds: { prefKey: 'muteSounds', describeKey: 'acc_feat_muteSounds_help', labelKey: 'acc_feat_muteSounds' },
  focusMode: { prefKey: 'focusMode', describeKey: 'acc_feat_focus_help', labelKey: 'acc_feat_focus' },
  dyslexiaFont: { prefKey: 'dyslexiaFont', describeKey: 'acc_feat_dyslexiaFont_help', labelKey: 'acc_feat_dyslexiaFont' },
  easyReadSpacing: {
    prefKey: 'easyReadSpacing',
    describeKey: 'acc_feat_easyRead_help',
    labelKey: 'acc_feat_easyRead',
  },
  textSizeLarge: { describeKey: 'acc_feat_textSize_help', labelKey: 'acc_feat_textSize' },
  biggerButtons: { prefKey: 'biggerButtons', describeKey: 'acc_feat_bigger_help', labelKey: 'acc_feat_bigger' },
  breaks: { prefKey: 'breaks', describeKey: 'acc_feat_breaks_help', labelKey: 'acc_feat_breaks' },
  relaxedPacing: { describeKey: 'acc_feat_relaxed_help', labelKey: 'acc_feat_relaxed' },
  autoReadAloud: { prefKey: 'autoReadAloud', describeKey: 'acc_feat_autoRead_help', labelKey: 'acc_feat_autoRead' },
  slowSpeech: { describeKey: 'acc_feat_slowSpeech_help', labelKey: 'acc_feat_slowSpeech' },
  highContrast: { describeKey: 'acc_feat_contrast_help', labelKey: 'acc_feat_contrast' },
};

export const ACCOMMODATION_MATRIX: Record<AccommodationNeed, AccommodationPreset> = {
  dyscalculia: {
    need: 'dyscalculia',
    labelKey: 'acc_need_dyscalculia',
    explainKey: 'acc_need_dyscalculia_help',
    prefs: {
      summaryFirst: true,
      workedExampleFirst: true,
      focusMode: true,
      pacing: 'relaxed',
      colorSafeLabels: true,
    },
    featureIds: ['summaryFirst', 'workedExampleFirst', 'focusMode', 'relaxedPacing', 'colorSafeLabels'],
  },
  adhd: {
    need: 'adhd',
    labelKey: 'acc_need_adhd',
    explainKey: 'acc_need_adhd_help',
    prefs: {
      focusMode: true,
      calmBackground: true,
      reduceMotion: true,
      muteSounds: true,
      breaks: true,
      pacing: 'relaxed',
    },
    featureIds: ['focusMode', 'calmBackground', 'reduceMotion', 'muteSounds', 'breaks', 'relaxedPacing'],
  },
  autism: {
    need: 'autism',
    labelKey: 'acc_need_autism',
    explainKey: 'acc_need_autism_help',
    prefs: {
      calmBackground: true,
      reduceMotion: true,
      muteSounds: true,
      focusMode: true,
      displayStyle: 'minimal',
      soundAsText: true,
    },
    featureIds: ['calmBackground', 'reduceMotion', 'muteSounds', 'focusMode', 'soundAsText'],
  },
  dyslexia: {
    need: 'dyslexia',
    labelKey: 'acc_need_dyslexia',
    explainKey: 'acc_need_dyslexia_help',
    prefs: {
      dyslexiaFont: true,
      easyReadSpacing: true,
      textSize: 'large',
      summaryFirst: true,
      workedExampleFirst: true,
      autoReadAloud: true,
    },
    featureIds: [
      'dyslexiaFont',
      'easyReadSpacing',
      'textSizeLarge',
      'summaryFirst',
      'workedExampleFirst',
      'autoReadAloud',
    ],
  },
  speech: {
    need: 'speech',
    labelKey: 'acc_need_speech',
    explainKey: 'acc_need_speech_help',
    prefs: {
      speechRate: 'slow',
      autoReadAloud: false,
      soundAsText: true,
      answerMethod: 'choose',
    },
    featureIds: ['slowSpeech', 'soundAsText'],
  },
  hearing: {
    need: 'hearing',
    labelKey: 'acc_need_hearing',
    explainKey: 'acc_need_hearing_help',
    prefs: {
      soundAsText: true,
      muteSounds: true,
      voiceEnabled: false,
      colorSafeLabels: true,
    },
    featureIds: ['soundAsText', 'muteSounds', 'colorSafeLabels'],
  },
  lowVision: {
    need: 'lowVision',
    labelKey: 'acc_need_lowVision',
    explainKey: 'acc_need_lowVision_help',
    // Visual colour + landscape overrides are gated by `lowVision` in applyPrefsToDocument.
    prefs: {
      lowVision: true,
      textSize: 'xlarge',
      colorTheme: 'contrast',
      highContrast: true,
      biggerButtons: true,
      colorSafeLabels: true,
      autoReadAloud: true,
    },
    featureIds: ['textSizeLarge', 'highContrast', 'biggerButtons', 'colorSafeLabels', 'autoReadAloud'],
  },
  intellectual: {
    need: 'intellectual',
    labelKey: 'acc_need_intellectual',
    explainKey: 'acc_need_intellectual_help',
    prefs: {
      summaryFirst: true,
      workedExampleFirst: true,
      pacing: 'relaxed',
      textSize: 'large',
      biggerButtons: true,
      breaks: true,
    },
    featureIds: [
      'summaryFirst',
      'workedExampleFirst',
      'relaxedPacing',
      'textSizeLarge',
      'biggerButtons',
      'breaks',
    ],
  },
  anxiety: {
    need: 'anxiety',
    labelKey: 'acc_need_anxiety',
    explainKey: 'acc_need_anxiety_help',
    prefs: {
      calmBackground: true,
      reduceMotion: true,
      muteSounds: true,
      breaks: true,
      pacing: 'relaxed',
      workedExampleFirst: true,
    },
    featureIds: ['calmBackground', 'reduceMotion', 'muteSounds', 'breaks', 'relaxedPacing', 'workedExampleFirst'],
  },
  sensory: {
    need: 'sensory',
    labelKey: 'acc_need_sensory',
    explainKey: 'acc_need_sensory_help',
    prefs: {
      calmBackground: true,
      reduceMotion: true,
      muteSounds: true,
      focusMode: true,
      displayStyle: 'minimal',
    },
    featureIds: ['calmBackground', 'reduceMotion', 'muteSounds', 'focusMode'],
  },
};

/** Apply a preset onto current prefs. Never freezes or locks keys. */
export const applyAccommodationPreset = (
  current: AccessibilityPrefs,
  need: AccommodationNeed
): AccessibilityPrefs => {
  const preset = ACCOMMODATION_MATRIX[need];
  if (need === 'lowVision') return withLowVision(current, true);
  // Other presets must not turn on low-vision contrast/landscape.
  const { lowVision: _ignored, highContrast: _hc, colorTheme: _theme, ...safe } = preset.prefs as Partial<AccessibilityPrefs> & {
    lowVision?: boolean;
  };
  void _ignored;
  void _hc;
  void _theme;
  return { ...current, ...safe };
};

/** Clear low-vision colour/landscape overrides when that need is removed. */
export const clearAccommodationNeed = (
  current: AccessibilityPrefs,
  need: AccommodationNeed
): AccessibilityPrefs => {
  if (need === 'lowVision') return withLowVision(current, false);
  return current;
};

/** Toggle one feature id on/off without locking other prefs. */
export const toggleAccommodationFeature = (
  current: AccessibilityPrefs,
  featureId: AccommodationFeatureId,
  enabled: boolean
): AccessibilityPrefs => {
  const next = { ...current };
  switch (featureId) {
    case 'textSizeLarge':
      next.textSize = enabled ? 'large' : 'normal';
      break;
    case 'relaxedPacing':
      next.pacing = enabled ? 'relaxed' : 'normal';
      break;
    case 'slowSpeech':
      next.speechRate = enabled ? 'slow' : 'normal';
      break;
    case 'highContrast':
      return withLowVision(next, enabled);
    default: {
      const meta = ACCOMMODATION_FEATURES[featureId];
      if (meta.prefKey) {
        (next as Record<string, unknown>)[meta.prefKey] = enabled;
      }
      break;
    }
  }
  return next;
};

export const isFeatureEnabled = (
  prefs: AccessibilityPrefs,
  featureId: AccommodationFeatureId
): boolean => {
  switch (featureId) {
    case 'textSizeLarge':
      return prefs.textSize === 'large' || prefs.textSize === 'xlarge';
    case 'relaxedPacing':
      return prefs.pacing === 'relaxed';
    case 'slowSpeech':
      return prefs.speechRate === 'slow';
    case 'highContrast':
      return !!prefs.lowVision;
    default: {
      const meta = ACCOMMODATION_FEATURES[featureId];
      if (!meta.prefKey) return false;
      return Boolean(prefs[meta.prefKey]);
    }
  }
};
