"""
Offline vibrational data for the Infrared screen.

For each structures/<id>.sdf (PubChem 3D conformer) this script
  1. optimises the geometry with B3LYP/def2-SVP (PySCF + geomeTRIC), keeping the SDF atom order,
  2. computes the analytic Cartesian Hessian,
  3. computes dipole derivatives dμ/dx by central differences of the SCF dipole,
and writes src/common/model/library/data/<id>.json. The sim runs the normal-mode analysis itself
(NormalModeAnalysis.ts), so isotope substitution only changes masses at run time.

Units in the JSON (atomic units, converted in TypeScript):
  positions          Å
  hessian            hartree / bohr², packed upper triangle (row-major, i <= j) of the 3N×3N matrix
  dipoleDerivatives  e (3 rows: μx, μy, μz; 3N columns)

This is a dev-only tool; CI never runs it. Set up once with
  python3 -m venv scripts/qm/.venv && scripts/qm/.venv/bin/pip install -r scripts/qm/requirements.txt
then run
  scripts/qm/.venv/bin/python -I scripts/qm/compute_vibrations.py [--force] [id ...]
"""

import json
import sys
import time
from pathlib import Path

import numpy as np
import pyscf
from pyscf import dft, gto
from pyscf.geomopt.geometric_solver import optimize

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script directory
from sdf import read_sdf  # noqa: E402

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE.parents[1] / "src" / "common" / "model" / "library" / "data"
BOHR = 0.529177210903  # Å per bohr
XC = "b3lyp"
BASIS = "def2-svp"
# Harmonic frequency scale factor for B3LYP/def2-SVP (fits water's three fundamentals to ~1 %).
SCALE = 0.965
DIPOLE_STEP = 0.005  # bohr


def make_scf(mol):
    mf = dft.RKS(mol)
    mf.xc = XC
    mf.conv_tol = 1e-10
    mf.verbose = 0
    return mf


def dipole_derivatives(mol, dm0):
    coords = mol.atom_coords()
    n3 = 3 * mol.natm
    dmu = np.zeros((3, n3))
    for i in range(n3):
        mus = []
        for sign in (1, -1):
            displaced = coords.copy()
            displaced.flat[i] += sign * DIPOLE_STEP
            m = mol.set_geom_(displaced, unit="Bohr", inplace=False)
            mf = make_scf(m)
            mf.kernel(dm0=dm0)
            mus.append(mf.dip_moment(unit="AU", verbose=0))
        dmu[:, i] = (mus[0] - mus[1]) / (2 * DIPOLE_STEP)
    return dmu


def compute(entry, sdf: Path) -> dict:
    elements, coords, bonds, charge = read_sdf(sdf)
    atoms = [(e, tuple(c)) for e, c in zip(elements, coords)]
    mol = gto.M(atom=atoms, basis=BASIS, charge=charge, verbose=0)
    mol = optimize(make_scf(mol), maxsteps=200)
    mf = make_scf(mol)
    mf.kernel()
    n = mol.natm
    hess = mf.Hessian().kernel().transpose(0, 2, 1, 3).reshape(3 * n, 3 * n)
    hess = 0.5 * (hess + hess.T)
    packed = hess[np.triu_indices(3 * n)]
    dmu = dipole_derivatives(mol, mf.make_rdm1())
    return {
        "id": entry["id"],
        "source": f"PubChem CID {entry['cid']}",
        "method": f"{XC.upper()}/{BASIS} (PySCF {pyscf.__version__})",
        "elements": elements,
        "positions": (mol.atom_coords() * BOHR).round(5).tolist(),
        "bonds": bonds,
        "charge": charge,
        "vibrations": {
            "scale": SCALE,
            "hessian": [float(f"{x:.8g}") for x in packed],
            "dipoleDerivatives": [[float(f"{x:.7g}") for x in row] for row in dmu],
        },
    }


def main(argv: list[str]) -> int:
    force = "--force" in argv
    wanted = {a for a in argv if not a.startswith("--")}
    catalog = json.loads((HERE / "molecules.json").read_text())["molecules"]
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for entry in catalog:
        if (wanted and entry["id"] not in wanted) or not entry.get("vibrations"):
            continue
        target = DATA_DIR / f"{entry['id']}.json"
        if target.exists() and not force:
            print(f"· {entry['id']} (kept)", flush=True)
            continue
        start = time.time()
        data = compute(entry, HERE / "structures" / f"{entry['id']}.sdf")
        target.write_text(json.dumps(data, separators=(",", ":")) + "\n")
        print(f"✓ {entry['id']} ({time.time() - start:.0f} s)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
