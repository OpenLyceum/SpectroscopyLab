# Spectroscopy Lab — model

Each screen turns a molecule (atoms, 3D positions, bonds with orders) into a spectrum by the
reasoning taught in a first spectroscopy course. Only the vibrational force constants come from
quantum chemistry, and that is computed offline.

## Molecules

- **Structures:** PubChem 3D conformers (public domain), bond orders from the SDF. Streptocyanine
  dyes Me₂N–(CH)ₚ–NMe₂⁺ are generated as planar all-trans chains (C–C 1.39 Å, 120°), the geometry
  Kuhn's model assumes.
- **Aromaticity:** six-rings of alternating single/double bonds are re-marked aromatic (order 1.5),
  so the Kekulé form PubChem drew does not split equivalent ring positions.
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
D₂O shake moves the O–H stretch from ~3650 to ~2700 cm⁻¹ (ratio ≈ 1/√2) and leaves C–H alone.

**Limitations:** gas-phase harmonic frequencies, so no hydrogen-bond broadening of O–H, and no
overtones or combination bands.

## ¹H NMR

- **Shifts** (`ChemicalShiftRules.ts`): sp³ C–H base values (CH₃ 0.86, CH₂ 1.25, CH 1.50 ppm)
  plus α increments (O 2.4, ester O 2.85, N 1.45, Cl 2.3, C=O 1.25, CO₂R/CONR₂ 1.15, aryl 1.45,
  C=C 0.85, C≡N 1.15), scaled by 0.85 when there are two or more, and β increments (0.3; 0.55 for
  Cl). Aromatic H: 7.27 ppm plus ortho/meta/para increments for alkyl, OH and CHO. Alkenes, CHO,
  OH, NH: characteristic values. Tests hold 14 molecules to within 0.3 ppm of literature spectra.
- **Splitting** (`ProtonSpectrum.ts`): first order, from protons three bonds away in *other*
  environments; ³J = 7.0 Hz (sp³–sp³), 6.5 (allylic), 7.8 (aromatic ortho), 10.5 / 17.0 (alkene
  cis/trans, from the H–C=C–H dihedral), 2.0 (aldehyde). Couplings within 0.6 Hz merge (the n + 1
  rule); different J values nest (dd, qd…). O–H and N–H exchange fast and neither split nor are split.
  A symmetry class whose members couple differently (the cis/trans =CH₂ protons) is split in two.
- **Field:** line positions are computed in Hz and divided by the spectrometer frequency, so J is
  constant in Hz and multiplets narrow tenfold in ppm from 60 to 600 MHz.
- **Spectrum:** Lorentzians (HWHM 0.8 Hz; 12 Hz for exchanging O–H/N–H, with equal area), the
  integral as a running sum from the downfield end, and optional TMS at 0 ppm.

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

## Unknowns

Isomer families (one formula each) by level: C₂H₆O and C₃H₈O (alcohol vs ether); C₃H₆O and C₄H₈O₂
(carbonyls, esters, acid, cyclic ether); C₈H₁₀ (substitution patterns). The student sees the
formula, the degree of unsaturation (2C + 2 + N − H − X)/2, the molecular-ion cluster (M+1 from
¹³C at 1.08 % per carbon, M+2 from ¹⁸O and ³⁷Cl), the IR spectrum and the 300 MHz ¹H NMR spectrum.
Only families with every member's IR data computed are offered.
