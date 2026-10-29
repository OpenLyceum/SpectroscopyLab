/**
 * UnknownsModel.ts
 *
 * The Unknowns game. Each round hides one molecule of an isomer family — every candidate has the
 * same formula, so the formula and molecular ion only narrow the field — and shows its IR and
 * ¹H NMR spectra, and on request its ¹³C spectrum, whose line count tells the xylenes apart. The
 * student picks the structure; a first-try answer scores a point.
 *
 * Level 1 has two or three candidates with very different functional groups (alcohol vs ether);
 * level 2 adds carbonyl and ester isomers; level 3 is the C₈H₁₀ aromatics, told apart by ring
 * substitution patterns. A family is offered only when every member has its IR data computed.
 */

import { NumberProperty, Property } from "scenerystack/axon";
import { dotRandom } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { hasVibrationData, loadMolecule } from "../../common/model/library/SpectroscopyLibrary.js";
import type { Molecule } from "../../common/model/Molecule.js";
import { MoleculeGraph } from "../../common/model/MoleculeGraph.js";
import type { SampledCurve } from "../../common/model/SpectrumCurve.js";
import { computePeaks, IsotopeScheme, transmittanceCurve } from "../../infrared/model/InfraredModel.js";
import { CarbonSpectrumType, carbonEnvironments, carbonLines } from "../../nmr/model/CarbonSpectrum.js";
import { carbonSpectrum, fullSpectrum, integralTrace, Nucleus, type NucleusValue } from "../../nmr/model/NMRModel.js";
import { protonEnvironments } from "../../nmr/model/ProtonSpectrum.js";

/** Isomer families by level. */
export const LEVEL_FAMILIES: readonly (readonly (readonly string[])[])[] = [
  [
    ["ethanol", "dimethyl-ether"],
    ["1-propanol", "2-propanol", "ethyl-methyl-ether"],
  ],
  [
    ["acetone", "propanal", "allyl-alcohol", "methyl-vinyl-ether"],
    ["ethyl-acetate", "methyl-propanoate", "butanoic-acid", "1-4-dioxane"],
  ],
  [["ethylbenzene", "o-xylene", "m-xylene", "p-xylene"]],
];
export const LEVEL_COUNT = LEVEL_FAMILIES.length;

const IR_HALF_WIDTH = 10; // cm⁻¹
const NMR_FIELD = 300; // MHz

export type Unknown = {
  readonly target: Molecule;
  readonly candidates: readonly string[];
  readonly irSpectrum: SampledCurve;
  readonly nmrSpectrum: SampledCurve;
  readonly nmrIntegral: SampledCurve;
  /** ¹H-decoupled ¹³C spectrum at the same field. */
  readonly carbonSpectrum: SampledCurve;
};

export const GuessResult = {
  NONE: "none",
  CORRECT: "correct",
  INCORRECT: "incorrect",
} as const;
export type GuessResultValue = (typeof GuessResult)[keyof typeof GuessResult];

export class UnknownsModel implements TModel {
  /** 1-based level. */
  public readonly levelProperty: NumberProperty;
  public readonly scoreProperty: NumberProperty;
  public readonly roundsProperty: NumberProperty;
  public readonly unknownProperty: Property<Unknown | null>;
  /** Candidate ids already guessed wrong this round. */
  public readonly wrongGuessesProperty: Property<readonly string[]>;
  public readonly resultProperty: Property<GuessResultValue>;
  /** Which NMR spectrum is shown. */
  public readonly nucleusProperty: Property<NucleusValue>;

  public constructor() {
    this.levelProperty = new NumberProperty(1, { numberType: "Integer" });
    this.scoreProperty = new NumberProperty(0, { numberType: "Integer" });
    this.roundsProperty = new NumberProperty(0, { numberType: "Integer" });
    this.unknownProperty = new Property<Unknown | null>(null);
    this.wrongGuessesProperty = new Property<readonly string[]>([]);
    this.resultProperty = new Property<GuessResultValue>(GuessResult.NONE);
    this.nucleusProperty = new Property<NucleusValue>(Nucleus.PROTON);

    this.levelProperty.link(() => this.newUnknown());
  }

  public get solved(): boolean {
    return this.resultProperty.value === GuessResult.CORRECT;
  }

  /** Families at the current level whose members all have IR data (falling back to any level). */
  public availableFamilies(level = this.levelProperty.value): (readonly string[])[] {
    const ready = (family: readonly string[]) => family.every(hasVibrationData);
    const atLevel = (LEVEL_FAMILIES[level - 1] ?? []).filter(ready);
    return atLevel.length > 0 ? atLevel : LEVEL_FAMILIES.flat().filter(ready);
  }

  /** Starts a new round (the spectra are computed asynchronously). */
  public newUnknown(): void {
    this.loadUnknown().catch(() => {
      this.unknownProperty.value = null;
    });
  }

  private async loadUnknown(): Promise<void> {
    const families = this.availableFamilies();
    const family = families.length > 0 ? families[dotRandom.nextInt(families.length)] : undefined;
    if (!family) {
      this.unknownProperty.value = null;
      return;
    }
    // Avoid repeating the previous molecule when there is a choice.
    const previous = this.unknownProperty.value?.target.id;
    const choices = family.filter((id) => id !== previous);
    const targetId = choices[dotRandom.nextInt(choices.length)] ?? family[0] ?? "";
    const level = this.levelProperty.value;
    const unknown = await buildUnknown(targetId, family);
    if (this.levelProperty.value === level) {
      this.unknownProperty.value = unknown;
      this.wrongGuessesProperty.value = [];
      this.resultProperty.value = GuessResult.NONE;
    }
  }

  public guess(id: string): void {
    const unknown = this.unknownProperty.value;
    if (!unknown || this.solved || this.wrongGuessesProperty.value.includes(id)) {
      return;
    }
    if (id === unknown.target.id) {
      if (this.wrongGuessesProperty.value.length === 0) {
        this.scoreProperty.value++;
      }
      this.roundsProperty.value++;
      this.resultProperty.value = GuessResult.CORRECT;
    } else {
      this.wrongGuessesProperty.value = [...this.wrongGuessesProperty.value, id];
      this.resultProperty.value = GuessResult.INCORRECT;
    }
  }

  public reset(): void {
    this.scoreProperty.reset();
    this.roundsProperty.reset();
    this.nucleusProperty.reset();
    if (this.levelProperty.value === 1) {
      this.newUnknown();
    }
    this.levelProperty.reset();
  }

  public step(_dt: number): void {
    // The game is turn-based; nothing animates.
  }
}

/** The spectra a student is given for one unknown. */
export async function buildUnknown(targetId: string, candidates: readonly string[]): Promise<Unknown> {
  const target = await loadMolecule(targetId);
  const graph = new MoleculeGraph(target);
  const environments = protonEnvironments(graph);
  const carbon = carbonLines(carbonEnvironments(graph), CarbonSpectrumType.DECOUPLED, NMR_FIELD);
  return {
    target,
    candidates,
    irSpectrum: transmittanceCurve(computePeaks(target, IsotopeScheme.NATURAL), IR_HALF_WIDTH),
    nmrSpectrum: fullSpectrum(environments, NMR_FIELD, true, graph),
    nmrIntegral: integralTrace(fullSpectrum(environments, NMR_FIELD, false, graph)),
    carbonSpectrum: carbonSpectrum(carbon, NMR_FIELD, true),
  };
}
