---
name: AIShop Monochrome
description: Existing monochrome electronics storefront and administration system.
colors:
  ink: "#171717"
  ink-hover: "#343434"
  paper: "#ffffff"
  surface: "#f5f5f5"
  muted: "#626262"
  border: "#dedede"
  dark: "#211f24"
  dark-muted: "#c4c1c9"
  focus: "#777777"
  success: "#27634b"
  success-bg: "#e8f1ec"
  warning: "#855b0d"
  warning-bg: "#fff4dd"
  danger: "#a92e40"
  danger-bg: "#fdecef"
typography:
  display:
    fontFamily: Inter
    fontSize: "clamp(36px, 4.1vw, 58px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: Inter
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.03em"
  body:
    fontFamily: Inter
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: "6px"
  panel: "12px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
---

# Design System: AIShop

## Overview

**Creative North Star: "AIShop Monochrome"**

This records the user's approved visual system and its implemented refinement. Product photography carries the visual variety; navigation, forms and task controls use a restrained neutral palette. Storefront content helps shoppers browse and compare. Administration favors scanning and clear actions.

**Key Characteristics:**
- Monochrome controls, with semantic color reserved for actual statuses and errors.
- Supplied AIShop identity and real catalog data.
- Bosnian interface, KM prices and compact mobile browsing.

## Colors

### Primary

Ink is used for primary actions and main text. Paper provides contrast. Shared CSS primitives are defined in `frontend/src/theme.css` and referenced by the storefront and admin styles.

### Neutral

Surface separates panels without decorative elevation. Muted text remains readable. Dark is reserved for the storefront hero and the administration navigation.

**The Status Rule.** Green, amber and red communicate actual status; they are not decorative accents.

## Typography

Inter is self-hosted with its license under `frontend/public/fonts`. Headings use deliberate size and weight changes; body and form text prioritize legibility. Tracking must not be tighter than -0.04em. Prices, counts and table values use tabular numerals.

**The Reading Rule.** Labels stay explicit even when a mobile layout hides their visible text. Do not replace an accessible name with an icon.

## Layout

The storefront uses a bounded fluid container and three product columns on wide screens, reducing to two on narrow screens. The mobile hero is compact; catalog filters use a disclosure before results. The admin retains its approved sidebar, metric row and operational order/stock panels. All interactive touch targets have a 44px minimum in the refined surfaces.

Storefront and administration share the visual foundations described in this document.

## Elevation & Depth

Panels use tonal separation and borders. Avoid stacking borders with ornamental shadows. Modal backdrops and the floating assistant retain their functional layering. No decorative blue interaction glow belongs to the monochrome theme.

## Shapes

Controls use the control radius; reusable panels use the panel radius. Responsive layout may change grouping, but not the meaning of controls.

## Components

- Shared `Field`, `Image`, `PhotoNote`, `Status`, `Modal`, `Empty` and `ErrorState` live in `components/ui.jsx`.
- Hero imagery is eager and high priority; ordinary catalog imagery remains lazy.
- A single supplied photo does not constitute a multi-view gallery.
- Illustrative Unsplash photographs are identified as illustrative; verified manufacturer photography remains an open asset requirement.
- Admin order lists use existing customer data when available, with IDs retained and a safe fallback when user data is unavailable.
- Motion remains interruptible and respects reduced-motion preferences.

## Do's and Don'ts

### Do
- Preserve the supplied logo, monochrome direction, Bosnian language and KM formatting.
- Use shared neutral tokens and consistent touch/focus behavior.
- Make loading, empty, error and pending states truthful.
- Keep payment claims aligned with mock versus API behavior.

### Don't
- Invent manufacturer photography, customer claims, shipping promises or payment guarantees.
- Add fake alternate image views or decorative analytics.
- Replace the approved admin composition during a polish pass.
- Make controls depend on hover, color alone or a disappearing text label.
