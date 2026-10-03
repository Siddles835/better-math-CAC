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

## iOS

The print button posts a `print` message to the MathLift bridge. `ios/ContentView.swift` presents `UIPrintInteractionController` with the web view's print formatter. This must be tested on a Mac in Xcode. It was not compiled here.
