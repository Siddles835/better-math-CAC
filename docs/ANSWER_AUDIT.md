# Answer audit

MathLift treats every scored answer as **derived from operands** (or from a rendered picture count), never as a hand-typed constant that can drift.

## How validation works

1. **Library:** `src/lib/answers/`
   - `computeExpectedAnswer(operator, num1, num2)` — single source of truth
   - `parseStudentAnswer` — Western / Eastern Arabic-Indic / Devanagari digits; rejects junk as **unreadable** (not wrong)
   - `buildMcqOptions` / `buildEquationChipValues` — unique options; equation chips **never** include the result
   - `quizQuestions.ts` — StoryQuiz defs (operands + English copy); answer and options are materialized
   - Generators for Mercury / Venus / Jupiter / Neptune / personal path

2. **Automated suite:** `src/lib/answers/answers.test.ts`
   - Static quiz (24) + planet demos
   - Locale digit checks for `en`, `zh-Hans`, `hi`, `es`, `ar`
   - Typed parsing cases
   - Equation-chip acceptance rules
   - **5000 seeds** per generator lesson + personal path

3. **CI script:** `npm run test:answers` → `scripts/audit-questions.mjs` → vitest audit  
   Included in `npm run test`.

## How to add a new question safely

1. Add a def to `src/lib/answers/quizQuestions.ts` with `num1` / `num2` (no `answer` field).
2. Add matching `*_story` / `*_question` keys in **every** `src/locales/*/quiz.json`.
   - Translations may change names/objects, **never** the numbers or the operation.
   - Avoid wording that introduces extra digits (e.g. “one each”).
3. For counting items, set `pictureCounts` / icon so the rendered count equals `num1`.
4. Run `npm run test:answers` — it must print **violations=0**.
5. For planet MCQs, call the shared generators (`generateVenusMcq`, etc.) instead of ad-hoc `Math.random` shuffles.

## Drawing answers

`NumberDraw` runs recognition, shows **I see: N**, and requires confirm when confidence is not high.  
Unreadable / rejected confirms are **never** scored wrong and do not create a diagnosis event.
