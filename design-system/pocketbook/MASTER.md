# Pocketbook Design System

## 1. Visual Direction
Warm paper ledger: calm, high-contrast personal finance workspace. No purple-blue gradients, no nested cards inside cards, no gray text on colored backgrounds, no decorative icons above headings.

## 2. Color Palette (WCAG AA 4.5:1+ verified)
- Background (`--bg`): `#FAF8F5`
- Surface (`--surface`): `#FFFFFF`
- Surface Alt (`--surface-alt`): `#F2EFE9`
- Border (`--border`): `#E2DDD5`
- Primary Text (`--text`): `#181A18` (16.5:1 on `#FFFFFF`)
- Muted Text (`--text-muted`): `#595E59` (6.3:1 on `#FFFFFF`, 6.0:1 on `#FAF8F5`)
- Primary Accent (`--primary`): `#134E4A` (9.5:1 with `#FFFFFF` text)
- Primary Hover (`--primary-hover`): `#0F3F3C`
- Primary Soft (`--primary-soft`): `#E6F2F0`
- Income (`--income`): `#15693B` (6.6:1 on `#FFFFFF`)
- Income Soft (`--income-soft`): `#E8F5EE`
- Expense (`--expense`): `#B91C1C` (6.4:1 on `#FFFFFF`)
- Expense Soft (`--expense-soft`): `#FDECEC`
- Warning (`--warning`): `#9A3412` (7.2:1 on `#FFFFFF`)
- Warning Soft (`--warning-soft`): `#FEF3E8`

## 3. Typography
- Display / Page Headings: `'Fraunces', Georgia, serif` (`--font-display`)
- Body / Controls: `'Plus Jakarta Sans', system-ui, sans-serif` (`--font-sans`)
- Numeric amounts: `font-variant-numeric: tabular-nums`
- Scale: `12px` (`--text-xs`), `14px` (`--text-sm`), `16px` (`--text-base`), `20px` (`--text-lg`), `24px` (`--text-xl`), `32px` (`--text-2xl`)

## 4. Spacing Scale (4px base)
- `--space-1`: `4px`
- `--space-2`: `8px`
- `--space-3`: `12px`
- `--space-4`: `16px`
- `--space-6`: `24px`
- `--space-8`: `32px`
- `--space-12`: `48px`

## 5. Radii & Focus
- `--radius-sm`: `6px`
- `--radius-md`: `10px`
- `--radius-lg`: `14px`
- Focus ring: `2px solid #134E4A` with `2px` offset on `:focus-visible`.
- Respect `@media (prefers-reduced-motion: reduce)` by disabling transitions and animations.
