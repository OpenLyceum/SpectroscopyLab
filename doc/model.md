# Spectroscopy Lab — model

Each screen turns a molecule (atoms, 3D positions, bonds with orders) into a spectrum by the
reasoning taught in a first spectroscopy course. Only the vibrational force constants come from
quantum chemistry, and that is computed offline.

## Molecules

- **Structures:** PubChem 3D conformers (public domain), bond orders from the SDF. Streptocyanine
  dyes Me₂N–(CH)ₚ–NMe₂⁺ are generated as planar all-trans chains (C–C 1.39 Å, 120°), the geometry
  Kuhn's model assumes.
- **Aromaticity:** six-rings of alternating single/double bonds are re-marked aromatic (order 1.5),
  so the Kekulé form PubChem drew does not split equivalent ring positions. A six-ring sharing a
  bond with an aromatic ring is aromatic too when its other atoms each have a ring double bond
  (naphthalene's second ring need not alternate in the form drawn).
- **Equivalence:** colour refinement (Morgan's algorithm) on the bonding graph gives topological
  symmetry classes. Diastereotopic protons count as equivalent (a known limitation).

## Infrared

1. Offline (`scripts/qm/compute_vibrations.py`): B3LYP/def2-SVP geometry optimisation, analytic
   Cartesian Hessian **H**, and dipole derivatives ∂μ/∂x by central differences (±0.005 bohr).
2. In the browser (`NormalModeAnalysis.ts`): mass-weight H′ᵢⱼ = Hᵢⱼ/√(mᵢmⱼ) with isotope masses
   (AME2020), project out the 3 translations and 3 (2 for linear molecules) rotations, and
   diagonalise (cyclic Jacobi). Eigenvalues λ give ω = √λ; wavenumbers are scaled by 0.965, the
   B3LYP/def2-SVP factor (water's fundamentals then agree with experiment to about 1 %).
3. IR intensity: I = (N_A π / 3c²)|∂μ/∂Q|² = 974.88 km/mol × |Σᵢ (∂μ/∂xᵢ) Lᵢ/√mᵢ|², with
   ∂μ/∂x in e and Q in bohr·√u.
4. Spectrum: unit-height Lorentzians (HWHM 2–40 cm⁻¹) weighted by relative intensity, scaled so
   the strongest band reaches absorbance 1.3, then T = 100·10^(−A) (Beer–Lambert).
5. Mode names ("C=O stretch", "H–C–H bend"): a crude potential-energy distribution, k_s·n·Δr² per
   bond (k_s = 5 mdyn/Å per bond order n) against k_b·Δθ² per angle (k_b = 0.7 mdyn·Å/rad²).

Isotopes change only masses: the Hessian is the same Born–Oppenheimer surface, which is why a
D₂O shake moves the O–H stretch from ~3650 to ~2700 cm⁻¹ (ratio ≈ 1/√2), renames it O–D, and leaves C–H alone.

**Limitations:** gas-phase harmonic frequencies, so no hydrogen-bond broadening of O–H, and no
overtones or combination bands.

### Rotational fine structure (HCl)

`RotationalFineStructure.ts`. At high resolution the v = 0 → 1 band of a gas-phase diatomic splits
into rotational lines with ΔJ = ±1 (no Q branch for ¹Σ):
R(J) = ν₀ + F₁(J+1) − F₀(J), P(J) = ν₀ + F₁(J−1) − F₀(J), F_v(J) = B_v J(J+1) − D J²(J+1)².

- ν₀: the scaled B3LYP harmonic wavenumber for the current masses (2853 cm⁻¹ for H³⁵Cl; experiment
  2886), so isotope schemes move the band (DCl × 0.717).
- B_e = 16.8576 / (μ r_e²) cm⁻¹ (μ in u, r_e in Å) from the B3LYP bond length (1.290 Å vs 1.275).
- α_e: the harmonic Hessian has no vibration–rotation coupling, so α_e = 0.3072 cm⁻¹ (H³⁵Cl, Huber &
  Herzberg 1979), scaled as μ^(−3/2) to other isotopologues; B_v = B_e − α_e(v + ½).
- D = 4B_e³/ν₀² (Kratzer).
- Intensity ∝ abundance × ν × S × exp(−hcF₀(J)/kT)/Q, Hönl–London S = J + 1 (R) or J (P).
- Isotopologues: an atom left at its most abundant isotope also appears as its common minor
  isotope at natural abundance (³⁵Cl 75.76 %, ³⁷Cl 24.24 %), so every line has an H³⁷Cl partner
  ~2 cm⁻¹ lower. Lorentzian HWHM 0.3 cm⁻¹ (a high-resolution FTIR; the Doppler width is ~0.003).
- The summed curve is scaled so its strongest point reaches absorbance 1.3, matching the
  low-resolution band. The line zoom uses that same scale, so a weak line stays weak.
- Readouts: r from B, and the harmonic force constant k = μ(2πcν₀)².

## ¹H NMR

- **Shifts** (`ChemicalShiftRules.ts`): sp³ C–H base values (CH₃ 0.86, CH₂ 1.25, CH 1.50 ppm)
  plus α increments (O 2.4, ester O 2.85, N 1.45, Cl 2.3, C=O 1.25, CO₂R/CONR₂ 1.15, aryl 1.45,
  C=C 0.85, C≡N 1.15), scaled by 0.85 when there are two or more, and β increments (0.3; 0.55 for
  Cl). Aromatic H: 7.27 ppm plus ortho/meta/para increments for alkyl, OH and CHO. Alkenes, CHO,
  OH, NH: characteristic values. Tests hold 14 molecules to within 0.3 ppm of literature spectra.
- **Splitting** (`ProtonSpectrum.ts`): first order, from protons three bonds away in *other*
  environments; ³J = 7.0 Hz (sp³–sp³), 6.5 (allylic), 7.8 (aromatic ortho), 10.5 / 17.0 (alkene
  cis/trans). A =CH₂ group always gets one cis and one trans coupling: the hydrogen with the
  smaller H–C=C–H torsion is cis, so a twisted conformer cannot assign both the same J. A
  disubstituted double bond uses its H–C=C–H dihedral, and within 15° of 90° it uses the torsion
  of the two non-hydrogen substituents instead. Aldehyde ³J is 2.0 Hz. Couplings within 0.6 Hz merge (the n + 1
  rule); different J values nest (dd, qd…). O–H and N–H exchange fast and neither split nor are split.
  A symmetry class whose members couple differently (the cis/trans =CH₂ protons) is split in two.
- **Field:** line positions are computed in Hz and divided by the spectrometer frequency, so J is
  constant in Hz and multiplets narrow tenfold in ppm from 60 to 600 MHz.
- **Exact (second-order) spectrum** (`SpinSystem.ts`, the default): non-exchanging protons are
  grouped into coupled spin systems (connected by a non-zero ³J, couplings between equivalent
  protons included). For each, H = Σ νᵢIzᵢ + Σ JᵢⱼIᵢ·Iⱼ (Hz) is block-diagonalised by total Iz and
  each block diagonalised (Jacobi). Lines are transitions between neighbouring blocks at Eₐ − E_b
  with intensity |⟨b|ΣI⁻ᵢ|a⟩|² / 2^(N−1), so a system's lines sum to its proton count; each line is
  attributed to the signal whose spins contribute the largest amplitude. Lines of one signal within
  0.1 Hz are merged and lines under 10⁻⁴ protons dropped. Systems of more than 9 spins (a 10-spin
  block is 252 × 252) fall back to first order. The result reproduces the AB quartet exactly,
  roofing and extra lines at 60 MHz, and the n + 1 rule at 600 MHz. The first-order option shows
  the n + 1 rule for comparison.
- **Spectrum:** Lorentzians (HWHM 0.8 Hz; 12 Hz for exchanging O–H/N–H, with equal area), the
  integral as a running sum from the downfield end, and optional TMS at 0 ppm.

## ¹³C NMR

`CarbonSpectrum.ts`. One line per carbon symmetry class (o-, m-, p-xylene: 4, 5, 3).

- **sp³ C:** −2.3 ppm (methane) + Grant–Paul alkyl increments 9.1 / 9.4 / −2.5 for carbons 1, 2,
  3 bonds away, walking only through sp³ carbons; a functional group met on the walk adds its own
  α/β/γ increment and stops the walk (OH 48/10/−5, OR 58/8/−4, ester O 53.5/6/−4, N 29/11/−5,
  Cl 31/11/−4, CHO and COR 32, COOH and COOR 23, CONH₂ 25, C≡N 4, aryl 23, vinyl 20). Each carbon
  across an α ether O adds 4, across an amine N 10; saturated six-ring carbons −5.
- **Aromatic C:** 128.5 + ipso/ortho/meta/para increments for CH₃, other alkyl, OH and CHO; fused
  acenes use 133 (fusion C), 128 (next to one) and 126.
- **Alkene C:** 123.3 + same-carbon / other-carbon increments (alkyl 10.6/−7.9 plus 7.2/−1.8 per
  further carbon, CH₂OH 14.2/−8.4, vinyl or aryl 13.6/−7, OR 29.4/−38.9, NR₂ 28/−32).
- **Carbonyl C:** ketone 206.6, aldehyde 200.5 (aromatic 192.4), acid 177.5, ester 171, amide 172.7,
  plus 2–3.5 per carbon β to the carbonyl; CO₂ 124.9, nitrile C 116.9.
- Tests hold 23 molecules to within 5 ppm of literature values (typically within 3; 1,4-dioxane is
  the worst at ~5).
- **Spectrum types:** ¹H-decoupled singlets (quaternary carbons drawn at 0.35 height: little NOE,
  long T₁); DEPT-135 (CH, CH₃ up; CH₂ down; C absent); DEPT-90 (CH only); ¹H-coupled, each carbon
  split n + 1 by its own hydrogens with ¹J = 125 (sp³), 156 (alkene), 159 (aromatic), 172
  (aldehyde) Hz, long-range couplings ignored. ¹³C is observed at the ¹H frequency / 3.9767.
- **Plot windows:** the full spectrum retains at least −5…225 ppm and expands to include every
  computed component with 1 ppm margin. The selected carbon zoom retains at least ±6 ppm and
  expands symmetrically for that signal's complete multiplet, also with 1 ppm margin. Both the
  sampler and chart use these domains; low-field splitting changes the window, not the physical
  line positions.

## UV-Vis

- **π system:** carbon and nitrogen atoms in a double or aromatic bond, plus an amine N next to
  one (it donates its lone pair: 2 electrons; every other π atom gives 1).
- **Hückel:** matrix with hᵢ on the diagonal (C 0, N 1) and kᵢⱼ between bonded atoms (1). Energies
  E = α + xβ (β < 0) are shown as E − α in units of |β|. The HOMO→LUMO gap Δx is converted to
  energy with E = a + b·Δx, fitted by least squares within each family (polyenes, acenes and
  benzene, cyanines); tests re-derive a and b. One |β| cannot fit all families: plain Hückel
  ignores bond alternation and electron repulsion.
- **Particle in a box** (Kuhn): L = (Nπ atoms + 1) × 1.39 Å, Eₙ = n²h²/(8mL²),
  λ = 8mcL²/(h(N + 1)) for N π electrons, with no fitted constants. The orbital coefficients are
  sin(nπ(j + 1)/(Nπ + 1)), the same as the Hückel eigenvectors of a uniform chain. It lands within
  ~13 % for cyanines (equal bond lengths) and fails badly for polyenes (alternating bonds). That
  contrast is the point.
- **Band and colour:** a Gaussian in wavenumber (σ = 2000 cm⁻¹) at λmax; the perceived colour is
  the transmitted spectrum (absorbance 1 at λmax) through the CIE 1931 matching functions (Wyman–
  Sloan–Shirley analytic fit) to white-balanced sRGB.
- **Measured λmax:** Jaffé & Orchin (1962), NIST WebBook (polyenes, acene ¹Lₐ bands); Malhotra &
  Whiting (1960) for streptocyanines.
- **Beer–Lambert mode:** A(λ) = ε·b·c × the band shape, with ε at λmax from `MOLAR_ABSORPTIVITY`
  (approximate literature values, ±30 %: butadiene 21 000 and β-carotene 139 000 are textbook
  values; the acenes are log ε 3.75–4.20; hexatriene, octatetraene and the cyanines are estimates
  following the growth of ε with chain length). The spectrometer reading includes 0.1 % stray
  light, A_read = −log₁₀((10^−A + s)/(1 + s)), so readings saturate near 3 and the calibration plot
  (A at λmax against c) bends over above A ≈ 2. The perceived colour uses the true absorbance, so it
  deepens with concentration and path length. The concentration slider runs to the 1–2–5 step at
  or above 4 / (ε · 1 cm), so dyes with ε ≈ 10⁵ and azulene (ε ≈ 350) are both usable.

## Unknowns

Isomer families (one formula each) by level: C₂H₆O and C₃H₈O (alcohol vs ether); C₃H₆O and C₄H₈O₂
(carbonyls, esters, acid, cyclic ether); C₈H₁₀ (substitution patterns). The student sees the
formula, the degree of unsaturation (2C + 2 + N − H − X)/2, the molecular-ion cluster (M+1 from
¹³C at 1.08 % per carbon, M+2 from ¹⁸O and ³⁷Cl), the IR spectrum and the 300 MHz ¹H NMR spectrum
(exact, as on the NMR screen), switchable to the ¹H-decoupled ¹³C spectrum at 75 MHz.
Only families with every member's IR data computed are offered.

Requesting a new question, changing level or resetting immediately invalidates the old question
and clears its clues and candidates. Loading feedback remains visible until the latest request
finishes. Only candidates of the ready question can be scored; obsolete load completions and
failures cannot replace the current request or change its loading state.
