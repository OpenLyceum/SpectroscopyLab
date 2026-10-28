"""
Download the PubChem 3D conformer (SDF) of every molecule in molecules.json into structures/.

PubChem data is in the public domain. Re-runnable: existing files are kept unless --force.
The molecular formula PubChem reports is checked against molecules.json so a mistyped cid
fails loudly instead of silently shipping the wrong molecule.

Usage: python scripts/qm/fetch_structures.py [--force] [id ...]
"""

import json
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/{what}"


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=30) as response:
        return response.read().decode("utf-8")


def main(argv: list[str]) -> int:
    force = "--force" in argv
    wanted = {a for a in argv if not a.startswith("--")}
    catalog = json.loads((HERE / "molecules.json").read_text())["molecules"]
    out_dir = HERE / "structures"
    out_dir.mkdir(exist_ok=True)
    failures = 0
    for entry in catalog:
        if wanted and entry["id"] not in wanted:
            continue
        target = out_dir / f"{entry['id']}.sdf"
        props = json.loads(fetch(PUG.format(cid=entry["cid"], what="property/MolecularFormula,Title/JSON")))
        record = props["PropertyTable"]["Properties"][0]
        if record["MolecularFormula"] != entry["formula"]:
            print(f"✗ {entry['id']}: cid {entry['cid']} is {record['Title']} ({record['MolecularFormula']})")
            failures += 1
            continue
        if target.exists() and not force:
            print(f"· {entry['id']} (kept)")
            continue
        target.write_text(fetch(PUG.format(cid=entry["cid"], what="SDF?record_type=3d")))
        print(f"✓ {entry['id']} ← {record['Title']}")
        time.sleep(0.25)  # PubChem asks for at most 5 requests per second
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
