/**
 * Elements.ts
 *
 * Periodic-table data used by the viewer: Jmol's CPK colour scheme, covalent radii
 * for automatic bonding (Cordero et al., 2008), van der Waals radii for space-filling
 * (Bondi / Alvarez), standard atomic weights and Pauling electronegativities.
 *
 * Pure data and lookups — no Scenery imports, so parsers and tests can use it directly.
 */

export type ElementData = {
  readonly number: number;
  readonly symbol: string;
  readonly name: string;
  /** Jmol CPK colour as 0xRRGGBB. */
  readonly color: number;
  /** Covalent (bonding) radius, Å. */
  readonly covalentRadius: number;
  /** Van der Waals radius, Å. */
  readonly vdwRadius: number;
  /** Standard atomic weight, g/mol. */
  readonly mass: number;
  /** Pauling electronegativity (a neutral 1.5 where undefined). */
  readonly electronegativity: number;
};

// symbol, name, colour, covalent radius, vdW radius (0 = estimate), mass, electronegativity (0 = undefined)
const TABLE =
  "H,hydrogen,FFFFFF,0.31,1.10,1.008,2.20;He,helium,D9FFFF,0.28,1.40,4.0026,0;" +
  "Li,lithium,CC80FF,1.28,1.82,6.94,0.98;Be,beryllium,C2FF00,0.96,1.53,9.0122,1.57;" +
  "B,boron,FFB5B5,0.84,1.92,10.81,2.04;C,carbon,909090,0.76,1.70,12.011,2.55;" +
  "N,nitrogen,3050F8,0.71,1.55,14.007,3.04;O,oxygen,FF0D0D,0.66,1.52,15.999,3.44;" +
  "F,fluorine,90E050,0.57,1.47,18.998,3.98;Ne,neon,B3E3F5,0.58,1.54,20.180,0;" +
  "Na,sodium,AB5CF2,1.66,2.27,22.990,0.93;Mg,magnesium,8AFF00,1.41,1.73,24.305,1.31;" +
  "Al,aluminum,BFA6A6,1.21,1.84,26.982,1.61;Si,silicon,F0C8A0,1.11,2.10,28.085,1.90;" +
  "P,phosphorus,FF8000,1.07,1.80,30.974,2.19;S,sulfur,FFFF30,1.05,1.80,32.06,2.58;" +
  "Cl,chlorine,1FF01F,1.02,1.75,35.45,3.16;Ar,argon,80D1E3,1.06,1.88,39.948,0;" +
  "K,potassium,8F40D4,2.03,2.75,39.098,0.82;Ca,calcium,3DFF00,1.76,2.31,40.078,1.00;" +
  "Sc,scandium,E6E6E6,1.70,2.11,44.956,1.36;Ti,titanium,BFC2C7,1.60,0,47.867,1.54;" +
  "V,vanadium,A6A6AB,1.53,0,50.942,1.63;Cr,chromium,8A99C7,1.39,0,51.996,1.66;" +
  "Mn,manganese,9C7AC7,1.39,0,54.938,1.55;Fe,iron,E06633,1.32,0,55.845,1.83;" +
  "Co,cobalt,F090A0,1.26,0,58.933,1.88;Ni,nickel,50D050,1.24,1.63,58.693,1.91;" +
  "Cu,copper,C88033,1.32,1.40,63.546,1.90;Zn,zinc,7D80B0,1.22,1.39,65.38,1.65;" +
  "Ga,gallium,C28F8F,1.22,1.87,69.723,1.81;Ge,germanium,668F8F,1.20,2.11,72.630,2.01;" +
  "As,arsenic,BD80E3,1.19,1.85,74.922,2.18;Se,selenium,FFA100,1.20,1.90,78.971,2.55;" +
  "Br,bromine,A62929,1.20,1.85,79.904,2.96;Kr,krypton,5CB8D1,1.16,2.02,83.798,3.00;" +
  "Rb,rubidium,702EB0,2.20,3.03,85.468,0.82;Sr,strontium,00FF00,1.95,2.49,87.62,0.95;" +
  "Y,yttrium,94FFFF,1.90,0,88.906,1.22;Zr,zirconium,94E0E0,1.75,0,91.224,1.33;" +
  "Nb,niobium,73C2C9,1.64,0,92.906,1.6;Mo,molybdenum,54B5B5,1.54,0,95.95,2.16;" +
  "Tc,technetium,3B9E9E,1.47,0,98,1.9;Ru,ruthenium,248F8F,1.46,0,101.07,2.2;" +
  "Rh,rhodium,0A7D8C,1.42,0,102.91,2.28;Pd,palladium,006985,1.39,1.63,106.42,2.20;" +
  "Ag,silver,C0C0C0,1.45,1.72,107.87,1.93;Cd,cadmium,FFD98F,1.44,1.58,112.41,1.69;" +
  "In,indium,A67573,1.42,1.93,114.82,1.78;Sn,tin,668080,1.39,2.17,118.71,1.96;" +
  "Sb,antimony,9E63B5,1.39,2.06,121.76,2.05;Te,tellurium,D47A00,1.38,2.06,127.60,2.1;" +
  "I,iodine,940094,1.39,1.98,126.90,2.66;Xe,xenon,429EB0,1.40,2.16,131.29,2.6;" +
  "Cs,cesium,57178F,2.44,3.43,132.91,0.79;Ba,barium,00C900,2.15,2.68,137.33,0.89;" +
  "La,lanthanum,70D4FF,2.07,0,138.91,1.10;Ce,cerium,FFFFC7,2.04,0,140.12,1.12;" +
  "Pr,praseodymium,D9FFC7,2.03,0,140.91,1.13;Nd,neodymium,C7FFC7,2.01,0,144.24,1.14;" +
  "Pm,promethium,A3FFC7,1.99,0,145,1.13;Sm,samarium,8FFFC7,1.98,0,150.36,1.17;" +
  "Eu,europium,61FFC7,1.98,0,151.96,1.2;Gd,gadolinium,45FFC7,1.96,0,157.25,1.20;" +
  "Tb,terbium,30FFC7,1.94,0,158.93,1.1;Dy,dysprosium,1FFFC7,1.92,0,162.50,1.22;" +
  "Ho,holmium,00FF9C,1.92,0,164.93,1.23;Er,erbium,00E675,1.89,0,167.26,1.24;" +
  "Tm,thulium,00D452,1.90,0,168.93,1.25;Yb,ytterbium,00BF38,1.87,0,173.05,1.1;" +
  "Lu,lutetium,00AB24,1.87,0,174.97,1.27;Hf,hafnium,4DC2FF,1.75,0,178.49,1.3;" +
  "Ta,tantalum,4DA6FF,1.70,0,180.95,1.5;W,tungsten,2194D6,1.62,0,183.84,2.36;" +
  "Re,rhenium,267DAB,1.51,0,186.21,1.9;Os,osmium,266696,1.44,0,190.23,2.2;" +
  "Ir,iridium,175487,1.41,0,192.22,2.20;Pt,platinum,D0D0E0,1.36,1.75,195.08,2.28;" +
  "Au,gold,FFD123,1.36,1.66,196.97,2.54;Hg,mercury,B8B8D0,1.32,1.55,200.59,2.00;" +
  "Tl,thallium,A6544D,1.45,1.96,204.38,1.62;Pb,lead,575961,1.46,2.02,207.2,2.33;" +
  "Bi,bismuth,9E4FB5,1.48,2.07,208.98,2.02;Po,polonium,AB5C00,1.40,1.97,209,2.0;" +
  "At,astatine,754F45,1.50,2.02,210,2.2;Rn,radon,428296,1.50,2.20,222,0;" +
  "Fr,francium,420066,2.60,3.48,223,0.7;Ra,radium,007D00,2.21,2.83,226,0.9;" +
  "Ac,actinium,70ABFA,2.15,0,227,1.1;Th,thorium,00BAFF,2.06,0,232.04,1.3;" +
  "Pa,protactinium,00A1FF,2.00,0,231.04,1.5;U,uranium,008FFF,1.96,1.86,238.03,1.38";

/** Placeholder for unknown element symbols (dummy atoms, "X", unparseable labels). */
export const UNKNOWN_ELEMENT: ElementData = {
  number: 0,
  symbol: "Xx",
  name: "unknown",
  color: 0xff1493,
  covalentRadius: 0.7,
  vdwRadius: 1.5,
  mass: 0,
  electronegativity: 1.5,
};

const ELEMENTS: readonly ElementData[] = TABLE.split(";").map((row, index) => {
  const [symbol = "", name = "", color = "0", covalent = "1", vdw = "0", mass = "0", en = "0"] = row.split(",");
  const covalentRadius = Number(covalent);
  const vdwValue = Number(vdw);
  const enValue = Number(en);
  return {
    number: index + 1,
    symbol,
    name,
    color: Number.parseInt(color, 16),
    covalentRadius,
    // Transition metals and lanthanides have no well-agreed vdW radius; Jmol-style estimate.
    vdwRadius: vdwValue > 0 ? vdwValue : covalentRadius + 0.6,
    mass: Number(mass),
    electronegativity: enValue > 0 ? enValue : 1.5,
  };
});

const BY_SYMBOL = new Map<string, ElementData>();
const BY_NAME = new Map<string, ElementData>();
for (const element of ELEMENTS) {
  BY_SYMBOL.set(element.symbol.toUpperCase(), element);
  BY_NAME.set(element.name, element);
}
// Common alternate spellings accepted by the selection language.
const aluminium = BY_NAME.get("aluminum");
const sulphur = BY_NAME.get("sulfur");
if (aluminium) {
  BY_NAME.set("aluminium", aluminium);
}
if (sulphur) {
  BY_NAME.set("sulphur", sulphur);
}
// Deuterium and tritium are hydrogen for display purposes.
const hydrogen = BY_SYMBOL.get("H");
if (hydrogen) {
  BY_SYMBOL.set("D", hydrogen);
  BY_SYMBOL.set("T", hydrogen);
}

/** Every element in atomic-number order (index 0 is hydrogen). */
export function allElements(): readonly ElementData[] {
  return ELEMENTS;
}

/** Element for a symbol, case-insensitive ("CL", "cl", "Cl"); {@link UNKNOWN_ELEMENT} if unknown. */
export function elementForSymbol(symbol: string): ElementData {
  return BY_SYMBOL.get(symbol.trim().toUpperCase()) ?? UNKNOWN_ELEMENT;
}

/** Element for an atomic number; {@link UNKNOWN_ELEMENT} if out of range. */
export function elementForNumber(atomicNumber: number): ElementData {
  return ELEMENTS[atomicNumber - 1] ?? UNKNOWN_ELEMENT;
}

/** Element for an English element name ("carbon"), or null. Used by the selection language. */
export function elementForName(name: string): ElementData | null {
  return BY_NAME.get(name.toLowerCase()) ?? null;
}

/** True if the symbol names a real element. */
export function isElementSymbol(symbol: string): boolean {
  return BY_SYMBOL.has(symbol.trim().toUpperCase());
}

/**
 * Best-effort element from an atom label such as "Si1", "O2-", "CA" (with a residue hint) or "Fe3+".
 * Tries the two leading letters, then the first one.
 */
export function elementFromLabel(label: string): ElementData {
  const letters = label.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 2) {
    const two = BY_SYMBOL.get(letters.slice(0, 2).toUpperCase());
    if (two && letters[1] === letters[1]?.toLowerCase()) {
      return two;
    }
  }
  return BY_SYMBOL.get(letters.slice(0, 1).toUpperCase()) ?? UNKNOWN_ELEMENT;
}
