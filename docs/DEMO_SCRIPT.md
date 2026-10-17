# Demo click path

Demo data stays in memory. It does not read or write a real class. Open the app with `?demo=1`, or tap the version label five times. A persistent DEMO DATA badge stays on screen (with Reset demo). Reset puts the sample class, published 3-topic curriculum, and object starter prefs back. Playwright covers the builder and objects file-input paths; `@axe-core/playwright` was not added (skip a11y axe for now).

Class code `demo`. PIN `DEMO01`.

## 90-second beat sheet

| Beat | Time | Action |
|------|------|--------|
| Login | 0–5s | Open `/?demo=1`. Confirm DEMO DATA. One-tap **Try as demo teacher** or **Try as demo student** (or Manage Class → `demo` / `DEMO01`). |
| 3-topic builder | ~15s | Curricula → Build from 3 topics → pick e.g. Counting, Addition, Subtraction → watch builder animation (or Skip) → save draft. |
| Student photo pencil | ~15s | Student session → My Objects → pick/upload a pencil (or starter sticker) → set as active object. |
| Counting | ~15s | Open SS1 Counting planet (Sun) → count with photo stickers / glyphs. |
| Addition animation | ~15s | Earth / addition planet → GroupAnimation shows add with correct counts per step. |
| Handwriting | ~10s | Answer by drawing a digit; local model grades (or type/choose fallback). |
| Teacher dashboard | ~15s | Back to teacher → class dashboard: roster, assigned curriculum, accuracy / topics to practice. Optional CSV export (`DEMO-…`). |

## Longer click path

1. Open `/?demo=1`. Confirm the DEMO DATA badge.
2. Choose New Student (Join Class). Enter class code `demo` and join with the generated space name.
3. Pick a solar system pathway (SS1 foundations or SS2 operations), or open Curricula as teacher and run the 3-topic builder.
4. On the level check, choose Skip to the result. The summary names a recommended path and planet. It does not show a correct answer or a timer.
5. Continue to the path board. Planets unlock in order. Try counting, then addition with GroupAnimation, then a handwriting answer.
6. Sign in as a teacher: Manage Class, class code `demo`, PIN `DEMO01`.
7. Open Curricula. Duplicate a default path or build three topics, save, and assign it to the class.
8. Return to the class dashboard. Pilot overview lists space names, the assigned curriculum, assessment, accuracy, time, and topics to practice.
9. Export CSV. The file name starts with `DEMO-`. The file contains space names and totals, not drawings.
10. Choose Reset demo. The badge remains, and the sample class returns to its starting curricula.
