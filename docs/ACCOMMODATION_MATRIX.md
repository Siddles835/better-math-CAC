# Disability accommodation matrix

Teacher-facing presets live in `src/lib/accommodations/matrix.ts`. Class defaults are stored on-device at `mathlift.classAccommodations.v1` (keyed by class code) via `src/lib/accommodations/classDefaults.ts`. Applying a preset **never locks** student settings — every preference stays editable in Learning preferences / the Accommodation panel.

## Need → prefs → features

| Need | Preference patches | Feature ids |
|------|-------------------|-------------|
| Dyscalculia | `summaryFirst`, `workedExampleFirst`, `focusMode`, `pacing: relaxed`, `colorSafeLabels` | summaryFirst, workedExampleFirst, focusMode, relaxedPacing, colorSafeLabels |
| ADHD | `focusMode`, `calmBackground` (+ reduceMotion/muteSounds via Calm), `breaks`, `pacing: relaxed` | focusMode, calmBackground, reduceMotion, muteSounds, breaks, relaxedPacing |
| Autism | `calmBackground`, `reduceMotion`, `muteSounds`, `focusMode`, `displayStyle: minimal`, `soundAsText` | calmBackground, reduceMotion, muteSounds, focusMode, soundAsText |
| Dyslexia | `dyslexiaFont`, `easyReadSpacing`, `textSize: large`, `summaryFirst`, `workedExampleFirst`, `autoReadAloud` | dyslexiaFont, easyReadSpacing, textSizeLarge, summaryFirst, workedExampleFirst, autoReadAloud |
| Speech | `speechRate: slow`, `autoReadAloud: false`, `soundAsText`, `answerMethod: choose` | slowSpeech, soundAsText |
| Hearing | `soundAsText`, `muteSounds`, `voiceEnabled: false`, `colorSafeLabels` | soundAsText, muteSounds, colorSafeLabels |
| Low vision | `lowVision: true` (gates contrast colours + roomier landscape: xlarge text, bigger targets), `colorSafeLabels`, `autoReadAloud` | textSizeLarge, highContrast, biggerButtons, colorSafeLabels, autoReadAloud |
| Intellectual | `summaryFirst`, `workedExampleFirst`, `pacing: relaxed`, `textSize: large`, `biggerButtons`, `breaks` | summaryFirst, workedExampleFirst, relaxedPacing, textSizeLarge, biggerButtons, breaks |
| Anxiety | `calmBackground`, `reduceMotion`, `muteSounds`, `breaks`, `pacing: relaxed`, `workedExampleFirst` | calmBackground, reduceMotion, muteSounds, breaks, relaxedPacing, workedExampleFirst |
| Sensory | `calmBackground`, `reduceMotion`, `muteSounds`, `focusMode`, `displayStyle: minimal` | calmBackground, reduceMotion, muteSounds, focusMode |

## Wired runtime behavior

| Feature | Where it takes effect |
|---------|------------------------|
| `summaryFirst` | `LessonShell` banner (`helper:summary_banner`) |
| `workedExampleFirst` | `LessonShell` banner (`helper:worked_example_banner`) |
| `soundAsText` | `AccessibilityContext` announce region becomes a visible caption when a message is set |
| `colorSafeLabels` | `NumberDraw` check verdicts prefix ✓ / ✗ / ? with the text label |
| Calm / reduce motion / mute / focus / fonts / etc. | Existing `applyPrefsToDocument` + lesson chrome |
| Low vision colour + landscape | Only when `prefs.lowVision` is true (`data-low-vision` on `<html>`). Turning the need/feature off restores the normal theme. |

## UI entry points

- Teacher Dashboard → Accommodation panel (`AccommodationPanel`)
- Student / device Learning preferences remain the authority for individual overrides
