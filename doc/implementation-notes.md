# Spectroscopy Lab — implementation notes

## Data pipeline (`scripts/qm/`)

| Script | Needs | Writes |
|---|---|---|
| `fetch_structures.py` | Python 3 | `scripts/qm/structures/<id>.sdf` from PubChem; checks each formula against `molecules.json` |
| `export_geometry.py` | Python 3 | `src/common/model/library/structures/<id>.json` (all molecules + generated cyanines) |
| `compute_vibrations.py` | `.venv` with `requirements.txt` | `src/common/model/library/data/<id>.json` (optimised geometry, packed Hessian, dipole derivatives) |

`compute_vibrations.py` can be resumed: it skips files that already exist (pass `--force` or ids
to redo some). A 9-atom molecule takes about 4 minutes on 16 cores; the C₈H₁₀ isomers take much
longer. Python runs with `-I`, so each script adds its own directory to `sys.path` to import `sdf.py`.

`library/SpectroscopyLibrary.ts` lazily globs both folders and loads `data/` when present, else
`structures/`. The IR screen and the Unknowns game offer only molecules with `data/`.
`availableEntries()` is evaluated at build time, so menus grow as the pipeline finishes.

## Shared viewer

`MoleculeRenderer` is MolScope's painter's-algorithm canvas renderer, reduced to ball-and-stick
plus three overlays: highlight halos (atoms behind the selected peak), labels (NMR environment
letters), and translucent **orbital lobes** (a pair of signed spheres per π atom, offset along the
local π normal). `MoleculeViewModel` holds the camera, the hover, the highlights, an animated
displacement (`currentPositions()` adds `0.25 Å · sin(phase)` × the normalised mode) and the lobes.
Screens write those Properties; `MoleculeViewerNode` repaints on any change.

`MoleculeChooser` keeps one selection Property per family, because a `ComboBox` asserts that its
Property's value is one of its own items. Only the active family's combo box is visible.

## Spectrum chart

`SpectrumChartNode` wraps bamboo (`ChartTransform` with `modelXRangeInverted` for IR and NMR,
`LinePlot`, grid, ticks). Options add stick markers, shaded labelled regions, a secondary trace
(the NMR integral) and a cursor. Click-to-pick passes a tolerance of 8 px in model units. Arrow
keys step through peaks and follow screen direction on inverted axes. The node calls
`mutate(options)` only after its children exist, so layout options see real bounds. Axis titles
re-lay out when the lazily built tick labels change size.

## Dynamic chart axes

`SpectrumChartNode` takes optional `xRangeProperty`, `yRangeProperty` and `xTickSpacingProperty`.
bamboo's grid, ticks, labels and line plots follow `ChartTransform.changedEmitter` on their own; the
node redraws its own overlays (regions, sticks, cursor) on the same emitter. Uses: the HCl band
window follows the isotopologue's origin, the line zoom follows the selected line, DEPT-135 needs a
negative half, the UV-Vis absorbance axis switches to the absolute scale, and the Beer–Lambert
calibration axis rescales to each molecule's ε.

## Numerics

- `math/symmetricEigen.ts`: cyclic Jacobi. dot's `EigenvalueDecomposition.getV()` throws in
  scenerystack 3.0 (it calls `copy()` on a typed array). Jacobi is unconditionally stable and gives
  orthonormal vectors for degenerate eigenvalues (benzene's MOs, CO₂'s bend). If the off-diagonal
  norm is still above threshold after 400 sweeps it throws, rather than returning a half-diagonalised
  matrix.
- The projected Hessian's external modes are found by overlap with the translation/rotation
  space, not by "smallest six", so soft torsions are never mistaken for rotations.
- `SpinSystem.ts` builds each block of the spin Hamiltonian over product states with a fixed
  number of β spins (bit set = β), diagonalises it with `symmetricEigen`, and forms the per-signal
  I⁻ amplitudes as V_lowerᵀ · S_g · V_upper. A 9-spin system (butanoic acid at 60 MHz) takes a few
  ms, so the field slider recomputes it live.
- NMR curves sample 6500 points over 13 ppm. The sharp-line HWHM is never narrower than 1.2
  sample spacings, with heights rescaled to keep areas, so lines at 600 MHz never fall between samples.

## Screens

| Screen | Model | View highlights |
|---|---|---|
| Infrared | `InfraredModel`: chooser, isotope scheme, peaks (DerivedProperty over molecule + scheme), absorbance/transmittance curves; fine structure (temperature, lines, selected line by branch/J/isotopologue so it survives temperature changes) | Two charts toggled by the absorbance preference, two more for the fine structure; temperature slider replaces line width; line zoom inside the info panel |
| NMR | `NMRModel`: nucleus, field, D₂O, TMS, integral, exact/first-order lines, ¹³C environments and spectrum type, zoom curves | ¹H and ¹³C charts (and zooms) swap with the nucleus; `SignalTableNode` takes row text, so one table serves both; option rows swap in one slot |
| UV-Vis | `UVVisModel`: Hückel/box, selected orbital, prediction, colours; Beer–Lambert (ε, b, c as a fraction of a per-molecule maximum, stray-light readings, calibration curves) | `EnergyLevelDiagramNode` (click or arrow keys select the orbital drawn); visible strip in the chart; calibration panel below the results |
| Unknowns | `UnknownsModel`: level, score, wrong guesses, NMR nucleus, `buildUnknown()` (¹H exact and ¹³C decoupled) | Candidate buttons with `MoleculeThumbnailNode`; ion-cluster bars; ¹H/¹³C radio above the NMR chart |

## Accessibility

Every focusable element has an accessible name. The viewer, the IR/NMR charts and the energy
diagram announce what they select via `addAccessibleResponse`. Each screen summary's current
details is a `DerivedProperty` over the model and the locale strings.
