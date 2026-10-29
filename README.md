# Spectroscopy Lab

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

Read infrared, ¹H and ¹³C NMR and UV-Vis spectra against a 3D molecule: click a peak and the atoms behind
it light up, the molecule vibrates in that mode, or the orbital that absorbs is drawn on it. Built
with [SceneryStack](https://scenerystack.org/); runs offline as a Progressive Web App.

## Features

- **Infrared.** 34 molecules with B3LYP/def2-SVP Hessians computed for this sim. The browser runs
  the normal-mode analysis itself, so isotope substitution (a D₂O shake, all H → D, ¹³C, ¹⁸O, ³⁷Cl)
  recomputes the spectrum live. Click a band to animate its mode; functional-group regions,
  normal-mode sticks, line width, and transmittance or absorbance (Preferences). For HCl, a
  high-resolution view shows the rotation–vibration fine structure: P and R branches with no Q
  branch, a temperature slider that moves the envelope, and the H³⁷Cl partner of every line.
- **¹H NMR.** Equivalent protons from the molecular graph, chemical shifts from additivity
  rules, exact second-order line positions and intensities from the spin Hamiltonian (or the
  first-order n + 1 rule for comparison), integration, a D₂O shake, and a spectrometer slider
  (60–600 MHz) with a zoom that shows roofing at low field giving way to clean multiplets.
- **¹³C NMR.** One line per kind of carbon, additivity shifts, and ¹H-decoupled, DEPT-135, DEPT-90
  and ¹H-coupled spectra.
- **UV-Vis.** Hückel and particle-in-a-box (Kuhn) models for polyenes, acenes and cyanine dyes:
  energy-level diagram, π orbitals drawn as lobes on the molecule, predicted vs measured λmax,
  and the colour each would give in white light. A Beer–Lambert mode sets concentration and path
  length, puts the spectrum on an absolute scale, and plots a calibration line that bends over
  where stray light saturates the spectrometer.
- **Unknowns.** Identify an isomer from its formula, degree of unsaturation, molecular-ion
  cluster, IR and ¹H or ¹³C NMR spectra, over three levels.
- **Accessible:** keyboard operation throughout (rotate the molecule, step through atoms, peaks,
  signals and orbitals, each announced), live screen summaries, keyboard-help dialogs.
- English, French and Spanish; default and projector colour profiles; installable PWA.

## Quick Start

```bash
npm install
npm start        # dev server → http://localhost:5173
```

Molecule data is committed; regenerating it is optional and needs Python 3:

```bash
python3 -I scripts/qm/fetch_structures.py      # PubChem 3D conformers → scripts/qm/structures/
python3 -I scripts/qm/export_geometry.py       # geometry-only library files (NMR, UV-Vis)
python3 -m venv scripts/qm/.venv && scripts/qm/.venv/bin/pip install -r scripts/qm/requirements.txt
scripts/qm/.venv/bin/python -I scripts/qm/compute_vibrations.py   # B3LYP Hessians (hours)
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (includes memory-leak suite) |
| `npm run test:fuzz` | Optional Playwright fuzz smoke: pointer (`?fuzz`) + keyboard (`?fuzzBoard`), with `?ea`, 30s each |
| `npm run test:fuzz -- 90` | Same fuzz for 90 seconds (`--duration 90` or `FUZZ_DURATION=90` also work) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run test:fuzz:long` | Longer fuzz smoke (300s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run release` | `check && lint && build && test`, then version patch + push tags |
| `npm run clean` | Remove `dist/` |

New sims start at `version: "0.0.0"` in `package.json`. Bump only when cutting a release (for example `npm version patch` and a matching git tag). Keep `name` in kebab-case; it is separate from the SceneryStack sim identifier in `src/init.ts`, which reads its `version` from `package.json`.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^2 | PWA + service worker |
| [PySCF](https://pyscf.org/) + [geomeTRIC](https://github.com/leeping/geomeTRIC) | 2.14 / 1.1 | Offline B3LYP Hessians (dev-only, `scripts/qm/`) |

## License

GNU Affero General Public License v3.0 — see [OpenLyceum org license](https://github.com/OpenLyceum/.github/blob/main/LICENSE).

## Contributing

See [OpenLyceum contributing guidelines](https://github.com/OpenLyceum/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
