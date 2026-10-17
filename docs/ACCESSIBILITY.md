# MathLift accessibility

Learning preferences change **how** a lesson is shown, heard, and answered — never the maths content. Choices stay on the device (`mathlift.learningPrefs.v1`). CSS tokens on `<html>` (`data-calm`, `data-focus-mode`, `data-reduce-motion`, `data-dyslexia-font`, `data-theme`, `data-big-targets`, and related) drive the visual response.

## Calm mode and Focus mode

| Mode | Preference keys | Effect |
|------|-----------------|--------|
| **Calm mode** | `calmBackground` (also sets `reduceMotion` + `muteSounds`) | Plain background (no star field), reduced motion, muted tap/celebration SFX. Speaking voice stays on its own switch. |
| **Focus mode** | `focusMode` | Hides elements marked `data-secondary="true"` (side notes, thought cards) so only the task stays on screen. |

Both appear under Settings → Learning preferences. Toggle strings live in the `ui` locale namespace (`toggle_calmBackground`, `toggle_focusMode`) in all five languages.

---

## Needs and MathLift features

### Dyslexia
Letter-shape confusion and dense lines slow decoding; spacing and a clear sans face help. MathLift: dyslexia-friendly Lexend font (`dyslexiaFont`), easy-read spacing, larger text sizes, summary-first / worked-example-first, read-aloud, and Calm mode to cut visual motion.

### Dyscalculia
Number and operation load can overwhelm working memory; concrete models and fewer simultaneous cues help. MathLift: GroupAnimation with countable glyphs, My Objects stickers on problems, step controls, Focus mode, relaxed pacing, and optional “one thing at a time” chrome.

### ADHD
Sustained attention benefits from low distraction and explicit pacing. MathLift: Focus mode, Calm mode, reduce motion, mute SFX, break button, relaxed pacing (hides timed UI), and short planet-sized lesson chunks.

### Autism / sensory sensitivity
Busy visuals and sudden sound can overload sensory processing. MathLift: Calm mode (plain background + less motion + muted SFX), reduce motion, mute sound effects, Focus mode, minimal display style, and voice on/off separate from SFX.

### Low vision
Low contrast and small targets reduce legibility. MathLift: large / extra-large text, high-contrast theme, bigger buttons (`data-big-targets`), color-safe labels (word + symbol, not colour alone), and read-aloud.

### Color blindness
Hue-only success/error cues fail for many learners. MathLift: color-safe labels always pair status with words and symbols; high-contrast theme available.

### Motor / fine motor
Precise taps and long holds are hard. MathLift: bigger buttons, large answer targets, multiple answer methods (type / choose / draw), and handwriting paths that accept generous strokes.

### Deaf / hard of hearing
Audio-only instruction is inaccessible. MathLift: full on-screen text for prompts, “show sounds as text,” captions via the live status region, and voice optional — lessons never require hearing.

### English learners
Unfamiliar vocabulary and speech rate affect comprehension. MathLift: UI in English, Spanish, Simplified Chinese, Hindi, and Arabic (RTL); number-style choices; slow speech rate; natural/device voices; read-aloud with on-screen text.

---

## Where to change settings

**Settings** → Learning preferences (`AccessibilityPanel`) and Appearance (`AppearanceSection`). Document attributes are applied in `src/lib/accessibility.ts` → `applyPrefsToDocument`.
