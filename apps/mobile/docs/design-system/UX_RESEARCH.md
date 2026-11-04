# UX Research & Redesign Brief

Why the current UI reads as 2/10, the 20 UX principles the rebuild is held to, the 20 products
we benchmark against, and the design language + screen blueprint that replaces what exists.

Grounded in: Nielsen's 10 usability heuristics (NN/g, 1994/2024), NN/g *Mobile UX: Limitations and
Strengths* (Budiu), Material 3 design tokens and bottom-sheet specs, Apple HIG *Designing for iOS*,
WCAG 2.2 AA, and the code audit of `apps/mobile/src` (16 screens, 20 components, 258 numeric style
literals in screens, 64 in components, 11 unused components).

---

## 0. The diagnosis (evidence, not taste)

The app does not look bad because it is plain. It looks bad because **every screen is a different
app**:

| Symptom | Evidence |
|---|---|
| Four visual languages | Gradient hero (Auth), floating island bar + rounded cards (public), edge-to-edge admin tabs, raw bordered rows |
| No hierarchy | Map screen stacks up to 8 banners before the map; Admin is one 3000px scroll with 27 hardcoded labels |
| Token system is fiction | Two parallel token APIs (`theme.tokens` + legacy `theme.colors/spacing/font`); `theme.spacing.lg`=24 vs `tokens.spacing[4]`=16 |
| Scale drift | Card radius 20, tabs 26, bar 24, markers 4/6/9 while docs define 8/12/16/24 |
| Accessibility regressions | 1.1:1 contrast text on hotspot card, 32–40px targets, no selected/disabled semantics, no live regions, no keyboard avoidance outside Auth |
| Dead weight | 11 of 20 components unused; `ScreenHeader` unused; Skeleton static; Toast never shown |
| Docs lie | `tokens.md` palette matches no code value; `screen-inventory.md` lists 8 of 16 screens; `accessibility.md` promises inline errors that no screen uses |

The rebuild fixes the **system**, then the screens. Restyling screens on top of the current token mess
will reproduce the same result.

---

## 1. Twenty UX skills the redesign is measured against

Each rule is written as an acceptance test, not an aspiration.

1. **Visibility of system status** — every async action shows state within 100 ms (pressed → loading →
   success/failure). No tap may ever be silent.
2. **Match the real world** — say "Report a crash", "Danger zone", "Confirmed by police", not
   `risk_predictions`, `sem_insights`, `CFI`. Translate DB enums at the edge, never render them raw.
3. **User control and freedom** — every flow has Cancel/Back; destructive actions confirm; SOS has a
   5-second cancel window; report drafts survive app death.
4. **Consistency and standards** — one token API, one Card, one Chip, one Banner, one Sheet, one tab bar.
   Platform conventions (swipe back, bottom sheet, 44dp targets) beat custom invention.
5. **Error prevention** — constrain inputs instead of validating after submit: no free-text coordinates,
   severity chips not blank fields, date pickers not typed dates, debounce before submit enables.
6. **Recognition over recall** — current location, time, severity and filters stay visible; recent
   searches and last-used report type are offered; nothing depends on remembering a previous screen.
7. **Flexibility and efficiency** — one-tap SOS and one-tap report from the map; optional research fields
   collapsed by default; power users can skip, novices can read.
8. **Aesthetic and minimalist design** — one primary action per screen, max two banners, no decorative
   gradient behind content, every element must justify the pixel it occupies.
9. **Error recovery** — plain-language message + cause + fix + retry button. `Alert.alert` is banned for
   validation; errors appear inline at the field.
10. **Help in context** — field hints, permission priming *before* the OS dialog, one-line explanations
    for metrics; no onboarding carousel that teaches what the UI should communicate itself.
11. **Thumb zone and reachability** — primary actions live in the bottom third; 44×44dp minimum (48 for
    map and driving contexts); bottom sheets replace centred modals; destructive actions never adjacent
    to primary ones.
12. **Progressive disclosure** — summary first, details on demand: hotspot card → sheet → full screen;
    one expanded article at a time; "Research details (optional)" stays collapsed.
13. **Information hierarchy and scanning** — a 4-step type scale, 3 text levels per card, one hero number,
    severity always encoded by icon + label + colour (never colour alone).
14. **Perceived performance** — cache-first paint, skeletons sized like real content, optimistic updates,
    zero layout shift on refresh; spinners only when there is genuinely nothing to show.
15. **Interruption tolerance** — 72-second sessions are the norm; state is saved per screen, offline
    queue is visible, forms resume where they stopped, no data is lost on backgrounding.
16. **Microcopy and tone** — active voice, specific verbs, sentence case, no exclamation marks, all four
    locales complete, errors say what to do next.
17. **Accessibility (WCAG 2.2 AA)** — 4.5:1 body text, 3:1 large text and UI borders, 24px absolute
    minimum target (44 in practice), roles/labels/states on every control, dynamic type to 200%,
    reduced-motion honoured, screen titles marked as headers.
18. **Purposeful motion** — 150–250 ms, ease-out, spatial continuity (sheet rises from the tapped card),
    never blocks input, respects `reduceMotion`.
19. **Trust and safety UX** — emergency actions unmistakable and confirmed, data freshness always
    visible ("updated 2 h ago"), permissions explained before requesting, privacy stated where data is
    collected.
20. **Design-system governance** — every style value comes from a token; components ship all states
    (default/pressed/focus/disabled/loading/error/selected); docs are generated from code, not written
    by hand; a screen that cannot be built from primitives gets a new primitive, not a local style.

---

## 2. Twenty comparable products and what to take

| # | Product | Steal | Avoid |
|---|---|---|---|
| 1 | **Waze** | Map-first layout; one-tap report FAB; nearby alerts as cards, not banners | Animated clutter, gamification noise, social feed creep |
| 2 | **Google Maps** | Incident-report sheet with icon grid; search-first header; map controls in a fixed column | Gesture-only actions, hidden long-press layers |
| 3 | **Apple Maps** | Restrained palette; sheet with detents; "Report an Issue" progressive flow | Assuming iOS-only patterns |
| 4 | **Life360** | "Everyone is safe" status hero; circle avatars; SOS pinned | Paywall density, notification spam |
| 5 | **Noonlight** | Press-and-hold SOS with countdown and cancel | Requiring account setup before emergency action |
| 6 | **bSafe** | Guardian/Follower model; one-tap check-in | Feature sprawl across unrelated tabs |
| 7 | **Nexar** | Evidence-first crash capture; severity classification; trip clips | Dashcam hardware coupling |
| 8 | **Zutobi** | Bite-size lessons with progress; quiz after reading | Cartoon mascots in a safety context |
| 9 | **Duolingo** | Progress ring and streak mechanics | Loud colour and playful tone for crash data |
| 10 | **Flo** | Calm, private data visualisation; soft cards; sensitive-topic copy | Pink-coded gender assumptions |
| 11 | **Strava** | Post-trip recap card: map, distance, duration, elevation | Social leaderboards on safety data |
| 12 | **Uber** | Map + bottom sheet + one persistent primary CTA; sheet detents | Surge-style dark patterns |
| 13 | **Citymapper** | Disruption status chips with time context | Dense transit jargon |
| 14 | **Airbnb** | Spacing discipline; card hierarchy; image-led sections | Marketing carousels inside task flows |
| 15 | **Revolut / Monzo** | Big-number stat tiles; segmented controls; financial-grade clarity | Decorative charts with no decision value |
| 16 | **Wise** | Plain-language forms; inline validation; step-by-step disclosure | Multi-page KYC length |
| 17 | **TomTom AmiGO** | Glanceable driving HUD: speed, hazard, next alert | Always-on alerts that desensitise |
| 18 | **HERE WeGo** | Offline-first map states and explicit download status | Desktop-density menus |
| 19 | **FRSC / Nigerian road-safety portals** | Local terminology, black-spot framing, emergency numbers | PDF-first information architecture |
| 20 | **Linear / Notion mobile** | Command-style search, empty states with a next action, restrained neutrals | Power-user density for first-time users |

Cross-cutting conclusion: every strong product in this list uses **one surface language, one accent,
one primary action per screen, and a map or number as the hero**. None of them wrap the map inside a
scrollable card stack.

---

## 3. Design language proposal

### 3.1 Principles

1. **The map is the product, not a widget.** Full-bleed map on the home tab; controls float, content
   arrives in a sheet with detents (peek / half / full).
2. **Risk is the only loud colour.** Neutrals carry the interface; severity uses a fixed 4-step ramp
   (Fatal red, Critical amber, Minor blue, Damage-only slate) with icon + label.
3. **One primary action per screen.** Everything else is secondary or in an overflow sheet.
4. **Numbers as heroes.** Stat tiles with 32–40px figures and 12–13px labels, not paragraphs.
5. **Calm by default, urgent on demand.** Neutral surfaces, generous spacing; urgency is expressed by
   a single banner or a modal, never a stack of eight.
6. **Every state is designed.** Loading, empty, error, offline, permission-denied, stale data.

### 3.2 Token architecture (single API)

Replace the dual API with **one** `theme` object, resolved from a reference palette:

```
theme.color.{bg, surface, surfaceRaised, border, text, textMuted, textInverse,
             accent, accentPressed, accentSoft, success, warning, danger, info,
             severity.{fatal,critical,minor,damage}}
theme.space.{0,1,2,3,4,5,6,8,10,12}        // 0,4,8,12,16,20,24,32,40,48 (8pt grid)
theme.radius.{sm,md,lg,xl,full}            // 8,12,16,24,999
theme.type.{display,title,heading,body,label,caption}  // size + lineHeight + weight bundled
theme.elevation.{flat,raised,floating,overlay}         // 3 levels, shadow + border
theme.motion.{fast,normal,slow,easing}     // 150/220/320
```

Hard rules: no hex outside `theme.tsx`; no numeric `fontSize`, `padding`, `borderRadius` inside screens;
no legacy aliases (`theme.colors`, `theme.spacing`, `theme.font`) — delete them and fix call sites so
the compiler finds every violation.

### 3.3 Typography

| Role | Size / line | Weight | Use |
|---|---|---|---|
| `display` | 32 / 38 | 700 | One hero number per screen |
| `title` | 24 / 30 | 700 | Screen title |
| `heading` | 18 / 24 | 600 | Card title, section header |
| `body` | 15 / 22 | 400 | Prose, form values |
| `label` | 13 / 18 | 600 | Field labels, chips, tab labels |
| `caption` | 12 / 16 | 500 | Metadata, timestamps, units |

Minimum on-screen size: 12. Admin metadata at 10px is removed. Dynamic type supported to 200% with
`maxFontSizeMultiplier` only where a fixed HUD requires it.

### 3.4 Spacing and layout

- Screen gutter: **20**. Section gap: **24**. Card padding: **16** (compact) / **20** (default).
- Card radius: **16**. Sheet top radius: **24**. Chips: full. Buttons: **14** (or full for pills).
- Touch targets: **44 minimum**, **48** on map/driving surfaces.
- Public tabs: standard bottom tab bar, 56 + safe area, icon + 11px label, no floating pill.
- Admin: same tab bar, plus a real header (`PageHeader`) with back and one overflow menu.

### 3.5 Component contract

| Component | States that must exist | Notes |
|---|---|---|
| `Button` | default, pressed, focus, disabled, **loading**, destructive, icon-only | 3 variants only: primary, secondary, ghost |
| `IconButton` | default, pressed, disabled, badge | 44×44, required label |
| `Chip` | default, selected, disabled | `accessibilityState.selected`; 44 high; icon slot |
| `Card` | flat, raised, interactive | one radius, one shadow, optional onPress with role |
| `Banner` | info, success, warning, error | `role="alert"` live region; optional action; max 2 per screen |
| `Sheet` | peek/half/full, dismissible | modal semantics, drag handle 48dp, close button, safe area |
| `PageHeader` | root, detail (back), admin (overflow) | title as `header`, 44dp actions |
| `StatTile` | loading, value, delta | big number + label + optional trend |
| `Field` | default, focused, filled, error, disabled | label programmatically associated, error live region, keyboard avoidance |
| `Stepper` | value, min/max, disabled | 44dp buttons |
| `EmptyState` | empty, error, offline | icon + title + one action |
| `Skeleton` | shimmering | sized to final content |

### 3.6 Screen blueprint

**Map (home).** Full-bleed Mapbox. Top: compact search pill + one overflow icon (not five 38px actions).
Bottom: draggable sheet — peek shows "Near you" (2–3 nearest danger zones as rows with severity icon,
distance, "updated X ago"); half shows filter chips + list; full shows search and legend. Persistent
report FAB above the tab bar. One banner slot maximum, reserved for offline/permission. Stale data is a
row in the sheet, not a banner.

**Report.** Three steps in one scroll with a sticky progress header: *Where* (map pin + GPS + search),
*What* (severity chips, road, weather, vehicles, casualties using Steppers), *Details* (optional research
fields collapsed, photos, notes). Sticky bottom bar: one primary "Submit report", secondary "Save draft".
Inline validation, offline queue chip, confirmation screen with reference ID.

**Auth.** Single card, no gradient hero. Email + password, inline errors, password reveal, one primary
CTA, one text link to switch mode, forgot-password as a third link. Biometric unlock after first login.

**Settings.** Grouped list with 3 sections: *Alerts*, *Appearance & language*, *Data & privacy*. Row =
label + value + chevron (or switch). Module hub (Education, Medication, Behaviour, Feedback, SOS) moves
to a "More" tab or Profile, not duplicated in both.

**Admin.** KPI row (4 StatTiles), one alert banner, segmented control (Overview / Reports / Hotspots /
Users), filter sheet, virtualised list with status chips and one action per row. Research insights card
shows a plain-language sentence plus expandable metrics.

**Detail screens.** Hero summary card (severity + place + time), map thumbnail, key facts grid, one
primary action, destructive action in overflow with confirmation.

### 3.7 What gets deleted

`ScreenHeader`, `TagChip`, `Pagination` (replace with infinite list), static `SkeletonLoader`,
`AlertBanner` + `Toast` merged into `Banner`, Settings' local `Chip`, all local `statBox` / `listRow` /
`spikeBanner` / `alertCard` / `routeWarning` / `coordinatePill` / `banner` styles, and the legacy
`theme.colors/spacing/font` API.

---

## 4. Migration plan

| Phase | Scope | Acceptance |
|---|---|---|
| 1 | Tokens + theme API collapse | `tsc` fails on every legacy token use, then passes; no hex outside `theme.tsx` |
| 2 | Core primitives (Button, IconButton, Chip, Card, Banner, Sheet, PageHeader, Field, StatTile, Stepper, EmptyState, Skeleton) | Story-style demo screen renders every state; a11y roles/states verified |
| 3 | Navigation shell (tabs, headers, back behaviour) | One tab bar, one header pattern, swipe-back works on Android and iOS |
| 4 | Map + Report (the two core jobs) | Map full-bleed with sheet; report completes in ≤ 3 screens with inline validation |
| 5 | Auth, Settings, Profile | One CTA per screen; all strings localised |
| 6 | Admin + detail screens | KPI tiles, virtualised lists, plain-language metrics |
| 7 | Secondary modules (SOS, Education, Medication, Behaviour, Feedback) | Same primitives, no local styles |
| 8 | i18n + accessibility sweep | Zero hardcoded strings, axe-equivalent manual pass, 200% text, reduced motion |

Definition of done for every screen: one primary action, ≤ 2 banners, all states designed, all strings
translated, all targets ≥ 44, contrast ≥ 4.5:1, no literal style values.
