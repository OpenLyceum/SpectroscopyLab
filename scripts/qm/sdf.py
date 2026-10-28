"""Minimal MDL V2000 SDF reader shared by the qm scripts: elements, coordinates (Å), bonds, charge."""

from pathlib import Path


def read_sdf(path: Path):
    lines = path.read_text().splitlines()
    n_atoms, n_bonds = int(lines[3][0:3]), int(lines[3][3:6])
    elements, coords, bonds = [], [], []
    for line in lines[4 : 4 + n_atoms]:
        fields = line.split()
        coords.append([float(fields[0]), float(fields[1]), float(fields[2])])
        elements.append(fields[3])
    for line in lines[4 + n_atoms : 4 + n_atoms + n_bonds]:
        a, b, order = int(line[0:3]), int(line[3:6]), int(line[6:9])
        bonds.append([a - 1, b - 1, order])
    charge = 0
    for line in lines:
        if line.startswith("M  CHG"):
            fields = line.split()[3:]
            charge += sum(int(fields[i + 1]) for i in range(0, len(fields), 2))
    return elements, coords, bonds, charge
