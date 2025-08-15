# Gas Rate Calculator&nbsp;· Boiler Brain

A lightweight, offline‑capable **gas‑rate & heat‑input calculator** embedded in the Boiler Brain web app. It lets domestic gas engineers confirm an appliance’s burn rate in under 90 seconds—with no ads, sign‑in, or external calls.

---

## ✨  Features

| Function | Details |
|----------|---------|
| **Metric timer** | 1‑ or 2‑minute test, auto‑timer, kWh ⇢ kW conversion |
| **Imperial dial** | Revolutions + seconds fields, automatic ft³ → m³ |
| **Gas type switch** | Natural Gas & LPG presets (editable CV, correction factor) |
| **Results** | Gross kW, Net kW (≈ 90 % of gross), BTU/h, % of nominal |
| **History** | Last 20 tests cached locally, copy/share/PDF export |
| **PWA** | Works completely offline once loaded, install prompt after 3 uses |

---

## 🚀  Quick Start (Dev)

```bash
# 1. Clone monorepo (if you haven’t already)
$ git clone git@github.com:your‑org/boiler‑brain.git
$ cd boiler‑brain

# 2. Install deps (pnpm or npm)
$ pnpm install

# 3. Run the dev server and open Boiler Brain
$ pnpm dev
```
The calculator lives under **`apps/gas‑rate`** and mounts at **`/tools/gas‑rate`**.

---

## 🧮  Calculation Logic

```text
m³ h⁻¹ = (final_reading − initial_reading) × 3 600 / seconds
Gross kW = m³ h⁻¹ × CVₖWh/m³       # NG default: 10.91, LPG: 25.71
Net kW   = Gross kW × 0.9           # assumes 10 % latent loss
BTU/h    = Gross kW × 3 412
```
Imperial pathway: `ft³ = dial_revs × dial_value`, then convert `ft³ → m³ (÷ 35.315)` before the same steps.

---

## 🗂️  Folder Structure (excerpt)

```
apps/
  gas‑rate/
    src/
      components/
        TimerButton.tsx
        ResultCard.tsx
      hooks/
        useGasRate.ts
      utils/
        calc.ts            # all maths + unit tests
    public/
      icon.svg
    index.tsx              # micro‑frontend entry
```

---

## 🛠️  Built With

- **React 18 + TypeScript** – shared UI tokens from Boiler Brain design system
- **Vite** – fast HMR and ~25 kB gzipped bundle
- **Zustand** – tiny global store, persists to `localStorage`
- **Vitest** – unit tests for all calculator paths
- **Playwright** – E2E timer accuracy & offline mode

---

## ✅  Testing

```bash
# Run unit tests
$ pnpm test:unit

# Run E2E suite (headless by default)
$ pnpm test:e2e
```

### Acceptance Checklist
- [ ] 1‑min metric test within ±0.05 kW of reference value
- [ ] Imperial dial matches manufacturer sheet example
- [ ] Timer continues counting when tabbed away (RAf fallback)
- [ ] No network requests in offline mode
- [ ] Axe‑core scores 0 critical issues

---

## ♿  Accessibility

- WCAG 2.2 AA colour contrast
- 44 × 44 px touch targets
- Full keyboard path & screen‑reader labels

---

## 🔄  Release & Versioning

Semantic versioning, surfaced via *Settings → About*.
Deployments to production are handled by the root GitHub Action that builds & uploads the static PWA bundle to our CDN.

---

## 🤝  Contributing

1. Create a feature branch: `git checkout -b feat/your‑topic`
2. Commit + push; open a PR against `main`.
3. PR template will run lint, unit & E2E.

Found a bug? Open an issue with **input values, expected vs actual output, environmental details**.

---

## 📄  License

© 2025 Boiler Brain Ltd. Internal use only unless stated otherwise.
