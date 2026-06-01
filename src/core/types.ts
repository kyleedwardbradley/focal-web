/**
 * The domain contract — pure data, no Three.js, no DOM.
 *
 * Everything in `core/` speaks in these types. The render layer converts
 * `Vec3` (plain tuples in the East/North/Up frame) into THREE.Vector3 at its
 * own boundary, so the seismology never depends on the renderer.
 */

/** A 3-vector in the geographic frame: [East, North, Up]. */
export type Vec3 = readonly [number, number, number];

/**
 * Moment tensor in the GCMT spherical convention (r, t, p) = (Up, South, East).
 * This is the form catalogs publish, and the form the UI sliders edit.
 */
export interface MomentTensor {
  mrr: number;
  mtt: number;
  mpp: number;
  mrt: number;
  mrp: number;
  mtp: number;
}

/** One principal axis (T, N, or P) of the moment tensor. */
export interface PrincipalAxis {
  /** Unit eigenvector in [East, North, Up], forced to the lower hemisphere. */
  vec: Vec3;
  /** Eigenvalue (signed). */
  value: number;
  /** Azimuth, degrees clockwise from North, in [0, 360). */
  azimuth: number;
  /** Plunge below the horizontal, degrees in [0, 90]. */
  plunge: number;
}

/** A fault plane in strike/dip/rake (Aki & Richards), degrees. */
export interface FaultPlane {
  strike: number;
  dip: number;
  rake: number;
}

/**
 * The intersection curve(s) of the moment-tensor radiation pattern with the
 * focal sphere. For a pure double couple these collapse to the nodal planes
 * and `exists` is false (the renderer draws great circles instead).
 *
 * Arrays are length 361 (one sample per degree), in [East, North, Up].
 */
export interface NodalSurface {
  exists: boolean;
  xe: Float32Array;
  xn: Float32Array;
  xz: Float32Array;
}

/**
 * The single object that crosses from `core` to `render`. `derive()` produces
 * it; every feature view consumes it. If this is correct, the render layer is
 * just turning numbers into meshes.
 */
export interface FocalSolution {
  tensor: MomentTensor;
  eigen: {
    /** Eigenvalues, descending (T, N, P). */
    values: [number, number, number];
    /** Corresponding unit eigenvectors, lower hemisphere. */
    vectors: [Vec3, Vec3, Vec3];
  };
  axes: {
    T: PrincipalAxis;
    N: PrincipalAxis;
    P: PrincipalAxis;
  };
  /** [primary nodal plane, auxiliary nodal plane]. */
  planes: [FaultPlane, FaultPlane];
  /** Fault geometry vectors of the primary plane, unit, in [East, North, Up]. */
  vectors: {
    strike: Vec3;
    normal: Vec3;
    slip: Vec3;
    dip: Vec3;
  };
  nodalSurface: NodalSurface;
  /** Current slip amount (UI-driven), passed through for the renderer. */
  slip: number;
}
