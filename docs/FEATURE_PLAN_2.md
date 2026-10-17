# MathLift Feature Plan 2

Congressional App Challenge build. Prompt 1 work (`stripUndefined`, `generate-tts.mjs`, `renumber`) is already in the repo. Every new Firestore write will use `stripUndefined`.

## Decisions (whiteboard choices)

| Choice | Decision | Why |
|--------|----------|-----|
| Default Path | Option 2: Solar system selector (SS1, SS2, …) | Matches the two classroom pathways already shipped; removes the old topic dropdown |
| Real-life photo | Fully in scope | Highest demo impact; judges will remember it |
| Class photo sharing | Implemented behind `VITE_ENABLE_CLASS_PHOTO_SHARING` (OFF) | Firestore rules are still open (`allow read, write: if true`); sharing would leak cutouts |
| Extra solar systems | Design all 6 in `docs/SOLAR_SYSTEMS.md`; ship only systems with passing answer audits; others flagged OFF | Never show children broken math |

## Feature A: My Objects (real-life photo stickers)

### Data model
```ts
ObjectSticker { id, kind: 'builtin'|'photo', name: {one, many}, lang, createdAt, width, height, segmentation, enabled }
ObjectPrefs { activeId: string | 'mix' | null, showPicturesWithProblems: boolean, grownUpUnlocked: boolean }
```
Store: IndexedDB (web) + Capacitor Filesystem (native). Max 24 photos / ~12 MB. Never store originals. Strip EXIF via canvas re-encode.

### Files
- `src/lib/objects/{types,store,cutout,classicCutout,faceCheck,nameFilter,phrases,arrange,prefs}.ts`
- `src/components/objects/{ObjectGlyph,ObjectLibrary,CaptureFlow,CutoutEditor}.tsx`
- `src/pages/ObjectsPage.tsx` route `/objects`
- `public/models/` (MediaPipe WASM + models, Apache-2.0)
- iOS `Info.plist` camera/photo keys
- Locales: `objects` namespace in all 5 languages

### Edge cases
Camera denied → file picker. ML timeout/fail → classic flood-fill → whole-photo sticker. Face detected → block. Storage full → friendly message. Class students: camera OFF unless teacher enables. Solo: grown-up gate once.

### Test plan
Unit: classic cutout on synthetic canvases; store with fake-indexeddb; phrases for n=0,1,2,3,10,11,20 × 5 langs; arrangement rows-of-5. E2E: file-input fixture → sticker → counting lesson. Feature flag for class sharing.

### Risk
Open Firestore rules. Class sharing stays OFF until rules tighten.

---

## Feature B: 3-topic curriculum builder

### Data model
Extend `Curriculum` with optional `generatedFrom?: { topics: [string, string, string]; grade?: 'K'|'1'|'2'; pace?: 'gentle'|'standard'|'challenge' }`.

### Rules
9 planets = PLANET_ORDER. Planets 1–3 = T1, 4–6 = T2, 7–9 = T3. Within topic: intro / practice / challenge. 8 authored problems per planet from `problemsForNode`. Zero `validateCurriculum` issues. Starting planets = indices 0, 3, 6 (Sun, Earth, Saturn).

### Files
- `src/lib/curriculum/threeTopicBuild.ts`
- `src/components/curriculum/{ThreeTopicWizard,BuilderAnimation}.tsx`
- Wire into `CurriculumPage.tsx`
- Tests: every valid 3-topic combo from the topic registry

### Animation
3–4s min, Skip button, real generation driven, reduced-motion list fallback, aria-live.

---

## Feature C: Solar system registry

### Data model
```ts
SolarSystem { id, nameKey, summaryKey, topics: [T1,T2,T3], theme, nodes: PathNode[9], legacyPathIds: string[] }
```
`ss1` = foundations (Counting, Addition, Subtraction). `ss2` = operations (Multiplication, Division, Algebra). Migration: `foundations`→`ss1`, old topic ids→their solar system.

### Files
- `src/content/solarSystems.ts`
- Update `planets.ts`, `TeacherDashboard.tsx`, hub, placement, PrintBriefing
- Migration tests in `src/content/solarSystems.test.ts`

---

## Feature D: Six more solar systems

Documented in `docs/SOLAR_SYSTEMS.md`. New `GeneratorId`s + generators. Ship only after `npm run test:answers` passes for that system. Incomplete systems: `comingSoon: true` and hidden from children.

Proposed: SS3 Place Value, SS4 Measurement and Time, SS5 Geometry, SS6 Equal Shares, SS7 Data and Graphs, SS8 Patterns and Skip Counting.

---

## Feature E: GroupAnimation

`src/components/animations/GroupAnimation.tsx` — ops add/subtract/count/multiply/divide; dots or ObjectGlyph; play/pause/replay/step; speech narration; reduced motion; `dir="ltr"` on numerals.

---

## Feature F: Bulk prompt entry

Parser `src/lib/curriculum/bulkPrompts.ts` — lines `question = answer`. Live preview table. Cap at 20/planet. Tests for blank, `=` in question, non-ASCII digits, overflow.

---

## Audit / polish (section 8)

Handwriting, audio, settings reorganization (Photos and objects section), `docs/ACCESSIBILITY.md`, calm/focus modes, solo solar + objects walkthrough.

## Demo (section 9)

One-tap demo login ≤5s. Seed curriculum + starter pack. Update `docs/DEMO_SCRIPT.md`.

## Build order (vertical slices)

1. Solar registry + teacher selector (C)  
2. GroupAnimation (E)  
3. My Objects core: types, store, classic cutout, glyphs, phrases, UI flow (A)  
4. Wire objects into lessons + Problem visual (A)  
5. MediaPipe ML cutout + face check + Capacitor camera (A)  
6. 3-topic builder + animation (B)  
7. Bulk prompts (F)  
8. Extra solar systems design doc + generators (D)  
9. Settings / a11y / solo audit (8)  
10. Demo path + Playwright QA (9)

After each slice: `typecheck`, `lint`, `vitest`, `check:i18n`, `test:answers`, commit.
