"""
Geometry-only library files for screens that need no quantum chemistry (NMR, UV-Vis).

Writes src/common/model/library/structures/<id>.json — the PubChem 3D conformer with its SDF bond
orders — for every molecule in molecules.json, plus the streptocyanine dyes
Me₂N–(CH)ₚ–NMe₂⁺ (p = 3, 5, 7, 9), which PubChem lacks as clean 3D records: they are built here as
planar all-trans chains (C–C 1.39 Å, 120°), the geometry Kuhn's free-electron model assumes. The loader prefers the B3LYP-optimised
library/data/<id>.json when it exists, so this is the fallback geometry. Pure Python; no venv.

Usage: python3 -I scripts/qm/export_geometry.py
"""

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # -I drops the script directory
from sdf import read_sdf  # noqa: E402

OUT_DIR = HERE.parents[1] / "src" / "common" / "model" / "library" / "structures"


import math

CYANINES = {3: "trimethine-cyanine", 5: "pentamethine-cyanine", 7: "heptamethine-cyanine", 9: "nonamethine-cyanine"}
CHAIN_BOND = 1.39
CH_BOND = 1.08
CN_METHYL = 1.46
CH_METHYL = 1.09


def build_cyanine(p: int) -> dict:
    """Me₂N–(CH=CH)ₖ–CH=N⁺Me₂ with p chain carbons, in the xy plane."""
    elements, coords, bonds = [], [], []

    def add(symbol, xyz):
        elements.append(symbol)
        coords.append([round(v, 4) for v in xyz])
        return len(elements) - 1

    step_x = CHAIN_BOND * math.cos(math.radians(30))
    step_y = CHAIN_BOND * math.sin(math.radians(30))
    chain = [add("N" if i in (0, p + 1) else "C", (i * step_x, (i % 2) * step_y, 0.0)) for i in range(p + 2)]
    for i in range(p + 1):
        bonds.append([chain[i], chain[i + 1], 1 if i % 2 == 0 else 2])
    for i in range(1, p + 1):
        outward = -1 if i % 2 == 0 else 1
        h = add("H", (i * step_x, (i % 2) * step_y + outward * CH_BOND, 0.0))
        bonds.append([chain[i], h, 1])
    for end, neighbor in ((0, 1), (p + 1, p)):
        n = coords[chain[end]]
        c = coords[chain[neighbor]]
        bx, by = c[0] - n[0], c[1] - n[1]
        length = math.hypot(bx, by)
        bx, by = bx / length, by / length
        for sign in (1, -1):
            angle = math.radians(120 * sign)
            ux = bx * math.cos(angle) - by * math.sin(angle)
            uy = bx * math.sin(angle) + by * math.cos(angle)
            methyl = add("C", (n[0] + CN_METHYL * ux, n[1] + CN_METHYL * uy, 0.0))
            bonds.append([chain[end], methyl, 1])
            m = coords[methyl]
            vx, vy = -uy, ux  # in-plane perpendicular
            for a, b, z in ((0.333, 0.943, 0.0), (0.333, -0.471, 0.816), (0.333, -0.471, -0.816)):
                h = add("H", (m[0] + CH_METHYL * (a * ux + b * vx), m[1] + CH_METHYL * (a * uy + b * vy), CH_METHYL * z))
                bonds.append([methyl, h, 1])
    return {
        "id": CYANINES[p],
        "source": "generated: planar all-trans streptocyanine (export_geometry.py)",
        "elements": elements,
        "positions": coords,
        "bonds": bonds,
        "charge": 1,
    }


def main() -> int:
    catalog = json.loads((HERE / "molecules.json").read_text())["molecules"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for entry in catalog:
        elements, coords, bonds, charge = read_sdf(HERE / "structures" / f"{entry['id']}.sdf")
        data = {
            "id": entry["id"],
            "source": f"PubChem CID {entry['cid']}",
            "elements": elements,
            "positions": [[round(x, 4) for x in c] for c in coords],
            "bonds": bonds,
            "charge": charge,
        }
        (OUT_DIR / f"{entry['id']}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    for p in CYANINES:
        data = build_cyanine(p)
        (OUT_DIR / f"{data['id']}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"wrote {len(catalog) + len(CYANINES)} structures to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
