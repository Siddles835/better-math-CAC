# MathLift App Store readiness

MathLift is a Vite + React web app with a native SwiftUI shell (`ios/ContentView.swift`).

## Product quality checklist (code)

- [x] Join / Login works across devices (class code + generated space name)
- [x] Students cannot type a real name; they re-roll a generated username as often as they like
- [x] Sign Out clears session; Home shows Continue for the most recent role only
- [x] Student and teacher logins cannot stay saved on the same device (most recent wins)
- [x] Teacher PIN required to manage a class; PIN is not stored on the device
- [x] Students can delete their own account; teachers can remove a student or delete a class
- [x] Privacy Policy lists exactly what data is collected, retention/deletion, and third parties
- [x] No Firebase Analytics / advertising SDKs
- [x] Native iOS shell: Taptic Engine + Core Haptics, Keychain sessions, file protection, ATS/HTTPS
- [x] No YouTube / external lesson embeds (self-contained celebrations)
- [x] Lesson routes require a student session
- [x] Error boundary for unexpected crashes
- [x] Safe-area aware nav; larger touch targets
- [x] Tablet solar system scales so outer planets fit
- [x] Support + Privacy + Cookie + Settings pages linked from Home
- [x] Read-aloud TTS speaks “minus” for subtraction equations
- [x] `ITSAppUsesNonExemptEncryption` set for export compliance

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
- Privacy Nutrition Labels: class code + generated username + lesson progress. No analytics. No advertising.
- Support URL: deployed `/support`
- Privacy Policy URL: deployed `/privacy-policy`
- Screenshots: iPhone + iPad of Home, Join, Planets, a lesson, Teacher dashboard, Settings / delete account
