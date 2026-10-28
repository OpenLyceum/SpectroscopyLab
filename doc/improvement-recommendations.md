# Improvement Recommendations — SceneryStack Template

Remaining non-test recommendations for `SceneryStackTemplate/`. Numbering is
preserved for earlier references. Items 1, 4–8, 10–15 are implemented and removed:
`scripts/rename-sim.ts` now documents its token-order invariant and uses word-boundary
identifier replacements; `StringManager` exposes explicit accessibility/preferences
return types; `SimScreenView` includes a listener/disposal example; and
`SimKeyboardHelpContent` includes commented slider/time-control sections. The release
script also runs the existing unit suite before bumping the version.

Former item 3 proposed pinning reusable workflows independently of Baton. The fleet
instead deliberately uses `OpenLyceum/Baton/.github/workflows/*@main`, enforced by
[Baton's conventions](https://github.com/OpenLyceum/Baton/blob/main/CONVENTIONS.md).
Any change to that policy belongs in Baton and its compliance rules before propagation.

## Local Node and npm policy

### 2. Align local Node selection with CI's Node 24

The template declares `engines.node: ">=24"`, while CI uses Node 24. A possible
improvement is a tighter `">=24 <25"` range and a root `.nvmrc` containing `24`.
Baton's current compliance rule accepts `">=24"` (or `">=24.0.0"`) only, so changing
the template alone would fail the fleet audit. Review the policy in Baton first,
update its compliance rule and template manifest together, then propagate approved
package/config changes through the drift checker.

### 9. Decide whether to add a fleet `.npmrc`

The template has no root `.npmrc`. Consider `engine-strict=true` alongside #2, and
make an explicit decision on `fund` and `save-exact` before introducing defaults.
A new template-owned file also needs Baton's root-file allowlist and template manifest
updated before it can be propagated. Keep the decision centralized rather than
adding different npm policies in individual simulations.
