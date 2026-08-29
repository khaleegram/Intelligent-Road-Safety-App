# Architecture

## Project title

**Developing an Integrated Model to Enhance Road Safety and Promote Urban Resilience in Nigeria**

## Product

**SafeDrive NG** — an adaptive, multilingual (English, Hausa, Yoruba, Igbo) mobile application backed by Firebase and Mapbox.

## System overview

```
Data Acquisition → ML + SEM Analytics → Hybrid Decision Support → SafeDrive NG App → Resilience Outcomes
```

### 1. Data acquisition and pre-processing

Primary sources: FRSC / police records, infrastructure and behaviour surveys, mobile app reports, observation checklists.  
Secondary sources: NiMet weather, traffic volume, satellite/GIS, literature, government reports.  
Pipeline: consolidate → clean → transform / feature-engineer → structured Firestore datasets (`accidents`, `accident_features`, import runs).

### 2. Integrated analytical framework

| Path | Role | Status |
|------|------|--------|
| **ML** | Accident risk prediction and hotspot identification | Partial — training + advisory `risk_predictions` publish (GitHub Actions) |
| **SEM** | Causal path analysis and hypothesis testing | Exists as research export tooling (`backend/research`) — not in mobile loop |
| **Hybrid** | Combine ML predictions with SEM insights | Partial — admin shows ML model metadata; full policy UI deferred |

### 3. SafeDrive NG mobile application

| Module | Status |
|--------|--------|
| User registration and authentication | Exists |
| Real-time GPS tracking | Partial (map / report location) |
| Accident risk prediction and hotspot alerts | Partial (rule-based + advisory ML banner) |
| Safety alerts and notifications | Partial (local + Expo push token registration) |
| Weather and traffic information | Exists (Open-Meteo + Mapbox congestion hints) |
| Emergency contact and SOS | Exists |
| Road safety education and awareness | Exists |
| Medication safety checker | Exists |
| Driver behaviour monitoring | Exists (opt-in) |
| Feedback, reports, and analytics | Exists |
| Offline functionality | Partial (queue + cache + NetInfo sync) |
| Adaptive UI (theme + breakpoints) | Exists |
| Multilingual EN / HA / YO / IG | Exists |

## Technical stack

- **Mobile:** Expo / React Native, Mapbox, Firebase Auth + Firestore (+ App Check debug path)
- **Backend:** Firestore rules/indexes, hotspot pipeline (GitHub Actions), ML import/publish, SEM export
- **Maps:** `@rnmapbox/maps` (dev client / prebuild required)

## Go-live

See [GO_LIVE.md](GO_LIVE.md) and [SETUP.md](SETUP.md).

## Core data contracts

See [DATA_CONTRACT.md](../DATA_CONTRACT.md).

## Expected outcomes

- Real-time accident risk prediction and hotspot identification
- Evidence-based policy recommendations (hybrid ML + SEM)
- Improved driver behaviour and safety awareness
- Reduction in road traffic accidents and fatalities
- Enhanced transportation resilience in Nigeria
