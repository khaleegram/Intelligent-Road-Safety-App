# SEM Research Workflow

Structural Equation Modelling (SEM) supports the hybrid intelligence layer of SafeDrive NG. It is **not** part of the mobile runtime loop.

## Purpose

Estimate causal paths among constructs such as:

- Road infrastructure quality
- Driver behaviour attitudes
- Perceived risk
- Safety compliance
- Urban resilience outcomes

Outputs feed evidence-based policy recommendations shown to researchers/admins, alongside ML risk predictions.

## Recommended tools

- AMOS (as specified in the research architecture), or
- lavaan (R) / semopy (Python) for open workflows

## Export columns

`backend/research/export-sem-csv.mjs` writes:

**Core (from `accidents`):**  
`request_id`, `latitude`, `longitude`, `timestamp`, `severity`, `road_type`, `weather`, `vehicle_count`, `casualty_count`, `verified`

**Features (from `accident_features` when present):**  
`lighting_condition`, `road_surface`, `traffic_density`, `suspected_cause`, `vehicle_type`, `driver_age_band`, `speed_related`, `alcohol_related`, `seatbelt_used`, `time_of_day`, `day_of_week`, `urban_rural`, `junction_type`

Missing feature cells are blank (import richer datasets via `backend/ml/import-dataset.mjs` to populate them).  
No emails, phone numbers, or free-text PII are exported.

## Workflow

1. Ensure Firebase Admin credentials (`GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_*`).
2. Export:

```powershell
cd backend/research
npm install
npm run export:sem
# optional: node export-sem-csv.mjs --limit 5000
```

Output: `backend/research/output/sem-export-YYYY-MM-DD.csv`

3. Build the measurement model (Confirmatory Factor Analysis) in AMOS/lavaan.
4. Specify structural paths / hypotheses.
5. Estimate and assess fit (CFI, TLI, RMSEA, SRMR).
6. Document path coefficients and hypothesis results.
7. Summarize policy insights for the hybrid decision-support layer (admin ML metadata is already visible in the dashboard).

## Fit thresholds (guidance)

| Metric | Preferred |
|--------|-----------|
| CFI | ≥ 0.90 |
| TLI | ≥ 0.90 |
| RMSEA | ≤ 0.08 |
| SRMR | ≤ 0.08 |

## Data ethics

- Use de-identified exports only.
- Do not publish respondent-level contact data.
- Keep SEM artefacts under research governance, separate from driver-facing alerts.
