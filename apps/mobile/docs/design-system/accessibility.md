# Accessibility Notes

## Baseline
- Dynamic text supported through token typography scale.
- Interactive controls expose accessibility role/label.
- Top bar mode switch exposes explicit labels.

## Focus And Keyboard
- Web focus ring target token: `color.focusRing`.
- Overlay components (`ModalSheet`) close on request and can be focus-trapped in web implementation.

## Color Usage
- Color is not the only signal for selected states in checkbox/radio/tabs/chips.
- Error state includes text + border color.

## Feedback
- Inline form errors via `InputField`/`SelectField`.
- Action feedback pattern via `Toast`/`AlertBanner`.
