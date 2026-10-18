# TTS audit: fixed vs dynamic speech

Generated for the voice stack. Runtime prefers OpenAI `gpt-4o-mini-tts` via `/api/tts`
when `OPENAI_API_KEY` is configured on the host (Natural voice on). Otherwise falls
through to on-device Kokoro (English) or device `speechSynthesis`.
Fixed strings are still candidates for `npm run generate:tts` pre-rendered clips.

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

1. **Pre-rendered clips** under `public/audio/<lang>/<hash>.mp3` via `scripts/generate-tts.mjs`
2. **OpenAI gpt-4o-mini-tts** (`coral` by default) through `api/tts.js` when `OPENAI_API_KEY` is set. AI-generated voice is disclosed in Settings. Text is capped and never exposes the API key to the browser.
3. **Kokoro-82M** warm English neural voice (`af_bella`). Pref `naturalVoice` defaults **on**. Downloads about 90 MB once, then stays on device. Falls back if load/play fails.
4. **Improved device `speechSynthesis`** with packed utterances, soft prosody, better voice ranking, and a speech generation token to avoid stale queues
