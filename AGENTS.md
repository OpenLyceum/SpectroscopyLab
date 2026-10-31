# AGENTS.md — Spectroscopy Lab

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Read infrared, ¹H/¹³C NMR and UV-Vis spectra against a 3D molecule: click a peak and the atoms
behind it light up (or the molecule vibrates in that mode); click an atom and its peak lights up.
Four screens:

| Screen | Model |
|---|---|
| Infrared | In-browser normal-mode analysis of an offline B3LYP Hessian; isotope substitution re-diagonalises with new masses; HCl rotation–vibration fine structure (P/R branches, temperature, ³⁵Cl/³⁷Cl) |
| NMR | ¹H: topological equivalence, additivity shift rules, exact spin-Hamiltonian (second-order) or first-order lines, field slider with multiplet zoom, D₂O shake. ¹³C: additivity shifts, decoupled / DEPT-135 / DEPT-90 / coupled |
| UV-Vis | Hückel (per-family linear calibration) and Kuhn particle-in-a-box; energy levels, orbital lobes, perceived colour; Beer–Lambert mode with calibration plot and stray light |
| Unknowns | Identify an isomer from formula, unsaturation, molecular ion, IR and ¹H or ¹³C NMR; three levels |

Physics and every constant: [`doc/model.md`](doc/model.md). Architecture: [`doc/implementation-notes.md`](doc/implementation-notes.md).

### The one thing to understand first

**The QM is offline; the physics is live.** `scripts/qm/compute_vibrations.py` (PySCF, B3LYP/
def2-SVP) ships each molecule's optimised geometry, bond orders (from the PubChem SDF), Cartesian
**Hessian** and **dipole derivatives** — not frequencies. `NormalModeAnalysis.ts` mass-weights the
Hessian, projects out translations/rotations, diagonalises (`math/symmetricEigen.ts`, Jacobi) and
computes IR intensities, so changing an isotope only changes masses. Never hand-edit
`library/data/*.json`; rerun the script.

## Key files

| File | Purpose |
|---|---|
| `scripts/qm/molecules.json` | Molecule catalogue: id, PubChem CID, expected formula (checked on fetch) |
| `scripts/qm/fetch_structures.py` | PubChem 3D SDF → `scripts/qm/structures/` |
| `scripts/qm/compute_vibrations.py` | SDF → optimise → Hessian + dipole derivatives → `src/common/model/library/data/<id>.json` |
| `scripts/qm/export_geometry.py` | Geometry-only `library/structures/<id>.json` for all molecules + generated streptocyanines |
| **Pure model** (`src/common/model/`) | **no Scenery imports except axon in `MoleculeViewModel`/`MoleculeChooser`; unit-tested** |
| `Molecule.ts` | Molecule type + JSON loader/validator, neighbour lists |
| `Isotopes.ts` | AME2020 isotope masses (most abundant first) |
| `math/symmetricEigen.ts` | Cyclic Jacobi eigen-solver (dot's `EigenvalueDecomposition.getV()` throws in scenerystack 3.0) |
| `vibrations/NormalModeAnalysis.ts` | Mass-weighting, Eckart projection, modes, intensities (km/mol), reduced masses |
| `vibrations/ModeCharacter.ts` | "C=O stretch" / "H–C–H bend" from an energy-weighted internal-coordinate analysis |
| `SpectrumCurve.ts` | Lorentzian broadening of stick spectra |
| `library/SpectroscopyLibrary.ts` | Library entries + families; lazy `import.meta.glob` of the data files |
| `MoleculeViewModel.ts` | Viewer state: molecule, camera, hover, highlights, labels, animated displacement, orbital lobes |
| `MoleculeChooser.ts` | Family → molecule choice with one selection Property per family (ComboBox needs values from its own items) |
| `structure/` | `Elements`, `Geometry`, `Rotation3` copied from MolScope |
| **View** (`src/common/view/`) | |
| `MoleculeRenderer.ts` / `MoleculeViewerNode.ts` | Ball-and-stick canvas renderer + input, trimmed from MolScope (no cartoons, cells, console) |
| `SpectrumChartNode.ts` | bamboo chart: curve, sticks, shaded regions, cursor; click-to-pick, arrow keys step peaks; optional x/y range and x tick Properties |
| `MoleculeChooserNode.ts` / `ControlFactory.ts` | Family/molecule combo boxes; themed control builders |
| `MoleculeGraph.ts` | Aromatic-ring perception, Morgan symmetry classes, bond-order and functional-group helpers |
| `MoleculeThumbnailNode.ts` | Still ball-and-stick picture (Unknowns answer buttons) |
| `src/infrared/` | IR model (isotope schemes, peaks, transmittance/absorbance) and view |
| `src/infrared/model/RotationalFineStructure.ts` | Diatomic P/R lines from ν₀ (Hessian), B (B3LYP r_e), measured α_e; isotopologues at natural abundance |
| `src/nmr/model/ChemicalShiftRules.ts` / `ProtonSpectrum.ts` | Shift additivity rules; environments, ³J couplings, multiplets |
| `src/nmr/model/SpinSystem.ts` | Exact ¹H lines: spin Hamiltonian per coupled group, block-diagonal by Iz; first-order fallback above 9 spins |
| `src/nmr/model/CarbonSpectrum.ts` | ¹³C environments, additivity shifts, decoupled/DEPT/coupled lines |
| `src/nmr/model/NMRModel.ts` | Nucleus, field, D₂O, TMS, integral, zoom; `fullSpectrum`/`carbonSpectrum`/`integralTrace` reused by Unknowns |
| `src/uv-vis/model/PiSystem.ts` | π atoms/electrons, Hückel matrix, Kuhn box, orbital lobes |
| `src/uv-vis/model/UVVisModel.ts` | Measured λmax and approximate ε tables (with sources), per-family Hückel calibration, band + colour, Beer–Lambert with stray light |
| `src/uv-vis/model/PerceivedColor.ts` | CIE 1931 (Wyman–Sloan–Shirley fit) → white-balanced sRGB |
| `src/unknowns/model/` | `MolecularFormula.ts` (Hill formula, unsaturation, M/M+1/M+2), `UnknownsModel.ts` (families, scoring) |

## Accessibility

- The viewer is a focusable `div` (arrows rotate, +/− zoom, Home resets, N/P walk atoms with an
  announcement, Enter/Space picks). The spectrum chart is focusable too: arrow keys step through
  peaks (announced via `addAccessibleResponse`), Escape clears. Keys live in
  `SpectroscopyLabHotkeyData.ts` and feed both listeners and the keyboard-help dialog.
- Screen summaries have a **live** current-details paragraph naming the molecule and selected peak.
- Charts configured with `focusable: false` still accept pointer picks, but must not request focus.
- Unknowns candidate text and accessible names bind to localized molecule-name Properties;
  feedback and clue patterns must also update when the locale changes within a round.

## Runtime contracts

- Carbon spectrum sampling and chart transforms share derived ranges. Keep the default
  −5…225 ppm full range and ±6 ppm zoom as minima; expand for actual coupled components plus
  1 ppm margin at low fields. Zoom tick spacing adapts to the expanded window.
- Requesting an unknown immediately clears old clues/candidates and sets `isLoadingProperty`.
  Guesses are ineligible until the current load generation completes. Late successes/failures
  must not alter a newer request, including after Reset. Preserve the previous target separately
  so clearing the question does not remove the avoid-repeat behavior.

## Compliance carve-outs

- **Data colours outside `SpectroscopyLabColors.ts`.** Atom colours are CPK data
  (`common/model/AtomStyle.ts`, Jmol's table in `structure/Elements.ts`), as in MolScope.
- **`src/common/model/library/data/` and `scripts/qm/structures/`** are generated data, excluded
  from Biome in `biome.json`.
- **`scripts/qm/`** is a dev-only Python pipeline with its own gitignored `.venv`; CI never runs it.

### Template-owned files (drift-checked)

Infrastructure files are owned by this template and must stay byte-identical in every sim
(after substituting the sim's own name). `Baton/scripts/check-template-drift.sh <Sim>` compares a
sim against this repo using `Baton/config/template-manifest.json`, which lists the exact files,
the required `package.json` scripts, and the few keys a sim may extend (extra `biome.json`
ignores, extra tsconfig `types`, CSP/Permissions additions).

To diverge on purpose, add a bullet to the sim's own `## Compliance carve-outs` section naming
the file in backticks and the reason, e.g. ``- `tests/setup.ts`: adds a WebGPU mock``. The drift
checker treats a file named there as approved. Fix template-owned files **here first**, then
propagate — never hand-edit one in a single sim.

### `package.json` overrides

JSON cannot carry comments, so the rationale for forced transitive pins lives here. Prefer
**tilde (`~`) or exact** versions — caret (`^`) lets minors drift under what is meant to be a
hard pin. Dependabot ignores these three names (see `.github/dependabot.yml`) so it does not
open PRs that fight the overrides. Revisit when SceneryStack drops or re-pins them upstream.

| Override | Pin | Why |
|---|---|---|
| `lodash` | `~4.18.1` | SceneryStack declares `~4.17.12`. Bump clears Dependabot/npm advisories patched in 4.18.x (e.g. GHSA-r5fr-rjxr-66jc, GHSA-f23m-r3pf-42rh). |
| `three` | `~0.137.5` | SceneryStack declares `^0.104.0` and types against `@types/three` `~0.137.0` (its `mobius` package). 0.125.0 was the floor for GHSA-fq6p-x6j3-cmmq (ReDoS); 0.137.0 fixes the loader XSS GHSA-7vvq-7r29-5vg3. This sim never imports `three` or `mobius`. Stay on the 0.137 line while those types do. Remove the override if SceneryStack drops `three` or pins a newer line itself. |
| `brace-expansion` | `~5.0.12` | Transitive via `vite-plugin-pwa` / Workbox. Clears npm audit (originally GHSA-mh99-v99m-4gvg; keep ≥5.0.9 for GHSA-rgw5-rvv9-x895; ≥5.0.12 for the CPU-DoS advisory). |

## Testing

Fleet-standard Vitest layout (keep when forking):

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment; `setupFiles: ["./tests/setup.ts"]`; `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/common/normal-modes.test.ts` | NMA against B3LYP data + experiment: mode counts, fundamentals, CO₂ selection rule, D₂O and ³⁷Cl shifts |
| `tests/infrared/infrared-model.test.ts` | Mode naming, isotope schemes (D₂O shake), transmittance curve |
| `tests/infrared/fine-structure.test.ts` | HCl P/R lines: no Q branch, 2B spacing, branch convergence, ³⁷Cl partners, DCl ratios, thermal envelope |
| `tests/nmr/*.test.ts` | 14 molecules vs literature ¹H shifts/multiplicities; field narrowing, D₂O, picking, integration; exact spin systems (AB quartet, roofing, high-field limit); 23 molecules vs literature ¹³C shifts, DEPT, coupled multiplets |
| `tests/uv-vis/pi-system.test.ts` | Hückel levels, cyanine box λ, calibration re-derived by least squares, colours |
| `tests/uv-vis/beer-lambert.test.ts` | A = εbc, stray-light saturation, per-molecule concentration range, colour vs concentration |
| `tests/unknowns/unknowns.test.ts` | Formula, unsaturation, ion cluster, isomer families, scoring |
| `tests/nmr/carbon-window.test.ts` | All coupled CH₃/CH₄ components remain sampled at both field limits |
| `tests/unknowns/round-loading.test.ts` | Pending-round answer rejection, Reset, obsolete completion/failure and retry |
| `tests/browser/review-regressions.spec.ts` | Chart focus/picks, carbon chart transforms, pending answers and live locale changes |
| `tests/memory-leak.test.ts` | Lists the sim's disposables for `describeDisposalLeaks()` (collected after dispose, repeated cycles; opt-in double dispose) |
| `tests/helpers/memoryLeak.ts` | Template-owned leak harness: `describeDisposalLeaks`, `forceGC`, `createAndDispose` |
| `tests/fuzz/fuzz.spec.ts` | Optional Playwright fuzz smoke: pointer `?fuzz` + keyboard `?fuzzBoard` (template-owned; add sim-specific specs as separate files) |
| `playwright.config.ts` | Chromium project + Vite webServer for `tests/**/*.spec.ts` (template-owned) |
| `tests/browser/*.spec.ts` | Optional sim-specific Playwright tests (`npx playwright test tests/browser`); `npm run test:fuzz` runs only `tests/fuzz/` |

- Put unit tests only under root `tests/`, mirroring `src/` (never co-locate or use `__tests__/`).
- Change the `name` passed to `init()` in `tests/setup.ts` to match `package.json` after `npm run rename`.
- Run `npm test`. CI runs the suite when a `test` script is present.
- Add every model/view object that adds/removes nodes or links Properties at runtime to the
  `describeDisposalLeaks([...])` list in `memory-leak.test.ts`; put sim-specific leak scenarios
  after it using `forceGC()` from `tests/helpers/memoryLeak.ts` (never a local copy).
- Optional: `npm run test:fuzz` / `test:fuzz:quick` / `test:fuzz:long` (not part of default CI).
  Duration is 30s by default; override with `npm run test:fuzz -- 90` or `FUZZ_DURATION=90`.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run build:single` | Single-file build mode |
| `npm run check` | TypeScript (`tsc --noEmit` on app, scripts, and tests) |
| `npm run lint` / `npm run fix` | Biome check / auto-fix |
| `npm test` | Vitest unit tests |
| `npm run test:fuzz` | Playwright fuzz smoke (pointer + keyboard, `?ea`, 30s each; `npm run test:fuzz -- 90` to change) |
| `npm run test:fuzz:quick` | 10s fuzz |
| `npm run test:fuzz:long` | 300s fuzz |
| `npm run icons` | Regenerate PWA icons; seed missing screenshots, preserve existing ones |
| `npm run rename` | Sim-level fork/rename (`--id`, `--name`) |
| `npm run scaffold-screens` | Emit N screens (`--screens Intro,Lab`) |
| `npm run release` | `check && lint && build && test`, then version patch + push tags |

`src/init.ts` reads `version` from `package.json`, so the patch bump shows up in the About dialog
without a second edit.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
