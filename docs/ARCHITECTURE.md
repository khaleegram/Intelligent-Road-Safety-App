# Architecture

## Overview
The system is a mobile app backed by Firebase, with Mapbox for map rendering.

## Modules (MVP)
- App foundation (navigation, global state)
- Data layer (Firestore access)
- Accident reporting
- Hotspot logic (rule-based)
- Map visualization
- Route warnings
- Offline support
- Basic settings

## Data Contracts
Accident Record
- id
- latitude
- longitude
- timestamp
- severity
- road_type
- weather
- vehicle_count
- casualty_count
- created_at

Hotspot Record
- area_id
- center_lat
- center_lng
- risk_score
- severity_level
- accident_count
- last_updated