# GitHub Actions (No Billing)

This runs the hotspot pipeline on a schedule using GitHub Actions.

## 1) Add secrets to your GitHub repo
Go to **Settings ? Secrets and variables ? Actions ? New repository secret** and add:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

For `FIREBASE_PRIVATE_KEY`, paste it exactly with line breaks, or use `\n` and the pipeline will normalize.

## 2) Workflow file
Already added:

- `.github/workflows/hotspot-pipeline.yml`

It runs every 6 hours and can be triggered manually (Run workflow).

## 3) Change schedule
Edit the cron in `.github/workflows/hotspot-pipeline.yml`.

## 4) Test
Go to Actions ? Hotspot Pipeline ? Run workflow.
