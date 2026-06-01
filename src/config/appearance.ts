/**
 * Centralized look-and-feel: the colors, radii, lengths, and scales that the
 * source script scattered across ~150 lines of module globals. Keeping them
 * here means tuning the visuals never touches geometry or render logic.
 */

/** Colors carried over from focal_block_2026.py (RGB tuples → hex). */
export const COLORS = {
  strike: 0xff0a0a, // strike_rgb (255,10,10)
  dip: 0x280ac8, // dip_rgb (40,10,200)
  normal: 0x9b30ff,
  slip: 0x3cff3c, // slip_rgb (60,255,60)
  tAxis: 0xff8c00,
  nAxis: 0xdddddd,
  pAxis: 0x1e90ff,
  background: 0x101014,
  sphereWire: 0x303040,
  nodalSurface: 0xa04c9c, // Mat_NodalSurface (160, 76, 156) — pink/mauve
  cutFace: 0xa8a29a, // neutral "rock interior" fill for the exposed cut surface
  faultPoly: 0xff0000, // mat_faultpoly — translucent red fault-plane patch
  compass: 0x4a8a5a,
  compassNorth: 0xff5a5a,
  // Component-dipole colors keyed by the "from" axis (E=x, N=y, U=z).
  compE: 0xff5a5a,
  compN: 0x5aff7a,
  compU: 0x5a8aff,
} as const;

/** Moment-tensor component dipole arrows. */
export const DIPOLE = {
  scale: 0.1, // dipole_scale = 1/10 (focal_block_2026.py:76)
  offset: 0.5, // base offset from center along the row axis
  radius: 0.018,
  headRadius: 0.045,
  headLength: 0.1,
} as const;

/** Fault-block cube (the displaced cube) — cut by the fault plane and slipped. */
export const BLOCK = {
  half: 1, // cube spans [-1, 1] (size 2), matching the source primitive_cube_add
  cutFace: 0x646464, // mat_blockfault (100, 100, 100)
  edgeColor: 0x111111,
  edgeWidth: 3, // wireframe thickness in screen pixels (Line2)
} as const;

/** Displacement vector field (Fibonacci-placed per-wave arrows). */
export const FIELD = {
  color: 0x808080, // nvec_rgb (128,128,128) gray
  coef: 0.35, // arrow length per unit displacement at scale = 1
  radius: 0.011, // focvec_radius ≈ 0.01
  headRadius: 0.026,
  maxCount: 1000, // InstancedMesh capacity
} as const;

/** Deformed sphere (displacement field). */
export const DEFORM = {
  detail: 5, // IcosahedronGeometry subdivisions (vertex density for smooth lobes)
  /** Displacement factor at scale = 1: r' = r·(1 + coef·nᵀMn). */
  coef: 0.4,
} as const;

/** Compass ring beneath the focal sphere. */
export const COMPASS = {
  radius: 1.5,
  depth: -1.35, // z below the sphere
  width: 2.0,
} as const;

/**
 * Per-wave shader index + polarity palette (focal_block_2026.py:2267-2283).
 * S is colored by a magnitude gradient in-shader, so its colors are unused.
 */
export const WAVE_PALETTE = {
  P: { index: 0, compressive: 0x003333, tensile: 0xffffff, posContour: 0x1a0000, negContour: 0xccccff },
  S: { index: 1, compressive: 0x000000, tensile: 0xffffff, posContour: 0xffffff, negContour: 0x333333 },
  SV: { index: 2, compressive: 0x001a1a, tensile: 0x66ffff, posContour: 0xffffff, negContour: 0x333333 },
  SH: { index: 3, compressive: 0x330033, tensile: 0xcf00cf, posContour: 0xffffff, negContour: 0x333333 },
} as const;

/** Radiation-pattern beachball colors (focal_block_2026.py:98-99, 2269-2270). */
export const RADIATION = {
  compressive: 0x003333, // p_compressive_color (0, 0.2, 0.2)
  tensile: 0xffffff, // p_tensile_color (1, 1, 1)
  posContour: 0x1a0000, // positive_contour_color (0.1, 0, 0)
  negContour: 0xccccff, // negative_contour_color (0.8, 0.8, 1)
  contourWidth: 0.01,
  showContours: true,
  opacity: 0.82, // translucent so interior arrows read through (source used BLEND)
} as const;

/** Geometric dimensions (focal sphere has unit radius). */
export const GEOM = {
  sphereRadius: 1,
  vectorLength: 1.5, // strike/dip/normal/slip arrow length
  tnpLength: 1.4, // principal-axis arrow length
  arrowRadius: 0.025,
  headRadius: 0.06,
  headLength: 0.18,
} as const;
