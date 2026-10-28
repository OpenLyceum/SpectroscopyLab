/**
 * SpectroscopyLabColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import SpectroscopyLabColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import SpectroscopyLabColors from "../../SpectroscopyLabColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: SpectroscopyLabColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the SpectroscopyLabColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import SpectroscopyLabNamespace from "./SpectroscopyLabNamespace.js";

const SpectroscopyLabColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Molecule viewer overlays ─────────────────────────────────────────────────
  // Atom colours are CPK data (model/AtomStyle.ts); these are the chrome drawn over them.

  /** Atom labels in the viewer (proton-environment letters). */
  viewerLabelColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "viewerLabel", {
    default: "#ffe082",
    projector: "#5d4037",
  }),

  /** Halo around the atoms behind the selected peak. */
  highlightColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "highlight", {
    default: "#ffd54f",
    projector: "#e65100",
  }),

  /** Dashed ring around the hovered / keyboard-cursor atom. */
  hoverColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "hover", {
    default: "#80deea",
    projector: "#00695c",
  }),

  /** Orbital lobes for positive and negative MO coefficients. */
  lobePositiveColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "lobePositive", {
    default: "#ef5350",
    projector: "#d32f2f",
  }),
  lobeNegativeColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "lobeNegative", {
    default: "#42a5f5",
    projector: "#1565c0",
  }),

  // ── Spectrum charts ──────────────────────────────────────────────────────────

  /** Plot area behind a spectrum. */
  chartBackgroundColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "chartBackground", {
    default: "#0f1626",
    projector: "#ffffff",
  }),

  /** Axis lines, tick marks and the chart frame. */
  chartAxisColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "chartAxis", {
    default: "#9e9e9e",
    projector: "#424242",
  }),

  /** Grid lines inside the plot area. */
  chartGridColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "chartGrid", {
    default: "#263238",
    projector: "#e0e0e0",
  }),

  /** The broadened spectrum trace. */
  spectrumColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "spectrum", {
    default: "#4fc3f7",
    projector: "#0d47a1",
  }),

  /** The NMR integral trace. */
  integralColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "integral", {
    default: "#ce93d8",
    projector: "#6a1b9a",
  }),

  /** Unknowns: the cross over a wrong guess and the frame around the right answer. */
  wrongGuessColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "wrongGuess", {
    default: "#d32f2f",
    projector: "#c62828",
  }),
  rightAnswerColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "rightAnswer", {
    default: "#43a047",
    projector: "#2e7d32",
  }),

  /** Stick (line-spectrum) markers and the selected-peak cursor. */
  peakMarkerColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "peakMarker", {
    default: "#ffd54f",
    projector: "#e65100",
  }),

  /** Shaded functional-group regions behind an IR spectrum. */
  regionFillColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "regionFill", {
    default: "rgba(129, 199, 132, 0.12)",
    projector: "rgba(46, 125, 50, 0.10)",
  }),
  regionTextColorProperty: new ProfileColorProperty(SpectroscopyLabNamespace, "regionText", {
    default: "#a5d6a7",
    projector: "#2e7d32",
  }),
};

export default SpectroscopyLabColors;
