/**
 * SpectroscopyLabConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use SI units (metres, seconds, kilograms, …);
 *    note the unit in a comment on each value.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in SpectroscopyLabColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 *
 * Remove the example constants below and replace them with the sim's own.
 */

import SpectroscopyLabNamespace from "./SpectroscopyLabNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

// ── Physics / model defaults (SI units) ───────────────────────────────────────

// Example: export const GRAVITY_MPS2 = 9.81; // m/s²

/** Settings for common/SpectroscopyLabControlOptions.ts. */
export const SPECTROSCOPY_LAB_CONTROL_OPTIONS_SETTINGS = {
  /** Slider thumb size width (px). */
  SLIDER_THUMB_SIZE_WIDTH: 12,
  /** Slider thumb size height (px). */
  SLIDER_THUMB_SIZE_HEIGHT: 22,
  /** Standalone slider track size width (px). */
  STANDALONE_SLIDER_TRACK_SIZE_WIDTH: 150,
  /** Standalone slider track size height (px). */
  STANDALONE_SLIDER_TRACK_SIZE_HEIGHT: 3,
  /** Number control slider track size width (px). */
  NUMBER_CONTROL_SLIDER_TRACK_SIZE_WIDTH: 110,
  /** Number control slider track size height (px). */
  NUMBER_CONTROL_SLIDER_TRACK_SIZE_HEIGHT: 3,
  /** Checkbox box width (px). */
  CHECKBOX_BOX_WIDTH: 16,
  /** Spectroscopy lab number control options scale (dimensionless). */
  SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS_SCALE: 0.75,
  /** Spectroscopy lab number control options slider padding (px). */
  SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS_SLIDER_PADDING: 4,
  /** Spectroscopy lab number control options arrow button spacing (px). */
  SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS_ARROW_BUTTON_SPACING: 3,
  /** Spectroscopy lab number control options vertical spacing (px). */
  SPECTROSCOPY_LAB_NUMBER_CONTROL_OPTIONS_VERTICAL_SPACING: 4,
  /** Spectroscopy lab checkbox options spacing (px). */
  SPECTROSCOPY_LAB_CHECKBOX_OPTIONS_SPACING: 4,
} as const;

/** Settings for common/SpectroscopyLabPanel.ts. */
export const SPECTROSCOPY_LAB_PANEL_SETTINGS = {
  /** Options x margin (px). */
  OPTIONS_X_MARGIN: 12,
  /** Options y margin (px). */
  OPTIONS_Y_MARGIN: 10,
} as const;

/** Settings for common/SpectroscopyLabScreenIcons.ts. */
export const SPECTROSCOPY_LAB_SCREEN_ICONS_SETTINGS = {
  TRACE_SPACING: 15, // px
  TRACE_SPACING_SEGMENT_2: 14, // px
  CLUES_X_SEGMENT_2: 353, // px
  CLUES_X_SEGMENT_3: 366, // px
  CLUES_Y_SEGMENT_2: 177, // px
  CLUES_X_SEGMENT_4: 379, // px
  CLUES_X_SEGMENT_5: 401, // px
  CLUES_X_SEGMENT_6: 411, // px
  CLUES_Y_SEGMENT_3: 194, // px
  CLUES_X_SEGMENT_7: 421, // px
  CLUES_X_SEGMENT_8: 464, // px
  CLUES_X_MOVE_TO_Y: 284, // px
  CLUES_Y_SEGMENT_4: 284, // px
  CLUES_X_SEGMENT_9: 351, // px
  CLUES_Y_SEGMENT_5: 251, // px
  CLUES_X_SEGMENT_10: 365, // px
  CLUES_Y_SEGMENT_6: 284, // px
  CLUES_Y_SEGMENT_7: 229, // px
  CLUES_X_SEGMENT_11: 379, // px
  CLUES_Y_SEGMENT_8: 284, // px
  CLUES_Y_SEGMENT_9: 251, // px
  CLUES_X_SEGMENT_12: 438, // px
  CLUES_Y_SEGMENT_10: 284, // px
  CLUES_Y_SEGMENT_11: 239, // px
  QUESTION_CONTROL_1_X_SEGMENT_2: 197, // px
  QUESTION_CONTROL_1_Y_SEGMENT_2: 151, // px
  QUESTION_CONTROL_2_X_SEGMENT_2: 160, // px
  QUESTION_CONTROL_2_Y_SEGMENT_2: 146, // px
  QUESTION_END_X_SEGMENT_2: 160, // px
  QUESTION_END_Y_SEGMENT_2: 174, // px

  /** Chart left (px). */
  CHART_LEFT: 55,
  /** Chart top (px). */
  CHART_TOP: 195,
  /** Curve step (px). */
  CURVE_STEP: 2,
  /** Axes line width (px). */
  AXES_LINE_WIDTH: 4,
  /** Spectrum line width (px). */
  SPECTRUM_LINE_WIDTH: 5,
  /** Bond start x (px). */
  BOND_START_X: 215,
  /** Bond start y (px). */
  BOND_START_Y: 105,
  /** Bond end x (px). */
  BOND_END_X: 333,
  /** Bond end y (px). */
  BOND_END_Y: 105,
  /** Bond line width (px). */
  BOND_LINE_WIDTH: 16,
  /** Atoms radius (px). */
  ATOMS_RADIUS: 31,
  /** Atoms center y (px). */
  ATOMS_CENTER_Y: 105,
  /** Atoms line width (px). */
  ATOMS_LINE_WIDTH: 3,
  /** Arrows start y (px). */
  ARROWS_START_Y: 105,
  /** Arrows end y (px). */
  ARROWS_END_Y: 105,
  /** Arrows tail width (px). */
  ARROWS_TAIL_WIDTH: 7,
  /** Arrows head width (px). */
  ARROWS_HEAD_WIDTH: 23,
  /** Arrows head height (px). */
  ARROWS_HEAD_HEIGHT: 20,
  /** Tube x (px). */
  TUBE_X: 250,
  /** Tube y (px). */
  TUBE_Y: 40,
  /** Tube width (px). */
  TUBE_WIDTH: 48,
  /** Tube height (px). */
  TUBE_HEIGHT: 125,
  /** Tube corner x (px). */
  TUBE_CORNER_X: 18,
  /** Tube corner y (px). */
  TUBE_CORNER_Y: 18,
  /** Tube line width (px). */
  TUBE_LINE_WIDTH: 5,
  /** Sample x (px). */
  SAMPLE_X: 257,
  /** Sample y (px). */
  SAMPLE_Y: 95,
  /** Sample width (px). */
  SAMPLE_WIDTH: 34,
  /** Sample height (px). */
  SAMPLE_HEIGHT: 62,
  /** Sample corner x (px). */
  SAMPLE_CORNER_X: 12,
  /** Sample corner y (px). */
  SAMPLE_CORNER_Y: 12,
  /** Field start y (px). */
  FIELD_START_Y: 157,
  /** Field end y (px). */
  FIELD_END_Y: 49,
  /** Field tail width (px). */
  FIELD_TAIL_WIDTH: 6,
  /** Field head width (px). */
  FIELD_HEAD_WIDTH: 22,
  /** Field head height (px). */
  FIELD_HEAD_HEIGHT: 20,
  /** Cuvette x (px). */
  CUVETTE_X: 245,
  /** Cuvette y (px). */
  CUVETTE_Y: 44,
  /** Cuvette width (px). */
  CUVETTE_WIDTH: 70,
  /** Cuvette height (px). */
  CUVETTE_HEIGHT: 120,
  /** Cuvette line width (px). */
  CUVETTE_LINE_WIDTH: 5,
  /** Solution x (px). */
  SOLUTION_X: 252,
  /** Solution y (px). */
  SOLUTION_Y: 73,
  /** Solution width (px). */
  SOLUTION_WIDTH: 56,
  /** Solution height (px). */
  SOLUTION_HEIGHT: 84,
  /** Solution opacity (dimensionless). */
  SOLUTION_OPACITY: 0.65,
  /** Incident start x (px). */
  INCIDENT_START_X: 90,
  /** Incident start y (px). */
  INCIDENT_START_Y: 108,
  /** Incident end x (px). */
  INCIDENT_END_X: 231,
  /** Incident end y (px). */
  INCIDENT_END_Y: 108,
  /** Incident tail width (px). */
  INCIDENT_TAIL_WIDTH: 18,
  /** Incident head width (px). */
  INCIDENT_HEAD_WIDTH: 38,
  /** Incident head height (px). */
  INCIDENT_HEAD_HEIGHT: 26,
  /** Transmitted start x (px). */
  TRANSMITTED_START_X: 329,
  /** Transmitted start y (px). */
  TRANSMITTED_START_Y: 108,
  /** Transmitted end x (px). */
  TRANSMITTED_END_X: 458,
  /** Transmitted end y (px). */
  TRANSMITTED_END_Y: 108,
  /** Transmitted tail width (px). */
  TRANSMITTED_TAIL_WIDTH: 7,
  /** Transmitted head width (px). */
  TRANSMITTED_HEAD_WIDTH: 22,
  /** Transmitted head height (px). */
  TRANSMITTED_HEAD_HEIGHT: 22,
  /** Evidence x (px). */
  EVIDENCE_X: 310,
  /** Evidence y (px). */
  EVIDENCE_Y: 57,
  /** Evidence width (px). */
  EVIDENCE_WIDTH: 177,
  /** Evidence height (px). */
  EVIDENCE_HEIGHT: 256,
  /** Evidence corner x (px). */
  EVIDENCE_CORNER_X: 10,
  /** Evidence corner y (px). */
  EVIDENCE_CORNER_Y: 10,
  /** Evidence line width (px). */
  EVIDENCE_LINE_WIDTH: 5,
  /** Clues x (px). */
  CLUES_X: 333,
  /** Clues y (px). */
  CLUES_Y: 137,
  /** Clues line width (px). */
  CLUES_LINE_WIDTH: 5,
  /** Handle start x (px). */
  HANDLE_START_X: 218,
  /** Handle start y (px). */
  HANDLE_START_Y: 222,
  /** Handle end x (px). */
  HANDLE_END_X: 278,
  /** Handle end y (px). */
  HANDLE_END_Y: 300,
  /** Handle line width (px). */
  HANDLE_LINE_WIDTH: 22,
  /** Lens radius (px). */
  LENS_RADIUS: 88,
  /** Lens center x (px). */
  LENS_CENTER_X: 160,
  /** Lens center y (px). */
  LENS_CENTER_Y: 154,
  /** Lens line width (px). */
  LENS_LINE_WIDTH: 9,
  /** Question x (px). */
  QUESTION_X: 132,
  /** Question y (px). */
  QUESTION_Y: 128,
  /** Question control 1 x (px). */
  QUESTION_CONTROL_1_X: 132,
  /** Question control 1 y (px). */
  QUESTION_CONTROL_1_Y: 88,
  /** Question control 2 x (px). */
  QUESTION_CONTROL_2_X: 197,
  /** Question control 2 y (px). */
  QUESTION_CONTROL_2_Y: 88,
  /** Question end x (px). */
  QUESTION_END_X: 197,
  /** Question end y (px). */
  QUESTION_END_Y: 125,
  /** Question line width (px). */
  QUESTION_LINE_WIDTH: 11,
  /** Dot radius (px). */
  DOT_RADIUS: 7,
  /** Dot center x (px). */
  DOT_CENTER_X: 160,
  /** Dot center y (px). */
  DOT_CENTER_Y: 199,
} as const;

/** Settings for common/model/MoleculeGraph.ts. */
export const MOLECULE_GRAPH_SETTINGS = {
  /** Aromatic order (dimensionless). */
  AROMATIC_ORDER: 1.5,
} as const;

/** Settings for common/model/MoleculeViewModel.ts. */
export const MOLECULE_VIEW_MODEL_SETTINGS = {
  /** Vibration animation frequency on screen, Hz (real modes are ~10¹³ Hz). */
  VIBRATION_DISPLAY_FREQUENCY: 1.2,
  /** Peak displacement of the fastest-moving atom when a mode animates, Å. */
  VIBRATION_AMPLITUDE: 0.25,
  /** Min zoom (dimensionless). */
  MIN_ZOOM: 0.3,
  /** Max zoom (dimensionless). */
  MAX_ZOOM: 6,
} as const;

/** Settings for common/model/SpectrumCurve.ts. */
export const SPECTRUM_CURVE_SETTINGS = {
  /** Beyond this many half-widths a Lorentzian's contribution (< 1/2500) is skipped. */
  CUTOFF_HALF_WIDTHS: 50,
} as const;

/** Settings for common/model/infrared/InfraredSpectrum.ts. */
export const INFRARED_SPECTRUM_SETTINGS = {
  /** Ir range min (cm⁻¹). */
  IR_RANGE_MIN: 400,
  /** Ir range max (cm⁻¹). */
  IR_RANGE_MAX: 4000,
  /** Curve samples (count). */
  CURVE_SAMPLES: 1200,
  /** Peak absorbance (dimensionless). */
  PEAK_ABSORBANCE: 1.3,
} as const;

/** Settings for common/model/math/symmetricEigen.ts. */
export const SYMMETRIC_EIGEN_SETTINGS = {
  /** Max sweeps (count). */
  MAX_SWEEPS: 400,
} as const;

/** Settings for common/model/nmr/CarbonSpectrum.ts. */
export const CARBON_SPECTRUM_SETTINGS = {
  /** Proton to carbon frequency (dimensionless). */
  PROTON_TO_CARBON_FREQUENCY: 3.9767,
  /** Height of a carbon line without attached hydrogens relative to one with them (little NOE, long T₁). */
  QUATERNARY_HEIGHT: 0.35,
  /** Methane (ppm). */
  METHANE: -2.3,
  /** A carbon on the far side of an ether O or an amine N (CH₃–O–CH₃, (CH₃)₂NH). */
  ACROSS_OXYGEN: 4,
  /** Across nitrogen (ppm). */
  ACROSS_NITROGEN: 10,
  /** Saturated six-ring carbons (cyclohexane 27.0 ppm, not the 32 the open-chain sums give). */
  SIX_RING: -5,
  /** Benzene (ppm). */
  BENZENE: 128.5,
  /** Ring-fusion carbons of naphthalene-like systems, and the CH next to them. */
  FUSION_CARBON: 133,
  /** Next to fusion (ppm). */
  NEXT_TO_FUSION: 128,
  /** Away from fusion (ppm). */
  AWAY_FROM_FUSION: 126,
  /** Ethene (ppm). */
  ETHENE: 123.3,
  /** Carbon dioxide (ppm). */
  CARBON_DIOXIDE: 124.9,
  /** Nitrile carbon (ppm). */
  NITRILE_CARBON: 116.9,
  /** Fallbacks for anything the rules do not cover. */
  GENERIC_SP2: 130,
  /** Generic sp (ppm). */
  GENERIC_SP: 80,
  /** Iminium carbon (ppm). */
  IMINIUM_CARBON: 160,
} as const;

/** Settings for common/model/nmr/ChemicalShiftRules.ts. */
export const CHEMICAL_SHIFT_RULES_SETTINGS = {
  /** Methane, and base values for CH₃ / CH₂ / CH in an alkane, ppm. */
  METHANE: 0.23,
  /** Base methyl (ppm). */
  BASE_METHYL: 0.86,
  /** Base methylene (ppm). */
  BASE_METHYLENE: 1.25,
  /** Base methine (ppm). */
  BASE_METHINE: 1.5,
  /** With two or more α groups the increments are not fully additive; their sum is scaled by this. */
  MULTIPLE_ALPHA_FACTOR: 0.85,
  /** β increment for each electron-withdrawing group one carbon further away, ppm. */
  BETA: 0.3,
  /** β-chlorine pulls harder than the generic β group. */
  BETA_CHLORINE: 0.55,
  /** Benzene (ppm). */
  BENZENE: 7.27,
} as const;

/** Settings for common/model/nmr/NMRSpectrum.ts. */
export const NMR_SPECTRUM_SETTINGS = {
  /** Shift range min (ppm). */
  SHIFT_RANGE_MIN: -0.5,
  /** Shift range max (ppm). */
  SHIFT_RANGE_MAX: 12.5,
  /** Carbon shift range min (ppm). */
  CARBON_SHIFT_RANGE_MIN: -5,
  /** Carbon shift range max (ppm). */
  CARBON_SHIFT_RANGE_MAX: 225,
  /** Window of the multiplet zoom, ppm either side of the signal centre. */
  ZOOM_HALF_WIDTH: 0.3,
  /** Minimum ¹³C zoom; expanded when a selected multiplet extends beyond it. */
  CARBON_ZOOM_HALF_WIDTH: 6,
  /** Field range min (MHz). */
  FIELD_RANGE_MIN: 60,
  /** Field range max (MHz). */
  FIELD_RANGE_MAX: 600,
  /** Natural line half-width (HWHM) of a sharp signal, and of a broad exchanging O–H/N–H, Hz. */
  LINE_HALF_WIDTH_HZ: 0.8,
  /** Broad half width hz (Hz). */
  BROAD_HALF_WIDTH_HZ: 12,
  /** Carbon half width hz (Hz). */
  CARBON_HALF_WIDTH_HZ: 1.5,
  /** Spectrum samples (count). */
  SPECTRUM_SAMPLES: 6500,
  /** Zoom samples (count). */
  ZOOM_SAMPLES: 1500,
  /** Integral height (dimensionless). */
  INTEGRAL_HEIGHT: 0.9,
} as const;

/** Settings for common/model/nmr/ProtonSpectrum.ts. */
export const PROTON_SPECTRUM_SETTINGS = {
  /** Downfield offset of the =CH₂ proton trans to the vinyl CH (it is cis to the substituent), ppm. */
  TRANS_VINYL_OFFSET: 0.08,
  /** Couplings closer than this (Hz) are treated as equal, so the n + 1 rule merges them. */
  SAME_J: 0.6,
} as const;

/** Settings for common/model/nmr/SpinSystem.ts. */
export const SPIN_SYSTEM_SETTINGS = {
  /** Max exact spins (count). */
  MAX_EXACT_SPINS: 9,
  /** Lines weaker than this (in protons) are dropped. */
  MIN_WEIGHT: 1e-4,
  /** * Lines of one signal closer than this (Hz) are merged: the many (near-)degenerate transitions of methyl groups, split by hundredths of a hertz, far below the 0.8 Hz natural line width. */
  MERGE_HZ: 0.1,
} as const;

/** Settings for common/model/vibrations/ModeCharacter.ts. */
export const MODE_CHARACTER_SETTINGS = {
  /** Stretch force constant per unit bond order, mdyn/Å. */
  STRETCH_CONSTANT: 5,
  /** Bend force constant, mdyn·Å/rad². */
  BEND_CONSTANT: 0.7,
} as const;

/** Settings for common/model/vibrations/NormalModeAnalysis.ts. */
export const NORMAL_MODE_ANALYSIS_SETTINGS = {
  /** Electron masses per unified atomic mass unit. */
  AMU_IN_ELECTRON_MASSES: 1822.888486,
  /** cm⁻¹ per hartree. */
  HARTREE_TO_WAVENUMBER: 219474.6313705,
  /** Å per bohr. */
  BOHR: 0.529177210903,
  /** km/mol per (e / √u)² — the IR intensity prefactor (NA π / 3c²) in these units. */
  INTENSITY_KM_PER_MOL: 974.8801118,
  /** * A translation/rotation vector that Gram–Schmidt shrinks below this fraction of the longest candidate is dependent — the rotation about the axis of a linear molecule. */
  EXTERNAL_TOLERANCE: 1e-3,
} as const;

/** Settings for common/view/ControlFactory.ts. */
export const CONTROL_FACTORY_SETTINGS = {
  ITEMS_MAX_WIDTH_OFFSET: 40, // px
  RADIO_GROUP_SPACING: 4, // px

  /** Control font size (px). */
  CONTROL_FONT_SIZE: 13,
  /** Combo box x margin (px). */
  COMBO_BOX_X_MARGIN: 8,
  /** Combo box y margin (px). */
  COMBO_BOX_Y_MARGIN: 3,
  /** Combo box corner radius (px). */
  COMBO_BOX_CORNER_RADIUS: 4,
  /** Labeled spacing (px). */
  LABELED_SPACING: 3,
  /** Push button x margin (px). */
  PUSH_BUTTON_X_MARGIN: 8,
  /** Push button y margin (px). */
  PUSH_BUTTON_Y_MARGIN: 4,
  /** Radio group radius (px). */
  RADIO_GROUP_RADIUS: 6,
} as const;

/** Settings for common/view/MoleculeChooserNode.ts. */
export const MOLECULE_CHOOSER_NODE_SETTINGS = {
  ITEM_1_SPACING: 10, // px
  ITEM_2_SPACING: 10, // px

  /** Label width (px). */
  LABEL_WIDTH: 80,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 6,
} as const;

/** Settings for common/view/MoleculeRenderer.ts. */
export const MOLECULE_RENDERER_SETTINGS = {
  PAINT_CYLINDER_LINE_WIDTH_FACTOR: 0.7, // dimensionless

  /** Camera distance in units of the bounding radius (Jmol's default `cameraDepth` is 3). */
  CAMERA_DEPTH: 3,
  /** Sprite resolution for shaded spheres, px. */
  SPRITE_SIZE: 128,
  /** Minimum pick radius, px. */
  MIN_PICK_RADIUS: 6,
  /** Ball radius as a fraction of the van der Waals radius (Jmol's ball-and-stick is 20 %). */
  BALL_FRACTION: 0.25,
  /** Stick radius, Å. */
  STICK_RADIUS: 0.11,
  /** Orbital lobe radius for |c| = 1, Å, and the lobe centre's offset along the π normal per Å of radius. */
  LOBE_RADIUS: 1.6,
  /** Lobe offset (px). */
  LOBE_OFFSET: 0.9,
  /** Lobe alpha (dimensionless). */
  LOBE_ALPHA: 0.62,
  /** Line width line width (px). */
  LINE_WIDTH_LINE_WIDTH: 3,
} as const;

/** Settings for common/view/MoleculeThumbnailNode.ts. */
export const MOLECULE_THUMBNAIL_NODE_SETTINGS = {
  /** Font font size (px). */
  FONT_FONT_SIZE: 11,
} as const;

/** Settings for common/view/MoleculeViewerNode.ts. */
export const MOLECULE_VIEWER_NODE_SETTINGS = {
  LOAD_ERROR_MAX_WIDTH_OFFSET: 24, // px

  /** Degrees of rotation per pixel of drag. */
  DEGREES_PER_PIXEL: 0.5,
  /** Degrees per arrow-key press. */
  KEY_ROTATION: 10,
  /** Pixels of movement below which a press-release counts as a click. */
  CLICK_SLOP: 4,
  /** Zoom factor per wheel notch / key press. */
  ZOOM_STEP: 1.15,
  /** Label font size (px). */
  LABEL_FONT_SIZE: 13,
  /** Tooltip font size (px). */
  TOOLTIP_FONT_SIZE: 12,
  /** Tooltip background corner radius (px). */
  TOOLTIP_BACKGROUND_CORNER_RADIUS: 4,
  /** Tooltip background opacity (dimensionless). */
  TOOLTIP_BACKGROUND_OPACITY: 0.92,
  /** Load error font size (px). */
  LOAD_ERROR_FONT_SIZE: 16,
} as const;

/** Settings for common/view/SpectrumChartNode.ts. */
export const SPECTRUM_CHART_NODE_SETTINGS = {
  LAYOUT_REGIONS_MAX_WIDTH_OFFSET: 24, // px
  LAYOUT_REGIONS_MAX_WIDTH: 40, // px
  CURSOR_LINE_DASH_DASH: 5, // px
  CONSTRUCTOR_CURSOR_LINE_DASH_DASH: 3, // px
  LAYOUT_AXIS_LABELS_TOP_OFFSET: 4, // px
  LAYOUT_AXIS_LABELS_RIGHT_OFFSET: 6, // px

  /** Tick font size (px). */
  TICK_FONT_SIZE: 11,
  /** Axis label font size (px). */
  AXIS_LABEL_FONT_SIZE: 12,
  /** Region font size (px). */
  REGION_FONT_SIZE: 10,
  /** Click tolerance, px. */
  PICK_TOLERANCE: 8,
  /** Top top (px). */
  TOP_TOP: 3,
  /** Plot line width (px). */
  PLOT_LINE_WIDTH: 1.6,
  /** Secondary plot line width (px). */
  SECONDARY_PLOT_LINE_WIDTH: 1.4,
  /** Sticks opacity (dimensionless). */
  STICKS_OPACITY: 0.8,
  /** Cursor line width (px). */
  CURSOR_LINE_WIDTH: 2,
} as const;

/** Settings for infrared/model/InfraredModel.ts. */
export const INFRARED_MODEL_SETTINGS = {
  /** Half width range min (cm⁻¹). */
  HALF_WIDTH_RANGE_MIN: 2,
  /** Half width range max (cm⁻¹). */
  HALF_WIDTH_RANGE_MAX: 40,
  /** Default half width (cm⁻¹). */
  DEFAULT_HALF_WIDTH: 10,
  /** Modes weaker than this fraction of the strongest are not offered to the peak cursor. */
  VISIBLE_FRACTION: 0.01,
} as const;

/** Settings for infrared/model/RotationalFineStructure.ts. */
export const ROTATIONAL_FINE_STRUCTURE_SETTINGS = {
  /** h / (8π²c), in cm⁻¹ · u · Å². */
  ROTATIONAL_CONSTANT_FACTOR: 16.857629,
  /** Second radiation constant hc/k, cm · K. */
  HC_OVER_K: 1.438777,
  /** Atomic mass unit, kg; speed of light, cm/s. */
  ATOMIC_MASS_UNIT: 1.66053907e-27,
  /** Speed of light (cm/s). */
  SPEED_OF_LIGHT: 2.99792458e10,
  /** Temperature range min (K). */
  TEMPERATURE_RANGE_MIN: 50,
  /** Temperature range max (K). */
  TEMPERATURE_RANGE_MAX: 1000,
  /** Default temperature (K). */
  DEFAULT_TEMPERATURE: 298,
  /** Instrument line half-width (HWHM) of a high-resolution FTIR, cm⁻¹. */
  FINE_HALF_WIDTH: 0.3,
  /** The band window spans this far either side of the main isotopologue's origin, cm⁻¹. */
  BAND_HALF_WIDTH: 450,
  /** Line zoom half width (cm⁻¹). */
  LINE_ZOOM_HALF_WIDTH: 6,
  /** Band samples (count). */
  BAND_SAMPLES: 6000,
  /** Zoom samples (count). */
  ZOOM_SAMPLES: 600,
  /** Lines weaker than this fraction of the strongest are left out. */
  MIN_RELATIVE_INTENSITY: 1e-4,
  /** Max j (count). */
  MAX_J: 60,
} as const;

/** Settings for infrared/view/InfraredScreenView.ts. */
export const INFRARED_SCREEN_VIEW_SETTINGS = {
  VIEWER_TOP_OFFSET: 12, // px
  CONTROLS_TOP_OFFSET: 10, // px
  STICKS_PROPERTY_HEIGHT_FACTOR: 0.95, // dimensionless
  FINE_STICKS_PROPERTY_HEIGHT_FACTOR: 0.95, // dimensionless
  AXIS_SPACING: 0.25, // px
  FINE_Y_AXIS_AXIS_SPACING: 50, // px
  CONSTRUCTOR_AXIS_SPACING: 20, // px
  LINE_ZOOM_MAX_WIDTH_OFFSET: 40, // px
  INFO_PANEL_MIN_WIDTH_OFFSET: 24, // px
  INFO_PANEL_TOP_OFFSET: 62, // px

  ISOTOPES_LABEL_MAX_WIDTH: 80, // px
  CONTROLS_ITEM_4_SPACING: 16, // px
  SHOW_STICKS_CHECKBOX_MAX_WIDTH: 150, // px
  SHOW_REGIONS_CHECKBOX_MAX_WIDTH: 150, // px
  INFO_CONTENT_ITEM_1_SPACING: 5, // px

  /** Viewer size (px). */
  VIEWER_SIZE: 380,
  /** Viewer height (px). */
  VIEWER_HEIGHT: 330,
  /** Chart width (px). */
  CHART_WIDTH: 520,
  /** Chart height (px). */
  CHART_HEIGHT: 270,
  /** Control width (px). */
  CONTROL_WIDTH: 356,
  /** Info width (px). */
  INFO_WIDTH: 560,
  /** Top of the absorbance axis, a little above the strongest band. */
  ABSORBANCE_AXIS_MAX: 1.5,
  /** Title font size (px). */
  TITLE_FONT_SIZE: 16,
  /** Info font size (px). */
  INFO_FONT_SIZE: 14,
  /** Below this a mode is reported as IR-inactive (km/mol). */
  INACTIVE_INTENSITY: 0.5,
  /** Line zoom width (px). */
  LINE_ZOOM_WIDTH: 190,
  /** Line zoom height (px). */
  LINE_ZOOM_HEIGHT: 80,
  /** Temperature step (px). */
  TEMPERATURE_STEP: 10,
  /** Viewer frame corner radius (px). */
  VIEWER_FRAME_CORNER_RADIUS: 6,
  /** Width slider keyboard step (control/model units). */
  WIDTH_SLIDER_KEYBOARD_STEP: 2,
  /** Controls spacing (px). */
  CONTROLS_SPACING: 8,
  /** Create chart range max (control/model units). */
  CREATE_CHART_RANGE_MAX: 100,
  /** Line zoom spacing (px). */
  LINE_ZOOM_SPACING: 2,
  /** Line zoom font size (px). */
  LINE_ZOOM_FONT_SIZE: 12,
  /** Info content spacing (px). */
  INFO_CONTENT_SPACING: 20,
  /** Info panel min height (px). */
  INFO_PANEL_MIN_HEIGHT: 120,
} as const;

/** Settings for nmr/model/NMRModel.ts. */
export const NMR_MODEL_SETTINGS = {
  /** Default field (MHz). */
  DEFAULT_FIELD: 300,
} as const;

/** Settings for nmr/view/NMRScreenView.ts. */
export const NMR_SCREEN_VIEW_SETTINGS = {
  VIEWER_TOP_OFFSET: 12, // px
  CONTROLS_TOP_OFFSET: 10, // px
  ZOOM_TITLE_MAX_WIDTH_OFFSET: 40, // px
  TABLE_PANEL_MIN_WIDTH_OFFSET: 24, // px
  LOWER_ROW_TOP_OFFSET: 14, // px

  NUCLEUS_RADIO_GROUP_MAX_WIDTH: 80, // px
  PROTON_OPTIONS_ITEM_1_SPACING: 14, // px
  D2O_SHAKE_CHECKBOX_MAX_WIDTH: 110, // px
  SHOW_TMS_CHECKBOX_MAX_WIDTH: 110, // px
  SHOW_INTEGRAL_CHECKBOX_MAX_WIDTH: 90, // px
  CARBON_SPECTRUM_TYPE_COMBO_BOX_MAX_WIDTH: 180, // px
  CARBON_OPTIONS_ITEM_1_SPACING: 8, // px
  SPECTRUM_TYPE_LABEL_MAX_WIDTH: 90, // px
  CARBON_OPTIONS_ITEM_2_SPACING: 14, // px
  CONTROLS_ITEM_2_SPACING: 10, // px
  NUCLEUS_LABEL_MAX_WIDTH: 80, // px

  /** Viewer size (px). */
  VIEWER_SIZE: 380,
  /** Viewer height (px). */
  VIEWER_HEIGHT: 330,
  /** Chart width (px). */
  CHART_WIDTH: 520,
  /** Chart height (px). */
  CHART_HEIGHT: 200,
  /** Zoom width (px). */
  ZOOM_WIDTH: 230,
  /** Zoom height (px). */
  ZOOM_HEIGHT: 150,
  /** Table width (px). */
  TABLE_WIDTH: 230,
  /** Control width (px). */
  CONTROL_WIDTH: 356,
  /** Field step (px). */
  FIELD_STEP: 20,
  /** Zoom title font size (px). */
  ZOOM_TITLE_FONT_SIZE: 13,
  /** Positive range max (control/model units). */
  POSITIVE_RANGE_MAX: 1.08,
  /** Signed range min (control/model units). */
  SIGNED_RANGE_MIN: -1.08,
  /** Signed range max (control/model units). */
  SIGNED_RANGE_MAX: 1.08,
  /** Viewer corner radius (px). */
  VIEWER_CORNER_RADIUS: 6,
  /** Field control max width (px). */
  FIELD_CONTROL_MAX_WIDTH: 140,
  /** Proton options spacing (px). */
  PROTON_OPTIONS_SPACING: 6,
  /** Carbon options spacing (px). */
  CARBON_OPTIONS_SPACING: 6,
  /** Controls spacing (px). */
  CONTROLS_SPACING: 8,
  /** Chart range max (control/model units). */
  CHART_RANGE_MAX: 1.08,
  /** Zoom chart range max (control/model units). */
  ZOOM_CHART_RANGE_MAX: 1.08,
  /** Zoom group spacing (px). */
  ZOOM_GROUP_SPACING: 6,
  /** Table panel min height (px). */
  TABLE_PANEL_MIN_HEIGHT: 200,
  /** Lower row spacing (px). */
  LOWER_ROW_SPACING: 22,
} as const;

/** Settings for nmr/view/SignalTableNode.ts. */
export const SIGNAL_TABLE_NODE_SETTINGS = {
  DETAIL_MAX_WIDTH_OFFSET: 16, // px

  /** Row font size (px). */
  ROW_FONT_SIZE: 13,
  /** Detail font size (px). */
  DETAIL_FONT_SIZE: 12,
  /** Heading font size (px). */
  HEADING_FONT_SIZE: 14,
  /** Max rows (px). */
  MAX_ROWS: 8,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 4,
} as const;

/** Settings for preferences/SpectroscopyLabPreferencesNode.ts. */
export const SPECTROSCOPY_LAB_PREFERENCES_NODE_SETTINGS = {
  /** Header font size (px). */
  HEADER_FONT_SIZE: 18,
  /** Absorbance checkbox font size (px). */
  ABSORBANCE_CHECKBOX_FONT_SIZE: 14,
  /** Absorbance checkbox spacing (px). */
  ABSORBANCE_CHECKBOX_SPACING: 8,
  /** Constructor spacing (px). */
  CONSTRUCTOR_SPACING: 12,
} as const;

/** Settings for unknowns/model/UnknownsModel.ts. */
export const UNKNOWNS_MODEL_SETTINGS = {
  /** Ir half width (cm⁻¹). */
  IR_HALF_WIDTH: 10,
  /** Nmr field (MHz). */
  NMR_FIELD: 300,
} as const;

/** Settings for unknowns/view/UnknownsScreenView.ts. */
export const UNKNOWNS_SCREEN_VIEW_SETTINGS = {
  FEEDBACK_MAX_WIDTH_OFFSET: 20, // px
  CANDIDATES_GROUP_TOP_OFFSET: 12, // px
  TITLE_MAX_WIDTH_OFFSET: 120, // px
  SPECTRA_TOP_OFFSET: 8, // px

  LEVEL_RADIO_GROUP_MAX_WIDTH: 30, // px
  INFO_PANEL_ITEM_1_SPACING: 6, // px
  INFO_PANEL_ITEM_2_SPACING: 10, // px
  INFO_PANEL_ITEM_1_SPACING_VARIANT_2: 8, // px
  LEVEL_LABEL_MAX_WIDTH: 60, // px
  NUCLEUS_RADIO_GROUP_MAX_WIDTH: 40, // px
  SPECTRA_ITEM_4_SPACING: 24, // px

  /** Thumb width (px). */
  THUMB_WIDTH: 184,
  /** Thumb height (px). */
  THUMB_HEIGHT: 112,
  /** Chart width (px). */
  CHART_WIDTH: 500,
  /** Chart height (px). */
  CHART_HEIGHT: 175,
  /** Bar max height (px). */
  BAR_MAX_HEIGHT: 46,
  /** Bar width (px). */
  BAR_WIDTH: 16,
  /** Title font size (px). */
  TITLE_FONT_SIZE: 15,
  /** Info font size (px). */
  INFO_FONT_SIZE: 13,
  /** Name font size (px). */
  NAME_FONT_SIZE: 13,
  /** Mark font size (px). */
  MARK_FONT_SIZE: 64,
  /** Grid spacing (px). */
  GRID_SPACING: 10,
  /** Candidates group spacing (px). */
  CANDIDATES_GROUP_SPACING: 8,
  /** Frame x (px). */
  FRAME_X: -3,
  /** Frame y (px). */
  FRAME_Y: -3,
  /** Frame line width (px). */
  FRAME_LINE_WIDTH: 4,
  /** Frame corner radius (px). */
  FRAME_CORNER_RADIUS: 6,
  /** Plate corner radius (px). */
  PLATE_CORNER_RADIUS: 4,
  /** Content spacing (px). */
  CONTENT_SPACING: 4,
  /** Button x margin (px). */
  BUTTON_X_MARGIN: 6,
  /** Button y margin (px). */
  BUTTON_Y_MARGIN: 6,
  /** Rebuild candidates spacing (px). */
  REBUILD_CANDIDATES_SPACING: 10,
  /** Formula line max width (px). */
  FORMULA_LINE_MAX_WIDTH: 200,
  /** Unsaturation line max width (px). */
  UNSATURATION_LINE_MAX_WIDTH: 200,
  /** Ion group spacing (px). */
  ION_GROUP_SPACING: 4,
  /** Ion group max width (px). */
  ION_GROUP_MAX_WIDTH: 180,
  /** Score text max width (px). */
  SCORE_TEXT_MAX_WIDTH: 160,
  /** Info panel spacing (px). */
  INFO_PANEL_SPACING: 26,
  /** Info multilink font size (px). */
  INFO_MULTILINK_FONT_SIZE: 10,
  /** Ir chart range max (control/model units). */
  IR_CHART_RANGE_MAX: 100,
  /** Nmr chart range max (control/model units). */
  NMR_CHART_RANGE_MAX: 1.08,
  /** Carbon chart range max (control/model units). */
  CARBON_CHART_RANGE_MAX: 1.08,
  /** Spectra spacing (px). */
  SPECTRA_SPACING: 6,
  /** Spectra max y (px). */
  SPECTRA_MAX_Y: 4,
} as const;

/** Settings for uv-vis/model/PerceivedColor.ts. */
export const PERCEIVED_COLOR_SETTINGS = {
  /** Step nm (nm). */
  STEP_NM: 2,
  /** Visible min (nm). */
  VISIBLE_MIN: 380,
  /** Visible max (nm). */
  VISIBLE_MAX: 780,
} as const;

/** Settings for uv-vis/model/PiSystem.ts. */
export const PI_SYSTEM_SETTINGS = {
  /** Free-electron bond length, m (Kuhn). */
  BOX_BOND_LENGTH: 1.39e-10,
  /** Electron mass (kg). */
  ELECTRON_MASS: 9.1093837e-31,
  /** Planck (J·s). */
  PLANCK: 6.62607015e-34,
  /** Light speed (m/s). */
  LIGHT_SPEED: 2.99792458e8,
  /** Electron volt (J/eV). */
  ELECTRON_VOLT: 1.602176634e-19,
  /** Hückel heteroatom parameters (Streitwieser): h on the diagonal, k for its bonds to carbon. */
  NITROGEN_H: 1.0,
  /** Nitrogen k (dimensionless). */
  NITROGEN_K: 1.0,
} as const;

/** Settings for uv-vis/model/UVVisModel.ts. */
export const UV_VIS_MODEL_SETTINGS = {
  /** Max concentration absorbance (dimensionless). */
  MAX_CONCENTRATION_ABSORBANCE: 4,
  /** Default concentration fraction (dimensionless). */
  DEFAULT_CONCENTRATION_FRACTION: 0.1,
  /** Path length range min (cm). */
  PATH_LENGTH_RANGE_MIN: 0.1,
  /** Path length range max (cm). */
  PATH_LENGTH_RANGE_MAX: 5,
  /** Fraction of stray light reaching the detector; it caps measured absorbance near −log₁₀(s) = 3. */
  STRAY_LIGHT: 0.001,
  /** Calibration samples (count). */
  CALIBRATION_SAMPLES: 201,
  /** Wavelength range min (nm). */
  WAVELENGTH_RANGE_MIN: 150,
  /** Wavelength range max (nm). */
  WAVELENGTH_RANGE_MAX: 800,
  /** Spectrum samples (count). */
  SPECTRUM_SAMPLES: 651,
  /** Gaussian band width in wavenumber, cm⁻¹ (a typical π→π* band envelope, FWHM ≈ 4700 cm⁻¹). */
  BAND_SIGMA: 2000,
} as const;

/** Settings for uv-vis/view/EnergyLevelDiagramNode.ts. */
export const ENERGY_LEVEL_DIAGRAM_NODE_SETTINGS = {
  DRAW_LEVEL_LINE_WIDTH: 3, // px
  DRAW_LEVEL_LEFT_OFFSET: 4, // px
  DRAW_LEVEL_MAX_WIDTH: 10, // px

  /** Level width (px). */
  LEVEL_WIDTH: 64,
  /** Label font size (px). */
  LABEL_FONT_SIZE: 11,
  /** Electron font size (px). */
  ELECTRON_FONT_SIZE: 11,
  /** Levels closer than this (px) are degenerate pairs drawn side by side. */
  DEGENERATE_PX: 2,
  /** Hit height (px). */
  HIT_HEIGHT: 10,
  /** Frame corner radius (px). */
  FRAME_CORNER_RADIUS: 4,
  /** Right right (px). */
  RIGHT_RIGHT: -4,
  /** Axis start x (px). */
  AXIS_START_X: 10,
  /** Axis end x (px). */
  AXIS_END_X: 10,
  /** Axis end y (px). */
  AXIS_END_Y: 8,
  /** Axis head height (px). */
  AXIS_HEAD_HEIGHT: 6,
  /** Axis head width (px). */
  AXIS_HEAD_WIDTH: 6,
  /** Update head height (px). */
  UPDATE_HEAD_HEIGHT: 7,
  /** Update head width (px). */
  UPDATE_HEAD_WIDTH: 7,
  /** Update tail width (px). */
  UPDATE_TAIL_WIDTH: 2,
} as const;

/** Settings for uv-vis/view/UVVisScreenView.ts. */
export const UV_VIS_SCREEN_VIEW_SETTINGS = {
  VIEWER_TOP_OFFSET: 12, // px
  CONTROLS_TOP_OFFSET: 10, // px
  LINE_MAX_WIDTH_OFFSET: 40, // px
  PREDICTED_TEXT_MAX_WIDTH_OFFSET: 40, // px
  MEASURED_TEXT_MAX_WIDTH_OFFSET: 40, // px
  SWATCH_COLUMN_MAX_WIDTH_OFFSET: 20, // px
  RESULTS_MAX_WIDTH_OFFSET: 30, // px
  RESULTS_MIN_WIDTH_OFFSET: 24, // px
  RESULTS_TOP_OFFSET: 16, // px
  CALIBRATION_PANEL_TOP_OFFSET: 10, // px

  ELECTRONIC_MODEL_RADIO_GROUP_MAX_WIDTH: 150, // px
  MODEL_LABEL_MAX_WIDTH: 80, // px
  RESULTS_ITEM_1_SPACING: 5, // px
  RESULTS_ITEM_2_SPACING: 4, // px
  RESULTS_ITEM_2_SPACING_VARIANT_2: 12, // px
  CALIBRATION_PANEL_ITEM_1_SPACING: 4, // px

  /** Viewer size (px). */
  VIEWER_SIZE: 380,
  /** Viewer height (px). */
  VIEWER_HEIGHT: 330,
  /** Control width (px). */
  CONTROL_WIDTH: 356,
  /** Diagram width (px). */
  DIAGRAM_WIDTH: 150,
  /** Diagram height (px). */
  DIAGRAM_HEIGHT: 280,
  /** Chart width (px). */
  CHART_WIDTH: 330,
  /** Chart height (px). */
  CHART_HEIGHT: 230,
  /** Strip height (px). */
  STRIP_HEIGHT: 8,
  /** Swatch size (px). */
  SWATCH_SIZE: 46,
  /** Info width (px). */
  INFO_WIDTH: 520,
  /** Title font size (px). */
  TITLE_FONT_SIZE: 15,
  /** Info font size (px). */
  INFO_FONT_SIZE: 13,
  /** Calibration width (px). */
  CALIBRATION_WIDTH: 170,
  /** Calibration height (px). */
  CALIBRATION_HEIGHT: 80,
  /** Calibration text width (px). */
  CALIBRATION_TEXT_WIDTH: 190,
  /** Unit range max (control/model units). */
  UNIT_RANGE_MAX: 1.1,
  /** Absolute range max (control/model units). */
  ABSOLUTE_RANGE_MAX: 3.2,
  /** Concentration steps (count). */
  CONCENTRATION_STEPS: 100,
  /** Path length step (px). */
  PATH_LENGTH_STEP: 0.1,
  /** Viewer corner radius (px). */
  VIEWER_CORNER_RADIUS: 6,
  /** Quantitative controls spacing (px). */
  QUANTITATIVE_CONTROLS_SPACING: 16,
  /** Controls spacing (px). */
  CONTROLS_SPACING: 10,
  /** Diagram group spacing (px). */
  DIAGRAM_GROUP_SPACING: 4,
  /** Chart group spacing (px). */
  CHART_GROUP_SPACING: 4,
  /** Upper spacing (px). */
  UPPER_SPACING: 70,
  /** Swatch corner radius (px). */
  SWATCH_CORNER_RADIUS: 6,
  /** Swatch column spacing (px). */
  SWATCH_COLUMN_SPACING: 3,
  /** Results spacing (px). */
  RESULTS_SPACING: 24,
  /** Stray text font size (px). */
  STRAY_TEXT_FONT_SIZE: 11,
  /** Calibration panel spacing (px). */
  CALIBRATION_PANEL_SPACING: 14,
} as const;

/** Settings for common/model/math/symmetricEigen.ts; units are documented per value. */
export const SYMMETRIC_EIGEN_NUMERICS = {
  /** Off-diagonal rotation threshold relative to the matrix scale (dimensionless). */
  RELATIVE_OFF_DIAGONAL_FLOOR: 1e-30,
} as const;

/** Settings for common/model/vibrations/ModeCharacter.ts; units are documented per value. */
export const MODE_CHARACTER_NUMERICS = {
  /** Step parameter along the displacement vector for mode-character finite differences (dimensionless). */
  FINITE_DIFFERENCE_STEP: 1e-4,
  /** Mass above which a hydrogen isotope is labelled heavy (u). */
  HEAVY_HYDROGEN_MASS: 1.5,
} as const;

/** Settings for infrared/model/RotationalFineStructure.ts; units are documented per value. */
export const ROTATIONAL_FINE_STRUCTURE_NUMERICS = {
  /** Tolerance when matching a mass to an isotope (u). */
  ISOTOPE_MASS_TOLERANCE: 1e-4,
} as const;

/** Settings for common/model/structure/Geometry.ts; units are documented per value. */
export const GEOMETRY_NUMERICS = {
  /** Minimum vector magnitude used for normalization (in input vector units). */
  MIN_VECTOR_LENGTH: 1e-12,
} as const;

SpectroscopyLabNamespace.register("SpectroscopyLabConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
});
