# SpectroscopyLab functional review — 2026-10-31

**Resolution:** all four findings below have been addressed. Historical reproductions and
baseline results are retained; implementation and regression evidence follow the review.

Reviewed `main` at `2e565b2742f2371f12416c5726aeadab3faa9b9e`. SpectroscopyLab was created
on October 28, within the requested last-week window. The working tree was initially clean.
`git pull --ff-only` advanced the checkout from `212ae75` and included the review fixes merged
in [PR #5](https://github.com/OpenLyceum/SpectroscopyLab/pull/5). The findings below concern the
updated revision, after those fixes. This is the first review of this repository in this session.

Applied Baton's `scenerystack-code-review` skill and functional-review reference. Scope:
all four screens, shared spectrum input, supported low-field NMR settings, isotope and molecule
changes, quantitative UV–Vis, asynchronous Unknowns transitions, localization and baseline
automated checks. The documented harmonic-IR approximation, shift additivity, diastereotopic
equivalence, spin-count fallback and family-calibrated Hückel model were treated as teaching
limitations rather than new defects.

Runtime: Node v26.13.0 in WSL Ubuntu-24.04 (Ubuntu 26.04.1). Ran `npm ci` after the pull to
match the updated lockfile, including the existing upstream change to `three@0.137.5`.

## Original findings (all resolved)

### 1. [P2] Clicking non-focusable spectrum charts throws an assertion

Location: `src/common/view/SpectrumChartNode.ts:320–327`, especially unconditional
`this.focus()`; callers include `src/uv-vis/view/UVVisScreenView.ts:196`,
`src/nmr/view/NMRScreenView.ts:270,289`, and the Unknowns charts.

The shared chart installs a pointer-down handler on every background. It calls `focus()`
even when its owner explicitly supplies `focusable: false`. Those read-only/secondary charts
have no valid focus target. Clicking them with the required `?ea` checks enabled throws
**“trying to set focus on a Node that is not focusable.”**

Deterministic reproduction: open `?screens=3&ea` and click the UV–Vis spectrum, or open
`?screens=4&ea` and click the Unknowns IR spectrum. Real mouse clicks at the chart background
centre produced the same stack ending in `SpectrumChartNode`'s `down` callback and `focus()`.
The pointer fuzz test independently failed with this assertion repeatedly (seed **937830**).

Only request focus on a focusable chart. Preserve the pick callback where it is useful, such
as clicking the Beer–Lambert calibration plot to change concentration. Cover both an interactive
chart that should focus and these deliberately non-focusable charts. This finding establishes
an assertion-enabled failure; it does not claim a production crash with assertions disabled.

### 2. [P2] Fixed carbon-NMR windows omit supported low-field coupling lines

Location: `src/nmr/model/NMRModel.ts:38–46,412–435` and the fixed carbon-chart/zoom ranges in
`src/nmr/view/NMRScreenView.ts`, including line 275.

The field slider supports 60–600 MHz, but the carbon zoom is permanently ±6 ppm and the full
carbon spectrum is permanently sampled over −5…225 ppm. Couplings are correctly converted
from Hz to ppm, so supported low-field multiplets extend beyond those windows. Missing peaks
can change the apparent multiplicity.

Actual-control reproduction on the default ethanol molecule:

1. Choose **¹³C**, then **¹H-coupled**.
2. Focus the spectrometer slider and press Home, selecting **60 MHz** (¹H frequency).
3. Activate the **δ 16.8 CH₃** signal row.
4. The model gives four lines, with offsets **−12.4272, −4.1424, +4.1424, +12.4272 ppm**.
   The zoom samples only **−6…+6 ppm** and displays the central two lines, making the quartet
   look like a doublet.

Independent arithmetic from the model's stated parameters: ν(¹³C) = 60/3.9767 MHz and
J = 125 Hz, so adjacent lines are separated by 125/(60/3.9767) = **8.28479 ppm**. A quartet's
outer lines lie 1.5 times that separation from its centre.

Methane demonstrates loss in the full spectrum too. At the same settings its five computed
lines are **−18.8696, −10.5848, −2.3000, +5.9848, +14.2696 ppm**. Two fall below the full
sampling range's −5 ppm minimum. Its ±6 ppm zoom contains only the central component.

Derive suitable sampling and displayed ranges from the selected coupling pattern and field,
with margin for line width, or offer an explicit adjustable window that can reveal every line.
Update the model curves and chart transforms together; changing the view alone cannot recover
data outside the sampled domain. Cover ethanol's quartet and methane's quintet at both field
limits without changing their physical line positions.

Screenshots: `spectroscopy-carbon-zoom-60.png`, `spectroscopy-methane-coupled-60.png` in the
session workspace.

### 3. [P2] An obsolete unknown remains answerable while the next round loads

Location: `src/unknowns/model/UnknownsModel.ts:101–128,132–145` and candidate-button state in
`src/unknowns/view/UnknownsScreenView.ts`.

`newUnknown()` starts an asynchronous load but retains the previous `unknownProperty`, result
and active candidate buttons until the replacement spectra are ready. `guess()` checks neither
a loading state nor whether the answer belongs to the currently requested round. The load
generation guard protects completed loads, but does not guard user answers during the wait.

Browser reproduction using real level and answer controls, with only uncached molecule JSON
requests held to represent a slow connection:

1. Start an unsolved level-1 question at score **0/0**.
2. Select the actual level **3** radio button and hold its target's incoming molecule data.
   The level changes to 3, while the old level-1 formula, spectra and candidates remain active.
3. Activate the old question's correct candidate button. The result becomes `correct` and the
   score becomes **1/1** while the new question is still loading.
4. Release the request. The new C₈H₁₀ question appears with result `none`, but the stale answer's
   **1/1 score persists**.

Reproduced with multiple level-1 targets, including dimethyl ether and propanols. Invalidate
answer eligibility as soon as a replacement round is requested, expose a loading state and
disable obsolete buttons, and restore eligibility only for the current generation. Cover level
changes, New unknown and Reset during a pending load; keep obsolete-load rejection intact.

Screenshot: `spectroscopy-obsolete-round.png` in the session workspace.

### 4. [P3] Unknowns candidate labels and an information line retain the previous language

Location: `src/unknowns/view/UnknownsScreenView.ts:103,134,177–180,246–260`.

Candidate names and accessible names are constructed from `moleculeName(id)` strings, and
the grid only rebuilds when the unknown changes. They do not observe the localized name
Properties. The information updater reads `unsaturationStringProperty` but does not depend
on it, leaving its result sensitive to the translation-update order.

Reproduction: load the English level-3 C₈H₁₀ question, switch the framework locale to Spanish,
and allow the scene to settle. The question, formula and New unknown control translate, but
the answer buttons and their PDOM names remain **ethylbenzene, o-xylene, m-xylene, p-xylene**.
The Spanish resources contain **etilbenceno, o-xileno, m-xileno, p-xileno**. The information
line still reads **“Degree of unsaturation: 4”** instead of the available Spanish text.
Starting directly in Spanish does translate those labels, so startup-only locale checks miss it.

Bind visible and accessible candidate names to their localized Properties and observe every
localized pattern read by the information updater. Check runtime switches before/after a guess,
preserving the same question, disabled/solved state and score.

Screenshot: `spectroscopy-unknown-spanish.png` in the session workspace.

## Initial review validation and evidence

- `npm run lint`: passed, 102 files checked, no fixes applied.
- `npm run check`: passed app, scripts and test type checks.
- `npm test`: **129 passed** across 15 files, including 28 memory checks.
- `npm run build`: passed production/PWA build, 97 precached entries.
- Fleet compliance and template drift checks: passed, including the remote security-setting
  probes performed by the compliance script.
- `FUZZ_PORT=5241 npm run test:fuzz:quick`, seed **937830**, 10 seconds per mode:
  **pointer failed**, repeatedly reporting finding 1; **keyboard passed**. The deterministic
  mouse-click reproduction establishes the underlying defect independently of fuzz timing.
- All four development screens and production-preview screens started with `?ea` and loaded
  their initial molecule/question without page errors. The focused chart-click probe then
  deliberately reproduced finding 1.
- Library traversal with assertions enabled: **34 IR molecules × 6 isotope schemes = 204
  states**; **46 NMR molecules × 2 field limits × proton plus four carbon modes = 460 states**;
  **15 UV–Vis molecules × 2 electronic models × 2 concentrations = 60 states**. Checked sampled
  curve coordinates for finite values, then exercised native Reset All. No page errors or
  nonfinite curve values occurred in that traversal. This does not prove all lines are inside
  the chosen plotting windows, as finding 2 demonstrates.
- French and Spanish startup screenshots were captured for all four screens; inspected the
  IR/Unknowns locale examples and the focused carbon-zoom, old-round scoring and live-Spanish
  reproductions.

The initial review left application sources, tests and dependency files unchanged; fixes were
subsequently authorized. The browser scripts and screenshots are in the session workspace.
This targeted review does
not establish manual screen-reader or educator sign-off, full performance/heap-snapshot
coverage, or independent verification of every experimental datum and offline QM calculation.

## Implemented fixes

1. The shared pointer handler requests focus only for focusable charts, while preserving pick
   callbacks. Browser regressions cover read-only charts on NMR, UV–Vis and Unknowns, calibration
   concentration selection, and pointer focus plus keyboard peak selection on the IR chart.
2. Carbon sampling domains expand to include all components with 1 ppm margin. Full and zoom
   chart transforms derive from the actual sampled endpoints; the zoom retains ±6 ppm as a
   minimum and adapts tick spacing. Ethanol's quartet and methane's quintet retain every
   component at 60 and 600 MHz without changing line positions. Both low-field unit cases
   failed against the original implementation and now pass. Browser tests inspect the actual
   bamboo transforms after operating the nucleus, spectrum, signal and field controls.
3. A new round immediately clears old clues/candidates and marks answers ineligible. Loading
   feedback is translated in English, French and Spanish. Only the latest generation can finish
   loading or publish an error; the previous target remains separately available for repeat
   avoidance. Deferred-load unit tests cover New unknown, level changes, Reset, stale successes,
   stale failures, current failures and recovery. The three obsolete-answer/reset cases failed
   against the original implementation and now pass. A browser test holds actual molecule
   requests while operating level and New unknown controls, verifies absent old buttons and
   unchanged score, then answers the completed round through its real button.
4. Candidate labels and accessible names bind to localized name Properties. Clues, feedback and
   the screen summary observe all localized patterns they use. Locale refreshes preserve wrong
   and solved button state, target and score, and do not re-announce an old result. A browser
   regression switches English → Spanish → French → English before and after guesses, checks
   that two successive wrong guesses each announce, and checks that locale refreshes add no
   duplicate announcements.

New model/view Properties and listeners are disposed with their owners. Developer and model
documentation describe the range, pending-round and localization contracts. Dependency files,
generated molecule data and template-owned infrastructure are unchanged.

## Fix validation

- `npm run lint`: passed, 105 files checked; app/scripts/test TypeScript checks passed.
- `npm test`: **137 passed** in 17 files, including all 28 disposal/memory regressions.
- `FUZZ_PORT=5241 npx playwright test tests/browser`: **8 passed**, assertions enabled.
- `FUZZ_PORT=5241 FUZZ_SEED=937830 npm run test:fuzz:quick`: **2 passed**, pointer and keyboard,
  10 seconds per mode. The original assertion-producing seed now completes without errors.
- `npm run build`: passed production build and PWA generation, 97 precached entries.
- Fleet repository compliance and template drift checks: passed.
- Captured and inspected fixed 60 MHz ethanol and methane carbon charts: four and five zoom
  peaks respectively, with full-spectrum components visible. Inspected the live-Spanish level-3
  Unknowns screenshot: all candidate names and the unsaturation line translated, with no clipping.
  No page errors occurred. Screenshots are `spectroscopy-fixed-ethanol-60.png`,
  `spectroscopy-fixed-methane-60.png` and `spectroscopy-fixed-unknown-spanish.png` in the session
  workspace.
