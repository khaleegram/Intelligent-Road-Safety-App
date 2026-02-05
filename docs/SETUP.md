# Project Setup

This document covers local setup for the Intelligent Road Safety app.

## Prerequisites
- Node.js LTS
- Expo CLI (via npx)
- Firebase project (Firestore enabled)
- Mapbox account and token

## Repo Layout
- apps/mobile: Expo app
- backend/firebase: Firestore rules and indexes
- docs: Project docs
- scripts: setup helpers
- shared: shared types/constants (future)

## Environment
Copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in:

EXPO_PUBLIC_MAPBOX_TOKEN=your_token_here
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=your_secret_download_token_here
EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here

## Run
From `apps/mobile`:
- Install dependencies: `npm install`
- Start: `npx expo start`

## Mapbox notes
Using `@rnmapbox/maps` requires a dev client or prebuild (Expo Go does not support it).
