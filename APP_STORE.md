# MathLift App Store readiness

MathLift is a Vite + React web app with a native SwiftUI shell (`ios/ContentView.swift`).

## Product quality checklist (code)

- [x] Join / Login works across devices (class code + generated space name)
- [x] Individual mode (“Learn on my own”): no email, no password, generated space name, optional 4-digit PIN; progress stays on-device (localStorage + iOS Keychain mirror). No Firestore writes in this mode.
- [x] Students cannot type a real name; they re-roll a generated username as often as they like
- [x] Sign Out clears session; Home shows Continue for the most recent role only
- [x] Student and teacher logins cannot stay saved on the same device (most recent wins)
- [x] Teacher PIN required to manage a class; PIN is not stored on the device
- [x] Students can delete their own account; solo learners can wipe on-device progress; teachers can remove a student or delete a class
- [x] Privacy Policy lists exactly what data is collected (including individual mode: device-only), retention/deletion, and third parties
- [x] No Firebase Analytics / advertising SDKs
- [x] Native iOS shell: Taptic Engine + Core Haptics, Keychain sessions (including solo progress), file protection, ATS/HTTPS
- [x] No YouTube / external lesson embeds (self-contained celebrations)
- [x] Lesson routes require a student session
- [x] Error boundary for unexpected crashes
- [x] Safe-area aware nav; larger touch targets
- [x] Tablet solar system scales so outer planets fit
- [x] Support + Privacy + Cookie + Settings pages linked from Home
- [x] Read-aloud TTS speaks “minus” for subtraction equations
- [x] `ITSAppUsesNonExemptEncryption` set for export compliance
- [x] Optional gentle placement check (~12–16 items) for solo learners and as a teacher-assigned class option
- [x] Explore moon-station: ≥8 untimed number-sense activities; optional on-device signals (activity id, ways found, timestamp) deleted with progress; no new diagnosis codes

## Native SwiftUI shell

Paste `ios/ContentView.swift` over `ContentView.swift` in Xcode. It wraps
`https://better-math-lalith.vercel.app` with:

- Offline screen + retry
- Native header / tab bar (Home, Classes, Settings)
- WKWebView message handler `mathlift` for haptics
- Session storage in the iOS Keychain (not UserDefaults)
- Complete file protection on app directories
- HTTPS-only navigation (App Transport Security)

Do **not** add `NSAllowsArbitraryLoads` to Info.plist.

## What you still must do on a Mac (required for App Store)

1. Install Xcode on a Mac.
2. Paste `ios/ContentView.swift` into your SwiftUI target (or, for Capacitor: `npm install && npm run cap:sync && npx cap open ios`).
3. In Xcode: set Team / Signing, bundle id `com.mathlift.app`, 1024×1024 icon, splash.
4. Archive → Upload to App Store Connect.

## App Store Connect listing

- Age rating: educational / kids-appropriate (answer COPPA questionnaire honestly)
- Privacy Nutrition Labels: **Class mode** — class code + generated username + lesson progress + a short per-student history of diagnosis results (misconception type, planet, timestamp). Optional path progress, a capped level-check summary, foreground time in whole seconds per day, teacher curricula, assignments, and a goals note. **Individual mode** — generated space name, optional PIN, and lesson progress stored only on the device (not sent to Firebase). Solo learners are not assigned curricula. Optional Explore signals (activity id, ways-found count, timestamp) stay on-device with progress and follow the same deletion rules. Demo mode stays in memory on the device and does not read or write the class database. No analytics. No advertising. No external requests for fonts or lessons. Language choice, appearance, and number style stay on the device only. A teacher PIN in the app is not access control until Firestore rules are deployed. The rules file in this repo stays open for the pilot and says that plainly.
- Drawings never leave the device. Exports use generated space names and aggregates only.
- Supported languages: English, Simplified Chinese, Hindi, Spanish, and Modern Standard Arabic. Listing text should be localized for those storefronts. Translations in the app are not professionally reviewed.
- iOS print uses UIPrintInteractionController. Test Print / Save as PDF from a class briefing on a Mac in Xcode before submission.
- Support URL: deployed `/support`
- Privacy Policy URL: deployed `/privacy-policy`
- Screenshots: iPhone + iPad of Home, Join, Planets, Explore, a lesson, Teacher dashboard, Settings / delete account
