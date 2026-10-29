/**
 * CarbonSpectrum.ts
 *
 * A ¹³C NMR spectrum from the molecular graph:
 *
 *  1. **Environments.** Carbons in one topological symmetry class give one line, so counting lines
 *     counts the kinds of carbon: o-, m- and p-xylene show 4, 5 and 3.
 *  2. **Shifts** by additivity (Grant–Paul for alkanes, substituent increments after Pretsch et al.,
 *     *Structure Determination of Organic Compounds*): sp³ carbons start from methane (−2.3 ppm) and
 *     add an α, β, γ increment for each carbon or functional group 1, 2, 3 bonds away; aromatic
 *     carbons start from benzene (128.5) with ipso/ortho/meta/para increments; alkene carbons start
 *     from ethene (123.3) with increments for groups on the same and on the other carbon; carbonyl
 *     carbons have characteristic values per functional group.
 *  3. **Spectrum types.** Proton-decoupled: one singlet per environment. Real decoupled spectra are
 *     not quantitative — carbons without hydrogens get little nuclear Overhauser enhancement and
 *     relax slowly — so quaternary carbons are drawn smaller. DEPT-135 shows CH and CH₃ up, CH₂ down
 *     and no quaternary carbons; DEPT-90 shows only CH. Without decoupling, each carbon is split by
 *     its own hydrogens into n + 1 lines, ¹J ≈ 125 Hz (sp³) to 170 Hz (aldehyde); the much smaller
 *     long-range couplings are ignored.
 *
 * ¹³C resonates at 1/3.977 of the ¹H frequency (the ratio of the gyromagnetic ratios), so a
 * "300 MHz" magnet observes carbon at 75 MHz.
 */

import { toFixed } from "scenerystack/dot";
import type { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import { multipletLines } from "./ProtonSpectrum.js";

/** γ(¹H)/γ(¹³C). */
export const PROTON_TO_CARBON_FREQUENCY = 3.9767;

export const CarbonSpectrumType = {
  DECOUPLED: "decoupled",
  DEPT_135: "dept135",
  DEPT_90: "dept90",
  COUPLED: "coupled",
} as const;
export type CarbonSpectrumTypeValue = (typeof CarbonSpectrumType)[keyof typeof CarbonSpectrumType];

/** Height of a carbon line without attached hydrogens relative to one with them (little NOE, long T₁). */
const QUATERNARY_HEIGHT = 0.35;

/** One-bond C–H couplings, Hz. */
const ONE_BOND_COUPLING = { sp3: 125, alkene: 156, aromatic: 159, aldehyde: 172, nitrile: 250 } as const;

// ── Shift increments, ppm ──────────────────────────────────────────────────────
const METHANE = -2.3;
/** Grant–Paul: each sp³ carbon 1, 2, 3 bonds away. */
const ALKYL = [9.1, 9.4, -2.5] as const;
/** [α, β, γ] for functional groups on (or 1–2 carbons from) an sp³ carbon. */
const GROUP = {
  hydroxyl: [48, 10, -5],
  ether: [58, 8, -4],
  esterOxygen: [53.5, 6, -4],
  amine: [29, 11, -5],
  chlorine: [31, 11, -4],
  aldehyde: [32, 0, -2],
  ketone: [32, 1, -2],
  acid: [23, 3, -2],
  ester: [23, 3, -2],
  amide: [25, 3, -1],
  nitrile: [4, 3, -3],
  aryl: [23, 9, -2],
  vinyl: [20, 7, -2],
} as const;
type GroupName = keyof typeof GROUP;
/** A carbon on the far side of an ether O or an amine N (CH₃–O–CH₃, (CH₃)₂NH). */
const ACROSS_OXYGEN = 4;
const ACROSS_NITROGEN = 10;
/** Saturated six-ring carbons (cyclohexane 27.0 ppm, not the 32 the open-chain sums give). */
const SIX_RING = -5;

const BENZENE = 128.5;
/** [ipso, ortho, meta, para] for ring substituents. */
const AROMATIC = {
  methyl: [9.3, 0.7, -0.1, -2.9],
  alkyl: [15.6, -0.5, 0, -2.6],
  hydroxyl: [26.9, -12.8, 1.4, -7.4],
  formyl: [8.2, 1.2, 0.5, 5.8],
} as const;
/** Ring-fusion carbons of naphthalene-like systems, and the CH next to them. */
const FUSION_CARBON = 133;
const NEXT_TO_FUSION = 128;
const AWAY_FROM_FUSION = 126;

const ETHENE = 123.3;
/** [same carbon, other carbon of the C=C] for groups on an alkene carbon. */
const ALKENE = {
  alkyl: [10.6, -7.9],
  hydroxymethyl: [14.2, -8.4],
  vinyl: [13.6, -7],
  ether: [29.4, -38.9],
  amine: [28, -32],
} as const;
/** Each further carbon on an alkyl substituent of an alkene: same side, other side. */
const ALKENE_ALKYL_BETA = [7.2, -1.8] as const;

/** Carbonyl carbons: base value and the shift per carbon β to the carbonyl. */
const CARBONYL = {
  ketone: [206.6, 2.5],
  aldehyde: [200.5, 2.3],
  aromaticAldehyde: [192.4, 0],
  acid: [177.5, 3],
  ester: [171, 3.5],
  amide: [172.7, 0],
} as const;
const CARBON_DIOXIDE = 124.9;
const NITRILE_CARBON = 116.9;
/** Fallbacks for anything the rules do not cover. */
const GENERIC_SP2 = 130;
const GENERIC_SP = 80;
const IMINIUM_CARBON = 160;

export type CarbonEnvironment = {
  /** "1", "2", … in order of decreasing shift. */
  readonly label: string;
  readonly atoms: readonly number[];
  readonly shift: number;
  /** Hydrogens on each carbon of the environment (0 = quaternary). */
  readonly hydrogens: number;
  /** ¹J(C–H), Hz (0 without hydrogens). */
  readonly oneBondCoupling: number;
};

export type CarbonLine = {
  readonly position: number;
  /** Signed height: negative for CH₂ in DEPT-135. */
  readonly height: number;
  readonly environment: number;
};

export function carbonEnvironments(graph: MoleculeGraph): CarbonEnvironment[] {
  const byClass = new Map<number, number[]>();
  for (let atom = 0; atom < graph.atomCount; atom++) {
    if (graph.symbol(atom) === "C") {
      const c = graph.classes[atom] ?? -1;
      byClass.set(c, [...(byClass.get(c) ?? []), atom]);
    }
  }
  return [...byClass.values()]
    .map((atoms) => {
      const carbon = atoms[0] ?? 0;
      const hydrogens = graph.hydrogenCount(carbon);
      return {
        atoms,
        shift: estimateCarbonShift(graph, carbon),
        hydrogens,
        oneBondCoupling: hydrogens > 0 ? oneBondCoupling(graph, carbon) : 0,
      };
    })
    .sort((p, q) => q.shift - p.shift)
    .map((environment, index) => ({ ...environment, label: `${index + 1}` }));
}

/** The lines of a ¹³C spectrum of the given type, at a ¹H spectrometer frequency (MHz). */
export function carbonLines(
  environments: readonly CarbonEnvironment[],
  type: CarbonSpectrumTypeValue,
  protonField: number,
): CarbonLine[] {
  const carbonField = protonField / PROTON_TO_CARBON_FREQUENCY;
  return environments.flatMap((environment, index) => {
    const h = environment.hydrogens;
    const height = environment.atoms.length * (h > 0 ? 1 : QUATERNARY_HEIGHT);
    if (type === CarbonSpectrumType.COUPLED) {
      return multipletLines(h > 0 ? [{ j: environment.oneBondCoupling, count: h }] : []).map((line) => ({
        position: environment.shift + line.offsetHz / carbonField,
        height: height * line.weight,
        environment: index,
      }));
    }
    const sign = editedSign(type, h);
    return sign === 0 ? [] : [{ position: environment.shift, height: sign * height, environment: index }];
  });
}

/** +1, −1 or 0 (absent) for a carbon with `h` hydrogens in a decoupled or DEPT spectrum. */
function editedSign(type: CarbonSpectrumTypeValue, h: number): number {
  if (type === CarbonSpectrumType.DEPT_135) {
    return h === 0 ? 0 : h === 2 ? -1 : 1;
  }
  if (type === CarbonSpectrumType.DEPT_90) {
    return h === 1 ? 1 : 0;
  }
  return 1;
}

/** "CH₃", "CH₂", "CH", "C" (or "CH₄"). */
export function carbonTypeName(hydrogens: number): string {
  return ["C", "CH", "CH₂", "CH₃", "CH₄"][hydrogens] ?? `CH${toFixed(hydrogens, 0)}`;
}

// ── Shift rules ─────────────────────────────────────────────────────────────────

export function estimateCarbonShift(graph: MoleculeGraph, carbon: number): number {
  const heavy = heavyNeighbors(graph, carbon);
  const doubleO = heavy.filter((n) => graph.symbol(n) === "O" && graph.order(carbon, n) === 2);
  if (doubleO.length === 2) {
    return CARBON_DIOXIDE;
  }
  if (graph.isCarbonylCarbon(carbon)) {
    return carbonylShift(graph, carbon);
  }
  if (heavy.some((n) => graph.order(carbon, n) === 3)) {
    return heavy.some((n) => graph.symbol(n) === "N") ? NITRILE_CARBON : GENERIC_SP;
  }
  if (graph.isAromatic(carbon)) {
    return aromaticShift(graph, carbon);
  }
  if (graph.isAlkeneCarbon(carbon)) {
    return alkeneShift(graph, carbon);
  }
  if (graph.isSaturatedCarbon(carbon)) {
    return saturatedShift(graph, carbon);
  }
  // C=N⁺ ends of a cyanine, or anything else unsaturated.
  return heavy.some((n) => graph.symbol(n) === "N" && graph.order(carbon, n) === 2) ? IMINIUM_CARBON : GENERIC_SP2;
}

function heavyNeighbors(graph: MoleculeGraph, atom: number): number[] {
  return (graph.neighbors[atom] ?? []).filter((n) => graph.symbol(n) !== "H");
}

/** The functional group an atom represents when seen from the saturated carbon `from`, or null for sp³ C. */
function groupOf(graph: MoleculeGraph, x: number, from: number): GroupName | null {
  const symbol = graph.symbol(x);
  if (symbol === "O") {
    const beyond = heavyNeighbors(graph, x).find((n) => n !== from);
    if (beyond === undefined) {
      return "hydroxyl";
    }
    return graph.isCarbonylCarbon(beyond) ? "esterOxygen" : "ether";
  }
  if (symbol === "N") {
    return "amine";
  }
  if (symbol === "Cl") {
    return "chlorine";
  }
  if (symbol !== "C" || graph.isSaturatedCarbon(x)) {
    return null;
  }
  if (graph.isCarbonylCarbon(x)) {
    const kind = carbonylKind(graph, x);
    return kind === "aromaticAldehyde" ? "aldehyde" : kind;
  }
  if (graph.isAromatic(x)) {
    return "aryl";
  }
  if (heavyNeighbors(graph, x).some((n) => graph.order(x, n) === 3)) {
    return "nitrile";
  }
  return "vinyl";
}

function saturatedShift(graph: MoleculeGraph, carbon: number): number {
  let shift = METHANE;
  // Walk outward through sp³ carbons only; a functional group ends the walk.
  let frontier = [carbon];
  const seen = new Set([carbon]);
  for (let distance = 0; distance < 3 && frontier.length > 0; distance++) {
    const next: number[] = [];
    for (const atom of frontier) {
      for (const x of heavyNeighbors(graph, atom)) {
        if (seen.has(x)) {
          continue;
        }
        seen.add(x);
        const group = groupOf(graph, x, atom);
        if (group === null) {
          next.push(x);
        }
        shift += group === null ? (ALKYL[distance] ?? 0) : groupIncrement(graph, carbon, x, group, distance);
      }
    }
    frontier = next;
  }
  return inSixRing(graph, carbon) ? shift + SIX_RING : shift;
}

/** A functional group's increment at `distance` bonds (0 = α), plus carbons across an α ether O or amine N. */
function groupIncrement(graph: MoleculeGraph, carbon: number, x: number, group: GroupName, distance: number): number {
  const increment = GROUP[group][distance] ?? 0;
  if (distance !== 0 || !(group === "ether" || group === "amine")) {
    return increment;
  }
  const across = heavyNeighbors(graph, x).filter((n) => n !== carbon && graph.symbol(n) === "C").length;
  return increment + across * (group === "ether" ? ACROSS_OXYGEN : ACROSS_NITROGEN);
}

/** Whether the atom closes a ring of six heavy atoms. */
function inSixRing(graph: MoleculeGraph, atom: number): boolean {
  const walk = (path: number[]): boolean => {
    const last = path[path.length - 1] ?? atom;
    for (const n of heavyNeighbors(graph, last)) {
      if (path.length === 6 && n === atom) {
        return true;
      }
      if (path.length < 6 && !path.includes(n) && walk([...path, n])) {
        return true;
      }
    }
    return false;
  };
  return walk([atom]);
}

type CarbonylKind = "ketone" | "aldehyde" | "aromaticAldehyde" | "acid" | "ester" | "amide";

function carbonylKind(graph: MoleculeGraph, carbon: number): CarbonylKind {
  const single = heavyNeighbors(graph, carbon).filter((n) => graph.order(carbon, n) === 1);
  const oxygen = single.find((n) => graph.symbol(n) === "O");
  if (oxygen !== undefined) {
    return graph.hydrogenCount(oxygen) > 0 ? "acid" : "ester";
  }
  if (single.some((n) => graph.symbol(n) === "N")) {
    return "amide";
  }
  if (graph.hydrogenCount(carbon) > 0) {
    return single.some((n) => graph.isAromatic(n)) ? "aromaticAldehyde" : "aldehyde";
  }
  return "ketone";
}

function carbonylShift(graph: MoleculeGraph, carbon: number): number {
  const [base, perBeta] = CARBONYL[carbonylKind(graph, carbon)];
  let beta = 0;
  for (const alpha of heavyNeighbors(graph, carbon)) {
    if (graph.symbol(alpha) === "C" && graph.isSaturatedCarbon(alpha)) {
      beta += heavyNeighbors(graph, alpha).filter((n) => n !== carbon && graph.symbol(n) === "C").length;
    }
  }
  return base + perBeta * beta;
}

function aromaticShift(graph: MoleculeGraph, carbon: number): number {
  const rings = graph.aromaticRings.filter((r) => r.includes(carbon));
  const isFusion = (atom: number) => graph.aromaticRings.filter((r) => r.includes(atom)).length > 1;
  if (rings.length > 1 || isFusion(carbon)) {
    return FUSION_CARBON;
  }
  const ring = rings[0] ?? [];
  if (ring.some(isFusion)) {
    return heavyNeighbors(graph, carbon).some(isFusion) ? NEXT_TO_FUSION : AWAY_FROM_FUSION;
  }
  const position = ring.indexOf(carbon);
  let shift = BENZENE;
  ring.forEach((ringAtom, index) => {
    const separation = Math.min(Math.abs(index - position), 6 - Math.abs(index - position));
    for (const x of heavyNeighbors(graph, ringAtom)) {
      if (ring.includes(x)) {
        continue;
      }
      const increments =
        graph.symbol(x) === "O"
          ? AROMATIC.hydroxyl
          : graph.isCarbonylCarbon(x)
            ? AROMATIC.formyl
            : graph.hydrogenCount(x) === 3
              ? AROMATIC.methyl
              : AROMATIC.alkyl;
      shift += increments[separation] ?? 0;
    }
  });
  return shift;
}

function alkeneShift(graph: MoleculeGraph, carbon: number): number {
  const partner = graph.doublyBonded(carbon, "C");
  const sum = (atom: number | null, side: 0 | 1) =>
    atom === null
      ? 0
      : heavyNeighbors(graph, atom)
          .filter((x) => x !== carbon && x !== partner)
          .reduce((total, x) => total + alkeneIncrement(graph, atom, x, side), 0);
  return ETHENE + sum(carbon, 0) + sum(partner, 1);
}

/** Increment for substituent `x` on alkene carbon `atom`, seen from the same (0) or the other (1) carbon. */
function alkeneIncrement(graph: MoleculeGraph, atom: number, x: number, side: 0 | 1): number {
  const symbol = graph.symbol(x);
  if (symbol === "O") {
    return ALKENE.ether[side];
  }
  if (symbol === "N") {
    return ALKENE.amine[side];
  }
  if (graph.isAlkeneCarbon(x) || graph.isAromatic(x)) {
    return ALKENE.vinyl[side];
  }
  if (!graph.isSaturatedCarbon(x)) {
    return 0;
  }
  const further = heavyNeighbors(graph, x).filter((n) => n !== atom);
  return further.some((n) => graph.symbol(n) === "O")
    ? ALKENE.hydroxymethyl[side]
    : ALKENE.alkyl[side] + further.length * ALKENE_ALKYL_BETA[side];
}

function oneBondCoupling(graph: MoleculeGraph, carbon: number): number {
  if (graph.isCarbonylCarbon(carbon)) {
    return ONE_BOND_COUPLING.aldehyde;
  }
  if (graph.isAromatic(carbon)) {
    return ONE_BOND_COUPLING.aromatic;
  }
  if (heavyNeighbors(graph, carbon).some((n) => graph.order(carbon, n) === 3)) {
    return ONE_BOND_COUPLING.nitrile;
  }
  return graph.isSaturatedCarbon(carbon) ? ONE_BOND_COUPLING.sp3 : ONE_BOND_COUPLING.alkene;
}
