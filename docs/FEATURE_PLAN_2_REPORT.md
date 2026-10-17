# Feature Plan 2 final report

Branch: `cursor/feature-plan-2-objects-builder-5bbd` · PR: https://github.com/Siddles835/better-math-CAC/pull/13

## 1. What was built per feature

### A. My Objects
- Library, capture (getUserMedia + file picker + optional Capacitor Camera), classic cutout with whole-photo fallback, naming, preview with GroupAnimation, IndexedDB store and native Filesystem store.
- ObjectGlyph wired into ConceptVisual, Basket, problem visuals; active glyph prefs; phrases for 5 languages.
- Teacher toggle `allowStudentObjectPhotos` (default OFF). Solo grown-up gate. Face heuristic. EXIF stripped via canvas.
- Class sharing coded behind `VITE_ENABLE_CLASS_PHOTO_SHARING` (OFF).

### B. 3-topic builder
- Curriculum list card → ThreeTopicWizard → 9-planet draft with intro/practice/challenge bands, progress messages, Skip, Review.
- Rebuild one planet or all from `generatedFrom`.
- Bulk prompt paste (`question = answer`) with live validation.

### C. Solar systems
- `src/content/solarSystems.ts`: SS1 foundations, SS2 operations live; migration from legacy path ids.
- Teacher dashboard: Solar system selector + starting planet with topic-start tags.

### D. Extra solar systems
- Designed in `docs/SOLAR_SYSTEMS.md`. SS3–SS8 present as `comingSoon: true` (hidden from children until audits pass).

### E. GroupAnimation
- Reusable add/subtract/count/multiply/divide with play controls, narration keys, reduced motion, RTL-safe numerals.

### F. Bulk prompts
- Parser + editor UI + unit tests for edge cases.

### Audit / polish
- Accessibility doc + Calm/Focus modes; privacy/legal/App Store camera wording; Settings Photos section; THIRD_PARTY; demo script beat sheet.

## 2. Files added or changed (high level)

New: `src/lib/objects/*`, `src/components/objects/*`, `src/components/animations/*`, `src/components/curriculum/ThreeTopicWizard.tsx`, `src/pages/ObjectsPage.tsx`, `src/content/solarSystems.ts`, `src/lib/curriculum/{threeTopicBuild,bulkPrompts}.ts`, `src/lib/featureFlags.ts`, locales `objects.json` ×5, docs under `docs/FEATURE_PLAN_2.md`, `SOLAR_SYSTEMS.md`, `ACCESSIBILITY.md`, `THIRD_PARTY.md`, `FEATURE_PLAN_2_REPORT.md`.

Touched: CurriculumPage, TeacherDashboard, SettingsPage, ConceptVisual, Basket, ProblemPlayerPage, App routes, Info.plist, package.json (camera, filesystem, fake-indexeddb), privacy HTML, APP_STORE, README, DEMO_SCRIPT.

## 3. Decisions

| Topic | Choice | Why |
|-------|--------|-----|
| Default path | Solar system selector (Option 2) | Matches classroom pathways; removes old dropdown spirit |
| Real-life photos | Fully built with classic cutout first | Demo impact; ML deferred for license/offline bundling |
| Class sharing | Flag OFF | Open Firestore rules |
| SS3–SS8 | comingSoon | No child-facing math without passing audits |
| Arabic dual | Use "many" form | Avoid incorrect dual guessing |

## 4. Not finished

- MediaPipe Image Segmenter + Face Detector (self-hosted models) not bundled.
- Fix-edges brush UI.
- Full generators + audits for SS3–SS8 (design only / coming soon).
- Complete Playwright matrix (phone/tablet/desktop × themes × RTL) and axe on every key screen.
- Measured cutout timings on physical iPad (report lab numbers only if collected in e2e follow-up).

## 5. Risks

1. **Firestore rules are open** (`allow read, write: if true`). Do not enable `VITE_ENABLE_CLASS_PHOTO_SHARING` until rules restrict class objects to class members.
2. Classic cutout quality depends on plain backgrounds (tips shown once).
3. Face check is a heuristic until MediaPipe Face Detector ships.
4. Large app chunks (kokoro / App) already large; Objects page is lazy-loaded (~26 kB gzip ~8.6 kB).

## 6. Manual steps for you

1. Review and merge PR #13 when ready.
2. Deploy tightened Firestore rules before any class photo sharing.
3. On a Mac: `npm run cap:sync` / open Xcode; confirm camera permission strings; signing.
4. Optional: `npm run generate:tts` for any new fixed narration strings you want neural audio for.
5. Film demo using `docs/DEMO_SCRIPT.md`; Prefer file picker if camera blocked in recording environment.

## 7. Measured numbers (this environment)

| Metric | Value |
|--------|--------|
| Vitest | 203 tests passing |
| Prompt 2 Playwright | 4/4 passed (`objects-builder`, `prompt2-builder`, `prompt2-objects`) |
| `npm run test:answers` | 0 focused violations |
| `npm run check:i18n` | pass (5 langs, 13 namespaces) |
| ObjectsPage chunk | ~26.2 kB / ~8.6 kB gzip |
| Main App chunk | ~1.9 MB / ~553 kB gzip (pre-existing kokoro/app size) |
| Capacitor plugins | camera 8.2.6, filesystem 8.1.5, haptics, splash-screen |
