# SafeDrive NG Smoke Test

Run on a **dev client** build (not Expo Go).

## Auth

1. Create account / sign in.
2. Confirm Map tab loads (or shows empty hotspots, not a Firebase config error).

## Map

1. Location permission granted; blue user location visible.
2. Hotspots/accidents render after data pipeline.
3. Route search → set destination → distance + hotspot warning text.
4. Weather chip appears when online.
5. Offline: toggle airplane mode → offline banner.

## Report

1. Pick location on map; submit Minor/Urban/Clear report.
2. Confirm success or offline queue message.
3. Settings → Sync now clears queue when online.

## Settings / i18n / theme

1. Switch language EN → HA → YO → IG; labels change.
2. Theme system / light / dark.

## Modules (Settings or Profile)

1. SOS — add contact, share location, FRSC/Police buttons.
2. Education — open an article, mark read.
3. Medication — search `codeine` or `paracetamol`, see advisory + disclaimer.
4. Feedback — submit a short message.
5. Behaviour — accept consent, start/end short trip (GPS on).

## Admin (after bootstrap-admin)

1. Toggle to Admin dashboard.
2. Overview counts refresh.
3. Research data export available.
