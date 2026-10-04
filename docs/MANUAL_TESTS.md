# Manual checks

Playwright is not set up. These are the checks to run on a device.

## Answer checking

- Counting Sun: draw a wrong number, see "Not quite, try again", and confirm the target count is not on screen. Add an apple. The old result clears and Check works again.
- Draw a scribble. The app asks for a redraw and does not show a diagnosis.
- Draw 10, 12, and 14 as two side-by-side digits.
- A correct check stays correct if the child keeps drawing after it.

## Teacher view

- Open `/teacher/SAMPLE`. The banner says sample data. Progress shows six weeks. Resolved this month lists space names only.
- Open `/teacher/SAMPLE/print` and use Print / Save as PDF. It should fit on one Letter or A4 page.

## Languages

- Home and Settings show English, 中文, हिन्दी, Español, and العربية in their own scripts.
- Arabic layout is right to left. Equations such as 8 - 3 = ? stay left to right.
- If the device has no voice for the chosen language, read-aloud shows a notice and does not speak English.

## Voice (device speech)

UNTESTED in CI — quality depends on voices installed on the real device. No cloud TTS.

- Settings → Voice: toggle Speaking voice off; speech stops immediately and speaker buttons hide.
- Turn Voice back on. Mute sound effects stays independent (SFX can be muted while Voice stays on).
- Open Voice sound: pick a listed voice, set Slow / Normal, tap Play sample.
- In a lesson, use the header voice quick toggle near accessibility / read-aloud.
- Confirm ranking prefers enhanced/neural/online voices when the device exposes them.

## iOS session stay signed in

UNTESTED pending Xcode / physical iPhone. Swift changes in `ios/ContentView.swift` are compile-intended but not built here.

1. Sign in as a student (classroom or solo).
2. Background the app for about 5 minutes, then reopen — still signed in.
3. Lock the phone for a minute, unlock, reopen MathLift — still signed in.
4. Force-quit MathLift from the app switcher, reopen — still signed in.
5. Toggle Airplane Mode on/off (offline screen may appear; after retry) — still signed in.
6. Explicit Sign out / Delete account — session clears and stays cleared.
7. Optional: with a debug build, confirm console `[session]` logs on write / restore / clear.

## iOS print

The print button posts a `print` message to the MathLift bridge. `ios/ContentView.swift` presents `UIPrintInteractionController` with the web view's print formatter. This must be tested on a Mac in Xcode. It was not compiled here.
