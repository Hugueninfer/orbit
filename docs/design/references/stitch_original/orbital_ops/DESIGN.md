---
name: Orbital Ops
colors:
  surface: '#0a1422'
  surface-dim: '#0a1422'
  surface-bright: '#303a49'
  surface-container-lowest: '#050e1c'
  surface-container-low: '#121c2a'
  surface-container: '#16202f'
  surface-container-high: '#212a39'
  surface-container-highest: '#2c3545'
  on-surface: '#d9e3f7'
  on-surface-variant: '#c4c5d5'
  inverse-surface: '#d9e3f7'
  inverse-on-surface: '#273140'
  outline: '#8e909e'
  outline-variant: '#444653'
  surface-tint: '#b7c4ff'
  primary: '#b7c4ff'
  on-primary: '#002682'
  primary-container: '#7692ff'
  on-primary-container: '#002683'
  inverse-primary: '#3856bf'
  secondary: '#44e2cd'
  on-secondary: '#003731'
  secondary-container: '#03c6b2'
  on-secondary-container: '#004d44'
  tertiary: '#b8c4ff'
  on-tertiary: '#002486'
  tertiary-container: '#7992ff'
  on-tertiary-container: '#002588'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001552'
  on-primary-fixed-variant: '#193ca7'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#dde1ff'
  tertiary-fixed-dim: '#b8c4ff'
  on-tertiary-fixed: '#001354'
  on-tertiary-fixed-variant: '#0136bb'
  background: '#0a1422'
  on-background: '#d9e3f7'
  surface-variant: '#2c3545'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.025em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06em
  label-regular:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2: 0.125rem
  space-4: 0.25rem
  space-8: 0.5rem
  space-12: 0.75rem
  space-16: 1rem
  space-20: 1.25rem
  space-24: 1.5rem
  space-32: 2rem
  space-40: 2.5rem
  space-48: 3rem
  space-64: 4rem
  gutter-mobile: 1rem
  gutter-desktop: 1.5rem
  margin-mobile: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
---

## Brand & Style

The design system embodies a focused, technical workspace engineered for high-agency knowledge workers, software architects, and systems thinkers. It establishes a high-density, low-friction control plane that feels like an astronomical observatory crossed with an enterprise telemetry deck. The aesthetic fuses technical precision, restrained glass surfaces, and geometric orbital motifs without drifting into chaotic sci-fi tropes.

Key visual attributes:
- **Atmospheric Depth:** Deep-space navy canvases set a calm, circadian-friendly environment tailored for long stretches of deep focus.
- **Orbital Metaphor:** Fine hairline strokes (1px), subtle concentric paths, connection nodes, and soft spectral glows (blue, indigo, turquoise) establish relational context without adding noise.
- **Functional Discipline:** Strict information hierarchy, tight typographic control, predictable spatial rhythms, and zero decorative bloat.

## Colors

The palette relies on deep oceanic navies to reduce eye fatigue and deliver high visual comfort, accented by luminescent signals that prioritize visual scanning speed and systemic clarity.

### Base Surfaces
- **Canvas Base (`#07111F`):** Deepest viewport background, representing baseline space.
- **Sub-canvas / Sidebars (`#0B1728`):** Structural navigation, toolbars, and contextual shells.
- **Surface / Cards (`#101D31`):** Primary interactive cards, panels, and metric containers.
- **Surface Elevated (`#15243A`):** Modals, flyouts, contextual menus, and floating command bars.

### Lines & Dividers
- **Subtle Border (`#1B2A43`):** Internal cell splitters, quiet horizontal dividers.
- **Standard Structural Border (`#253653`):** Card perimeters, input edges, container dividers.
- **Active / Focused Border (`#7692FF`):** Focused states, active tabs, selected nodes.

### Accents & Indicators
- **Primary Accent (`#7692FF`):** Primary action items, key links, active indicators.
- **Intense Blue (`#5575F6`):** Primary button hover states, prominent progress fills.
- **Auxiliary Teal (`#2DD4BF`):** Orbit nodes, sync states, telemetry badges, auxiliary trackers.

### Feedback Signals
- **Success (`#34D399`):** Stable deployments, completed pipelines, healthy targets.
- **Warning (`#FBBF24`):** Threshold alerts, pending reviews, paused queues.
- **Critical / Danger (`#FB7185`):** Pipeline failures, blockers, destructive actions.

### Typographic Contrast
- **Text Primary (`#EEF4FF`):** High contrast (14.5:1 on surface) for titles, active states, and data readouts.
- **Text Secondary (`#94A3B8`):** Accessible secondary layer for metadata, labels, and system descriptions.
- **Text Muted (`#596A82`):** Placeholder text, hotkey indicators, disabled states.

## Typography

The type scale combines a modern sans-serif for reading and scanning with an engineering-grade monospaced face for telemetry, code snippets, keyboard shortcuts, and orbital node labels.

- **Proportional Engine (`Geist`):** Delivers clean geometry, exceptional tabular stability, and tight negative tracking at large display sizes. Headlines leverage light negative tracking (`-0.02em` to `-0.025em`) for modern density.
- **Technical Engine (`JetBrains Mono`):** Applied systematically to status badges, coordinates, latency indicators, log lines, and inline shortcuts. All monospaced uppercase labels must use `0.06em` letter spacing for fast legibility.
- **Numbers & Metrics:** Use tabular numbers (`font-variant-numeric: tabular-nums`) across all data grids, counter badges, and pipeline stages to avoid layout jitter during live telemetry updates.

## Layout & Spacing

The layout is built on a mathematical 8px base grid with a 4px half-step for micro-alignment (badges, icon pairings, input internal paddings).

### Grid Architecture
- **Desktop (>= 1280px):** 12-column fluid grid, 24px gutters, 32px safe margins. Shell consists of a fixed 64px/240px collapsable left operational rail, fluid main viewport, and an optional 360px contextual telemetry drawer.
- **Tablet (768px - 1279px):** 8-column layout, 20px gutters, 24px safe margins. The secondary orbital drawer collapses into an elevated overlay sheet.
- **Mobile (< 768px):** 4-column layout, 16px gutters, 16px margins. Primary navigation converts to a fixed bottom command dock (`h: 60px`). Complex orbital charts collapse into linear node lists with swipeable horizon tracks.

### Density Tiers
- **Comfortable (Default / Overview views):** Card inner padding: 20px - 24px; gap: 16px.
- **Compact (Telemetry / Task boards):** Card inner padding: 12px - 16px; gap: 8px.

## Elevation & Depth

This design system eschews muddy drop shadows in favor of tonal surface layering, 1px structural borders, and targeted soft-spectrum backglows.

### Surface Tiers
1. **Level 0 (Canvas):** `#07111F` — Infinite void backdrop.
2. **Level 1 (Dock & Rails):** `#0B1728` with a 1px solid `#1B2A43` right or bottom border.
3. **Level 2 (Cards & Panels):** `#101D31` with a 1px solid `#253653` perimeter.
4. **Level 3 (Elevated / Overlays):** `#15243A` with 1px solid `#253653`, paired with a deep atmospheric shadow: `0 16px 40px -8px rgba(3, 8, 16, 0.75), 0 0 0 1px rgba(118, 146, 255, 0.12)`.

### Orbital Glows & Accents
- **Node Active Glow:** Rather than high-contrast neon, active elements cast an ethereal indigo-blue radiance: `box-shadow: 0 0 20px 2px rgba(118, 146, 255, 0.18)`.
- **System Stable Pulse:** Nodes in sync apply a teal aura: `box-shadow: 0 0 16px 1px rgba(45, 212, 191, 0.15)`.
- **Backdrop Diffusion:** Modal backdrops utilize `background-color: rgba(7, 17, 31, 0.75)` combined with `backdrop-filter: blur(12px)`.

## Shapes

The shape hierarchy establishes clear contrast between high-level structural envelopes and interior interactive controls.

- **Primary Containers & Cards:** Radius of `16px` to `20px` (`rounded-2xl`). This softens data density and evokes smooth orbital pods.
- **Interactive Controls (Buttons, Inputs, Selectors):** Radius of `10px` to `12px` (`rounded-xl`), balancing quick touch-target recognition with ergonomic visual rhythm.
- **Micro Tokens (Chips, Status Pills, Badges):** Fully rounded pill geometry (`rounded-full`, 9999px) to contrast against rectangular cards.
- **Nodes & Waypoints:** Concentric circular geometries (`border-radius: 50%`) with inner 4px-8px dot cores and outer hairline orbital rings (1px border at 24px-32px diameters).

## Components

### Buttons
- **Primary:** Background `#7692FF`, text `#07111F` (font weight 600), height 40px, border-radius 10px, padding 0 16px. Hover: `#5575F6` with `box-shadow: 0 0 16px rgba(85, 117, 246, 0.35)`. Active: scale(0.98).
- **Secondary / Ghost:** Background `rgba(21, 36, 58, 0.6)`, text `#EEF4FF`, border 1px solid `#253653`, border-radius 10px. Hover: background `#15243A`, border-color `#7692FF`.
- **Danger:** Background `rgba(251, 113, 133, 0.12)`, text `#FB7185`, border 1px solid `rgba(251, 113, 133, 0.3)`. Hover: background `rgba(251, 113, 133, 0.22)`.

### Input Fields & Controls
- **Standard Input:** Background `#0B1728`, text `#EEF4FF`, placeholder `#596A82`, border 1px solid `#253653`, height 42px, radius 10px, typography `body-md`.
- **Focus State:** Border-color `#7692FF`, box-shadow `0 0 0 3px rgba(118, 146, 255, 0.15)`. No default browser outlines.
- **Checkboxes & Radios:** 18x18px box, background `#0B1728`, border 1.5px solid `#253653`, radius 4px (round for radios). Checked: background `#7692FF`, border-color `#7692FF`, inner tick mark `#07111F`.

### Badges, Chips & Status Pills
- **Status Indicator:** 24px height, radius 9999px, padding 0 10px. Uses monospaced `label-caps`.
  - *Healthy/Synced:* Background `rgba(45, 212, 191, 0.12)`, text `#2DD4BF`, 1px solid `rgba(45, 212, 191, 0.25)`.
  - *Running/Active:* Background `rgba(118, 146, 255, 0.12)`, text `#7692FF`, 1px solid `rgba(118, 146, 255, 0.25)`.
  - *Alert:* Background `rgba(251, 191, 36, 0.12)`, text `#FBBF24`, 1px solid `rgba(251, 191, 36, 0.25)`.
- **Hotkeys / KBD:** Background `#15243A`, border 1px solid `#253653`, border-radius 6px, text `#94A3B8`, font `JetBrains Mono`, size 11px, padding 2px 6px.

### Cards & Telemetry Pods
- **Default Card:** Background `#101D31`, border 1px solid `#253653`, radius 18px, padding 20px.
- **Interactive Card:** Transitions on hover with border-color `#7692FF`, translate-y: -1px, and `box-shadow: 0 8px 24px -4px rgba(7, 17, 31, 0.6), 0 0 16px -2px rgba(118, 146, 255, 0.12)`.

### Orbital Specific Patterns
- **Orbital Track / Rail:** 1px concentric arc or line with color `rgba(37, 54, 83, 0.7)`.
- **Orbital Node:** 10px circular pip `#7692FF`, surrounded by an 18px semi-transparent halo `rgba(118, 146, 255, 0.2)`. When pulsing, the halo scales smoothly between 18px and 26px with infinite ease-in-out timing (3s period).
- **Metric Stream Lists:** Flush-edge list items separated by 1px solid `#1B2A43`, with label in `Geist` and live numeric readouts in `JetBrains Mono`.