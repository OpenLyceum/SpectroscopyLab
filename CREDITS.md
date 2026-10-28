# Credits — Spectroscopy Lab

Read IR, ¹H NMR and UV-Vis spectra against a 3D molecule: every peak maps to the atoms behind it.

## License

GNU Affero General Public License v3.0 or later — see [org LICENSE](https://github.com/OpenLyceum/.github/blob/main/LICENSE).

## Data

- **Molecular structures**: 3D conformers from [PubChem](https://pubchem.ncbi.nlm.nih.gov/)
  (public domain), fetched by `scripts/qm/fetch_structures.py`; the CID of each is recorded in
  `scripts/qm/molecules.json` and in the `source` field of its library file.
- **Vibrational data** (`src/common/model/library/data/*.json`): computed for this sim with
  [PySCF](https://pyscf.org/) (Apache-2.0) and [geomeTRIC](https://github.com/leeping/geomeTRIC)
  (BSD-3) at B3LYP/def2-SVP by `scripts/qm/compute_vibrations.py`. Original work, under the sim's
  licence.
- **Isotope masses**: AME2020 — M. Wang et al., *Chinese Physics C* **45**, 030003 (2021).
- **Element colours and radii**: Jmol's CPK table, via [MolScope](https://github.com/OpenLyceum/MolScope).

## Code

The molecule viewer (`MoleculeRenderer`, `MoleculeViewerNode`), `Elements`, `Geometry`,
`Rotation3`, `ControlFactory` and `disposeSubtree` are trimmed copies from
[MolScope](https://github.com/OpenLyceum/MolScope) (AGPL-3.0-or-later).

## Acknowledgments

Built with [SceneryStack](https://scenerystack.org/) as part of the
[OpenLyceum](https://github.com/OpenLyceum) fleet.
