/**
 * SpectroscopyLibrary.ts
 *
 * The built-in molecules, grouped into the families the screens offer. Two lazily imported sets
 * of files (one small chunk per molecule):
 *   data/<id>.json        B3LYP-optimised geometry + Hessian + dipole derivatives (compute_vibrations.py)
 *   structures/<id>.json  the PubChem conformer only (export_geometry.py), for screens without QM
 * A molecule loads from data/ when it has been computed, else from structures/. Display names live in strings_*.json under `molecules`,
 * keyed by the camel-cased id.
 */

import { type Molecule, type MoleculeFile, moleculeFromFile } from "../Molecule.js";

export const MoleculeFamily = {
  SMALL: "small",
  ALCOHOLS_ETHERS: "alcoholsEthers",
  CARBONYLS: "carbonyls",
  ACIDS_ESTERS: "acidsEsters",
  NITROGEN_HALOGEN: "nitrogenHalogen",
  AROMATICS: "aromatics",
  POLYENES: "polyenes",
  ACENES: "acenes",
  CYANINES: "cyanines",
} as const;
export type MoleculeFamilyValue = (typeof MoleculeFamily)[keyof typeof MoleculeFamily];

export type LibraryEntry = {
  readonly id: string;
  readonly family: MoleculeFamilyValue;
  /** Hill formula, for the Unknowns screen and the info panel. */
  readonly formula: string;
};

const entry = (id: string, family: MoleculeFamilyValue, formula: string): LibraryEntry => ({ id, family, formula });

export const LIBRARY: readonly LibraryEntry[] = [
  entry("water", MoleculeFamily.SMALL, "H2O"),
  entry("carbon-dioxide", MoleculeFamily.SMALL, "CO2"),
  entry("hydrogen-chloride", MoleculeFamily.SMALL, "HCl"),
  entry("methane", MoleculeFamily.SMALL, "CH4"),
  entry("ammonia", MoleculeFamily.SMALL, "H3N"),
  entry("formaldehyde", MoleculeFamily.SMALL, "CH2O"),

  entry("ethanol", MoleculeFamily.ALCOHOLS_ETHERS, "C2H6O"),
  entry("dimethyl-ether", MoleculeFamily.ALCOHOLS_ETHERS, "C2H6O"),
  entry("1-propanol", MoleculeFamily.ALCOHOLS_ETHERS, "C3H8O"),
  entry("2-propanol", MoleculeFamily.ALCOHOLS_ETHERS, "C3H8O"),
  entry("ethyl-methyl-ether", MoleculeFamily.ALCOHOLS_ETHERS, "C3H8O"),
  entry("allyl-alcohol", MoleculeFamily.ALCOHOLS_ETHERS, "C3H6O"),
  entry("methyl-vinyl-ether", MoleculeFamily.ALCOHOLS_ETHERS, "C3H6O"),
  entry("1-4-dioxane", MoleculeFamily.ALCOHOLS_ETHERS, "C4H8O2"),

  entry("acetaldehyde", MoleculeFamily.CARBONYLS, "C2H4O"),
  entry("acetone", MoleculeFamily.CARBONYLS, "C3H6O"),
  entry("propanal", MoleculeFamily.CARBONYLS, "C3H6O"),
  entry("2-butanone", MoleculeFamily.CARBONYLS, "C4H8O"),

  entry("acetic-acid", MoleculeFamily.ACIDS_ESTERS, "C2H4O2"),
  entry("butanoic-acid", MoleculeFamily.ACIDS_ESTERS, "C4H8O2"),
  entry("ethyl-acetate", MoleculeFamily.ACIDS_ESTERS, "C4H8O2"),
  entry("methyl-propanoate", MoleculeFamily.ACIDS_ESTERS, "C4H8O2"),

  entry("acetonitrile", MoleculeFamily.NITROGEN_HALOGEN, "C2H3N"),
  entry("acetamide", MoleculeFamily.NITROGEN_HALOGEN, "C2H5NO"),
  entry("ethylamine", MoleculeFamily.NITROGEN_HALOGEN, "C2H7N"),
  entry("chloroethane", MoleculeFamily.NITROGEN_HALOGEN, "C2H5Cl"),

  entry("benzene", MoleculeFamily.AROMATICS, "C6H6"),
  entry("toluene", MoleculeFamily.AROMATICS, "C7H8"),
  entry("phenol", MoleculeFamily.AROMATICS, "C6H6O"),
  entry("benzaldehyde", MoleculeFamily.AROMATICS, "C7H6O"),
  entry("ethylbenzene", MoleculeFamily.AROMATICS, "C8H10"),
  entry("o-xylene", MoleculeFamily.AROMATICS, "C8H10"),
  entry("m-xylene", MoleculeFamily.AROMATICS, "C8H10"),
  entry("p-xylene", MoleculeFamily.AROMATICS, "C8H10"),

  entry("ethene", MoleculeFamily.POLYENES, "C2H4"),
  entry("1-3-butadiene", MoleculeFamily.POLYENES, "C4H6"),
  entry("1-3-5-hexatriene", MoleculeFamily.POLYENES, "C6H8"),
  entry("1-3-5-7-octatetraene", MoleculeFamily.POLYENES, "C8H10"),
  entry("beta-carotene", MoleculeFamily.POLYENES, "C40H56"),

  entry("naphthalene", MoleculeFamily.ACENES, "C10H8"),
  entry("anthracene", MoleculeFamily.ACENES, "C14H10"),
  entry("tetracene", MoleculeFamily.ACENES, "C18H12"),
  entry("pentacene", MoleculeFamily.ACENES, "C22H14"),
  entry("azulene", MoleculeFamily.ACENES, "C10H8"),

  entry("trimethine-cyanine", MoleculeFamily.CYANINES, "C7H15N2+"),
  entry("pentamethine-cyanine", MoleculeFamily.CYANINES, "C9H17N2+"),
  entry("heptamethine-cyanine", MoleculeFamily.CYANINES, "C11H19N2+"),
  entry("nonamethine-cyanine", MoleculeFamily.CYANINES, "C13H21N2+"),
];

const QM_LOADERS = import.meta.glob<MoleculeFile>("./data/*.json", { import: "default" });
const GEOMETRY_LOADERS = import.meta.glob<MoleculeFile>("./structures/*.json", { import: "default" });

const cache = new Map<string, Molecule>();

/** Whether any library file exists for this id. */
export function hasMoleculeData(id: string): boolean {
  return `./data/${id}.json` in QM_LOADERS || `./structures/${id}.json` in GEOMETRY_LOADERS;
}

/** Whether the B3LYP vibrational data has been computed for this id (the IR screen needs it). */
export function hasVibrationData(id: string): boolean {
  return `./data/${id}.json` in QM_LOADERS;
}

/** Library entries whose data files exist, in library order. */
export function availableEntries(family?: MoleculeFamilyValue): LibraryEntry[] {
  return LIBRARY.filter((e) => hasMoleculeData(e.id) && (family === undefined || e.family === family));
}

export async function loadMolecule(id: string): Promise<Molecule> {
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }
  const loader = QM_LOADERS[`./data/${id}.json`] ?? GEOMETRY_LOADERS[`./structures/${id}.json`];
  if (!loader) {
    throw new Error(`No library data for ${id}`);
  }
  const molecule = moleculeFromFile(await loader());
  cache.set(id, molecule);
  return molecule;
}

/** String key for a molecule's display name: the id camel-cased ("ethyl-acetate" → "ethylAcetate", "1-4-dioxane" → "14Dioxane"). */
export function nameKey(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}
