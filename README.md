# MathLift

Vite + React learning app for early math (Congressional App Challenge).

## Highlights

- **My Objects** — real-life photo stickers (device storage) used as countable glyphs in lessons. Route `/objects`.
- **Solar systems** — classroom pathways SS1 (Counting · Addition · Subtraction) and SS2 (Multiplication · Division · Algebra). SS3–SS8 are designed in `docs/SOLAR_SYSTEMS.md` and marked `comingSoon` until answer audits pass.
- **3-topic builder** — teachers pick three topics; MathLift builds a valid 9-planet curriculum (`src/lib/curriculum/threeTopicBuild.ts`).
- **Accessibility** — Calm mode / Focus mode and related prefs; see `docs/ACCESSIBILITY.md`.
- **Demo** — `?demo=1` or five taps on the version label; script in `docs/DEMO_SCRIPT.md`.

## Feature flags

| Flag | Default | Notes |
|------|---------|--------|
| `VITE_ENABLE_CLASS_PHOTO_SHARING` | OFF | Class photo sharing stays disabled while Firestore rules are open. See `.env.example`. |

## Clear cloud voice (OpenAI TTS)

Set **server-only** `OPENAI_API_KEY` on Vercel (or your host). MathLift’s `/api/tts` proxy uses `gpt-4o-mini-tts` with the **Alloy** voice so read-aloud sounds clearer. The key never ships to the browser. Without the key, read-aloud falls back to the device voice. Settings discloses that the cloud voice is AI-generated.

## Firestore rules

Deploy the rules in this repo (they must stay in sync with production):

```bash
firebase deploy --only firestore:rules
```

Requires the Firebase CLI, project `mathlift-63f6e` (see `.firebaserc`), and an account that can deploy to that project. The local `firestore.rules` file is what gets deployed.
