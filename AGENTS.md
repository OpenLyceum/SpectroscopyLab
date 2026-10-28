# AGENTS.md — SceneryStack Template

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/AGENTS.md](https://github.com/OpenLyceum/.github/blob/main/AGENTS.md).

## Project

Reusable SceneryStack template (one or N screens) and **canonical accessibility reference** for
OpenLyceum sims. Prefer `Baton/scripts/create-sim.sh` (or GitHub **Use this template** +
`npm run rename` + `npm run scaffold-screens`) to fork it. For multi-screen sims, see
[`doc/multi-screen.md`](doc/multi-screen.md).

## Key files

| File | Purpose |
|---|---|
| `src/SimColors.ts` | All `ProfileColorProperty` instances |
| `src/SimConstants.ts` | Named numeric constants (layout px, physics SI units) |
| `src/SimNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor |
| `src/sim-screen/SimScreen.ts` | Screen wrapper |
| `src/sim-screen/model/SimModel.ts` | Simulation state and logic |
| `src/sim-screen/view/SimScreenView.ts` | Visual nodes, layout, `screenSummaryContent` + `pdomOrder` |
| `src/sim-screen/view/SimScreenSummaryContent.ts` | Accessible screen summary (reference a11y pattern) |
| `src/sim-screen/view/SimKeyboardHelpContent.ts` | Basic keyboard actions + commented slider/time-control sections |
| `src/common/SimPanel.ts` | Pre-themed `Panel` wrapper (uses `SimColors` automatically) |
| `src/common/SimButtonOptions.ts` | Flat button-appearance option bundles + light-control-surface combo-box options |
| `src/common/SimControlOptions.ts` | Shared slider, number-control, and checkbox sizing/theme options |
| `src/common/TimeModel.ts` | Composable play/pause + elapsed-time model for animated sims |
| `scripts/generate-icons.ts` | PNG icons from `public/icons/icon.svg` |
| `scripts/rename-sim.ts` | Sim-level fork/rename (metadata, Colors, Constants, Panel, Button/Control options, Preferences) |
| `scripts/scaffold-screens.ts` | Emit N screen packages + wire main/strings/icons |

## Common components

### SimPanel

Every control panel and info box in the sim should use `SimPanel` so that
default/projector color switching is automatic:

```typescript
import { SimPanel } from "../../common/SimPanel.js";
const panel = new SimPanel(content);              // uses SimColors defaults
const panel = new SimPanel(content, { xMargin: 20 }); // override any PanelOption
```

### TimeModel

For simulations with animation, compose `TimeModel` into your screen model:

```typescript
import { TimeModel } from "../../common/TimeModel.js";

export class MyModel implements TModel {
  public readonly timer = new TimeModel();   // starts paused; pass true to auto-play

  public step(dt: number): void {
    this.timer.step(dt);
    // use this.timer.timeProperty.value for physics
  }
  public reset(): void { this.timer.reset(); /* … */ }
}
```

Wire the view to `TimeControlNode` from `scenerystack/scenery-phet` binding on
`model.timer.isPlayingProperty`.

### SimButtonOptions

SceneryStack's push/round buttons default to a 3-D/beveled look; every button in the sim
should be flat instead. Spread these into the relevant options object:

```typescript
import { FLAT_RESET_ALL_BUTTON_OPTIONS, FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../../common/SimButtonOptions.js";

const resetAllButton = new ResetAllButton({ ...FLAT_RESET_ALL_BUTTON_OPTIONS, listener: () => {...} });
const exampleButton = new RectangularPushButton({ ...FLAT_RECTANGULAR_BUTTON_OPTIONS, content, listener });
```

`FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS` spreads into `TimeControlNode`'s `playPauseStepButtonOptions`;
`TIME_CONTROL_SPEED_RADIO_OPTIONS` fixes `TimeControlNode`'s speed-radio label color, which
otherwise defaults to black text on the sim's dark default-mode panels. `SIM_COMBO_BOX_OPTIONS`
themes a `ComboBox`'s button/list chrome to the light control surface below; pair item labels
with `LIGHT_SURFACE_TEXT_FILL` (not `SimColors.textColorProperty`, which is for panel-fill text).

`SimColors.ts` backs this with a "light control surfaces" section —
`controlSurfaceColorProperty`, `controlSurfaceDisabledColorProperty`,
`controlSurfaceTextColorProperty` — identical white/dark-text values in both default and
projector profiles, so any component that must stay light regardless of theme (combo boxes,
flat buttons, editable fields) keeps readable contrast automatically.

## Accessibility

This template is the **canonical accessibility reference** for OpenLyceum sims. It ships with
the three required layers wired up: PDOM names, a `SimScreenSummaryContent`, and an explicit
`pdomOrder` + `SimKeyboardHelpContent`. A11y strings live under the `a11y` key in each locale
JSON, exposed via `StringManager.getA11yStrings()`. When building a real sim, make
`currentDetailsContent` a live `DerivedProperty` over model state and add `accessibleName`s to
every interactive node. Full convention and checklist: [Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

A clean fork of this template rarely needs compliance carve-outs — root `SimConstants.ts`,
`*Colors.ts`, `*Namespace.ts`, standard screen layout, and full a11y wiring pass Baton's
compliance check out of the box. Document carve-outs in the forked sim's `AGENTS.md` only when
you introduce a deliberate deviation (nested constants, hardcoded interaction fills, etc.).

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
| `three` | `~0.125.2` | SceneryStack declares `^0.104.0`. Floor is 0.125.0 for GHSA-fq6p-x6j3-cmmq (ReDoS). Staying on the 0.125 line avoids a larger API jump; **0.125.x still has open CVEs** (e.g. XSS GHSA-7vvq-7r29-5vg3, fixed only in ≥0.137.0). Remove this override if/when SceneryStack stops depending on `three` or pins a patched line itself. |
| `brace-expansion` | `~5.0.12` | Transitive via `vite-plugin-pwa` / Workbox. Clears npm audit (originally GHSA-mh99-v99m-4gvg; keep ≥5.0.9 for GHSA-rgw5-rvv9-x895; ≥5.0.12 for the CPU-DoS advisory). |

## Testing

Fleet-standard Vitest layout (keep when forking):

| Path | Purpose |
|---|---|
| `vitest.config.ts` | `happy-dom` environment; `setupFiles: ["./tests/setup.ts"]`; `execArgv: ["--expose-gc"]` |
| `tests/setup.ts` | Canvas / AudioContext mocks + `init({ name: "…" })` before SceneryStack imports |
| `tests/TimeModel.test.ts` | Sample model unit tests — replace with real physics tests |
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

## Customizing a new sim from this template

### Recommended: Baton create-sim

```sh
Baton/scripts/create-sim.sh --repo Friction --name "Friction" --screens Intro,Lab --shared-model --onboard
```

### Manual: GitHub template + rename + scaffold

```sh
npm install
npm run rename -- --id friction --name "Friction"
npm run scaffold-screens -- --screens Intro,Lab --shared-model
# omit --screens for one screen named after the sim; omit --shared-model for independent models
npm run fix     # required: both scripts reorder imports, which Biome then sorts
npm run check
```

`rename` updates package id and metadata, display name, and every sim-level `Sim*`
(Colors, Constants, Namespace, Panel, ButtonOptions, ControlOptions, Preferences, query parameters).
`scaffold-screens` owns screen folders (fleet naming: `src/intro/`, not `intro-screen/`).
After both steps no `Sim*` identifier should remain — `rg -n '\bSim[A-Z_]|\bSIM_[A-Z_]' src` to confirm.

### Manual checklist (if not using the scripts)

1. **Rename** — replace `scenerystack-template` / `SceneryStack Template` / `Sim` prefix in `init.ts`, `brand.ts`, `package.json` (name, description, keywords, repository.url), Colors/Constants/Namespace/Panel/ButtonOptions/ControlOptions/Preferences
2. **Screens** — run `scaffold-screens` or mirror `sim-screen/` into kebab folders
3. **Locale** — add `strings_XX.json`, register in `StringManager`, add locale to `init.ts` `availableLocales`
4. **Icon** — edit `public/icons/icon.svg`, run `npm run icons`; match theme color in `index.html` / `vite.config.ts`.
   Once `assets/screenshot.png` exists (Baton `generate-screenshots.sh`), `npm run icons -- --screenshots-from-assets`
   replaces the placeholder PWA screenshots
5. **Colors** — edit `*Colors.ts` (`default` + `projector` profiles per property), one
   `new ProfileColorProperty(Namespace, name, { default, projector })` per entry — no local helper
6. **Description** — write a real one-sentence `package.json` `description`; `index.html` and the
   PWA manifest read it (`%SIM_DESCRIPTION%`), so there is nothing else to edit
7. **Placeholders** — delete the `exampleToggle` preference and the `exampleControl` a11y string;
   delete `src/common/TimeModel.ts` (and `tests/TimeModel.test.ts`) if the sim has no clock
8. **Verify** — `Baton/scripts/check-template-drift.sh --fix <Sim>` (drops `rename` /
   `scaffold-screens`, which are template-only) and `COMPLIANCE_STRICT=1 Baton/scripts/check-repo-compliance.sh .`

## Multi-screen sims

Full guide: [`doc/multi-screen.md`](doc/multi-screen.md)

Summary:
- Prefer `npm run scaffold-screens -- --screens Intro,Lab` (add `--shared-model` for a root model)
- Or create a screen folder mirroring `src/sim-screen/` for each screen (kebab names, no `-screen` suffix)
- Add screen-name keys to all locale JSON files; nest `a11y` per screen
- Expose new getters in `StringManager.getScreenNames()` / `get{Screen}A11yStrings()`
- Shared state: `--shared-model` → `common/model/SharedModel.ts` composed per screen (rename to a domain type)
- Add `src/common/{SimName}ScreenIcons.ts` with `create{Screen}Icon()` factories; wire `homeScreenIcon` + `navigationBarIcon` on each Screen
- Register all screens in the `screens` array in `main.ts`

## Using this template beyond a direct copy

| Approach | When to use |
|---|---|
| **`Baton/scripts/create-sim.sh`** | Agents / fleet — create repo, rename, scaffold N screens |
| **GitHub template** ("Use this template") | Humans starting a sim in the browser |
| `npm run rename` + `scaffold-screens` | Same, after cloning the template |
| **npm workspace / monorepo** | Managing a suite of sims with shared tooling |
| **`Baton/scripts/check-template-drift.sh`** | Keeping forks in sync with template improvements |

See `doc/multi-screen.md` → "Using this template beyond a direct copy" for details.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
