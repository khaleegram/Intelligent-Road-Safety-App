# SafeDrive NG Delivery Roadmap

Phased delivery aligned with the research architecture. Multilingual and adaptive UX are non-negotiable.

## Status legend

- **Done** — shipped in app/backend
- **Ops** — code ready; requires credentials / console / schedule
- **Deferred** — explicitly out of first go-live

## Phase 0 — Docs and branding — Done

Architecture, roadmap, SafeDrive NG branding, data contracts.

## Phase 1 — Adaptive + multilingual — Done

EN / HA / YO / IG parity; system / light / dark theme; breakpoints.

## Phase 2 — Safety alerts + offline — Done

Public notification inbox, alert preferences, NetInfo auto-sync, offline banners.

## Phase 3 — Emergency contact and SOS — Done

Contacts, FRSC/Police dial, GPS share.

## Phase 4 — Weather and traffic — Done

Open-Meteo chip; Mapbox congestion annotations on routes.

## Phase 5 — Road safety education — Done

Multilingual static packs + Education screen.

## Phase 6 — Medication safety checker — Done

Curated catalog + disclaimer.

## Phase 7 — Feedback and analytics — Done

Firestore `feedback` + Profile stats.

## Phase 8 — Production ML risk serving — Ops

`publish-risk-predictions.mjs` + Hotspot Pipeline Action step. Map advisory banner. Full `.pkl` inference deferred.

## Phase 9 — Driver behaviour monitoring — Done

Opt-in consent + trip scoring.

## Phase 10 — SEM research tooling — Done / Ops

Enriched CSV export + [research/SEM.md](research/SEM.md). Requires Firebase credentials to run.

## Go-live sprints — Ops

See [GO_LIVE.md](GO_LIVE.md): Firebase foundation → dev client → data pipeline → SEM → App Check / push / monitoring.

## Navigation policy

Tabs: Map | Report | Settings. Stack: Education, Medication, SOS, Feedback, Behaviour, Admin research.
