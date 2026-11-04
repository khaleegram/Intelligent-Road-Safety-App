# Design Tokens

> Source of truth: `src/theme.tsx`. Night Drive is dark-first.
> New code uses `theme.color`, `theme.space`, `theme.radius`, `theme.type`,
> `theme.elevation` and `theme.motion`. The legacy `tokens`/`colors`/`spacing`/`font`
> aliases exist only for migration and are deleted at the end of the redesign.

## Color
- `color.primary` / `primaryHover` / `primaryActive`
- `color.secondary`
- `color.background`
- `color.surface`
- `color.surfaceElevated`
- `color.textPrimary` / `textSecondary` / `textInverse`
- `color.border`
- `color.success` / `warning` / `error` / `info`
- `color.focusRing`

### Light
- `primary`: `#c2410c`
- `primaryHover`: `#ea580c`
- `primaryActive`: `#9a3412`
- `secondary`: `#175cd3`
- `background`: `#f6f7f9`
- `surface`: `#ffffff`
- `surfaceElevated`: `#f1f3f7`
- `textPrimary`: `#0b1220`
- `textSecondary`: `#5b6779`
- `textInverse`: `#ffffff`
- `border`: `#dde3ea`
- `success`: `#067647`
- `warning`: `#b54708`
- `error`: `#d92d20`
- `info`: `#175cd3`
- `focusRing`: `#c2410c`

### Dark (default)
- `primary`: `#f5a524`
- `primaryHover`: `#ffb84d`
- `primaryActive`: `#e08e0b`
- `secondary`: `#4ea8ff`
- `background`: `#080b10`
- `surface`: `#10151d`
- `surfaceElevated`: `#161d28`
- `textPrimary`: `#f2f5f9`
- `textSecondary`: `#9aa7ba`
- `textInverse`: `#0a0e14`
- `border`: `#232c3a`
- `success`: `#34d399`
- `warning`: `#fbbf24`
- `error`: `#ff5a5f`
- `info`: `#4ea8ff`
- `focusRing`: `#ffc14d`

## Typography
Bundled roles (`theme.type.<role>`), each with size, line height, weight and tracking:
- `display`: 32 / 38 / 700 / -0.5
- `title`: 24 / 30 / 700 / -0.3
- `heading`: 18 / 24 / 600 / 0
- `body`: 15 / 22 / 400 / 0
- `label`: 13 / 18 / 600 / 0.1
- `caption`: 12 / 16 / 500 / 0.1

Raw scale (`tokens.typography`) is legacy; new code uses the roles above.
Minimum rendered size: 12.

## Spacing
- `space.0`: `0`
- `space.1`: `4`
- `space.2`: `8`
- `space.3`: `12`
- `space.4`: `16`
- `space.5`: `20`
- `space.6`: `24`
- `space.8`: `32`
- `space.10`: `40`
- `space.12`: `48`

## Radius
- `radius.sm`: `8`
- `radius.md`: `12`
- `radius.lg`: `16`
- `radius.xl`: `24`
- `radius.full`: `9999`

## Elevation
- `elevation.flat`
- `elevation.raised`
- `elevation.floating`
- `elevation.overlay`

## Motion
- `motion.fast`: `120`
- `motion.normal`: `220`
- `motion.slow`: `320`
- `easing.standard`: `cubic-bezier(0.2,0,0,1)`
- `easing.emphasized`: `cubic-bezier(0.2,0,0,1.2)`

## Layout
- `breakpoints.mobile`: `0`
- `breakpoints.tablet`: `600`
- `breakpoints.desktop`: `1024`
- `breakpoints.wide`: `1440`
- `containerPadding.mobile`: `16`
- `containerPadding.tablet`: `24`
- `maxContentWidth`: `1200`
- `maxReadingWidth`: `720`
- `grid.mobile`: `4`
- `grid.tablet`: `8`
- `grid.desktop`: `12`
