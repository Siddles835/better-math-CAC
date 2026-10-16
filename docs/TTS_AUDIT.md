# TTS audit: fixed vs dynamic speech

Generated for the three-tier voice work. Runtime never calls a cloud TTS API.
Fixed strings are candidates for `npm run generate:tts` pre-rendered clips.
Dynamic strings fall through to the device voice (Tier 3), or optional on-device Kokoro (Tier 2, English only, off by default).

## Call sites

| Area | Files | Fixed / enumerable | Dynamic |
| --- | --- | --- | --- |
| Read aloud | `ReadAloudButton`, lesson pages | Most `tx('ui:…')` prompts | Teacher prompts, computed story numbers, MCQ `a + b` |
| Teach stories | `TeachStory.tsx` | Story templates in locales | Filled number slots |
| Guided practice | `GuidedPractice.tsx` | Instruction strings | Spoken count integers |
| Counter | `Counter.tsx` | none | Spoken count integers |
| Path activity | `PathActivity.tsx` | Built-in path prompts | Curriculum / generated prompts |
| Equation builder | `EquationBuilder.tsx` | Template shells | Operand values |
| Concept visual | `ConceptVisual.tsx` | Locale concept lines | Rare number fills |
| Explore shell | explore activities | Locale copy | Generator numbers |
| Story quiz / drills | lesson drill, band check, problem player | Feedback keys | Problem prompts, answers |
| Settings sample | `VoiceSettings.tsx` | `sampleSpeechText` per language | none |

## Number and connective bank (pre-render)

- Integers `0` to `100` in en, es, hi, zh-Hans, ar
- Connectives: plus, minus, equals, equals what?, to, point, slash / over, one half (and locale equivalents)
- Counting prompts `1` to `20` where the template is fixed

## Dynamic (do not send to cloud at runtime)

- Teacher-typed curriculum prompts and worked examples
- Live counters and guided-practice step numbers above the bank
- Generated path equations with unbounded operands
- Student nicknames

## Tiers

1. **Pre-rendered Chirp 3 HD** under `public/audio/<lang>/<hash>.mp3` via `scripts/generate-tts.mjs`
2. **Optional Kokoro-82M** for English dynamic text (feature flag, not enabled by default; skipped if heavy in Capacitor WebView)
3. **Improved device `speechSynthesis`** with sentence-only splitting, better voice ranking, and a speech generation token to avoid stale queues
