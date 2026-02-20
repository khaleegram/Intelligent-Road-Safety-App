# Component Spec Library

## Coverage
- `Button` (`src/components/Button.tsx`)
- `Top App Bar / Island Bar` (`src/components/IslandBar.tsx`)
- `Card` (`src/components/IslandCard.tsx`)
- `Tag/Chip` (`src/components/GradientChip.tsx`)
- `Input` (`src/components/system/InputField.tsx`)
- `Select/Dropdown trigger` (`src/components/system/SelectField.tsx`)
- `Checkbox` (`src/components/system/CheckboxField.tsx`)
- `Radio` (`src/components/system/RadioField.tsx`)
- `Switch` (`src/components/system/ToggleSwitch.tsx`)
- `Modal/BottomSheet` (`src/components/system/ModalSheet.tsx`)
- `Toast` (`src/components/system/Toast.tsx`)
- `Alert/Banner` (`src/components/system/AlertBanner.tsx`)
- `Tabs` (`src/components/system/Tabs.tsx`)
- `List Item` (`src/components/system/ListItem.tsx`)
- `Skeleton Loader` (`src/components/system/SkeletonLoader.tsx`)
- `Empty State` (`src/components/system/EmptyState.tsx`)
- `Pagination` (`src/components/system/Pagination.tsx`)
- `Avatar` (`src/components/system/Avatar.tsx`)

## State Matrix
- Default
- Pressed
- Disabled
- Error (Input/Select/Banner)
- Selected (Tabs/Radio/Checkbox/Chip)
- Loading (Skeleton)
- Empty (EmptyState)

## Size Matrix
- `sm`
- `md`
- `lg`

## Token Mapping Rules
- Color only from `theme.tokens.color`
- Radius only from `theme.tokens.radius`
- Spacing only from `theme.tokens.spacing`
- Typography only from `theme.tokens.typography`
- Elevation only from `theme.tokens.elevation`

## Accessibility Rules
- Interactive controls expose role and label
- Minimum touch target `44x44`
- Non-color cue for selection state (icon or text weight where applicable)
- Form errors displayed inline
