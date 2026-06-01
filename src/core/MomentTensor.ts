/**
 * Moment-tensor representation and frame conversions.
 *
 * Catalogs publish the tensor in the spherical (r, t, p) = (Up, South, East)
 * frame (`MomentTensor`). All geometry in this app lives in the Cartesian
 * geographic frame (x, y, z) = (East, North, Up). These helpers convert between
 * the two and assemble the symmetric 3x3 matrix the eigensolver consumes.
 *
 * Conversion (matches the source script, focal_block_2026.py:3893-3907):
 *   mxx =  mpp,  myy =  mtt,  mzz =  mrr,
 *   mxy = -mtp,  mxz =  mrp,  myz = -mrt.
 */
import type { MomentTensor } from './types';

/** Row-major symmetric 3x3 matrix: [m00, m01, m02, m10, m11, m12, m20, m21, m22]. */
export type Mat3 = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

export interface CartesianTensor {
  mxx: number;
  myy: number;
  mzz: number;
  mxy: number;
  mxz: number;
  myz: number;
}

/** (r, t, p) → (E, N, U). */
export function toCartesian(mt: MomentTensor): CartesianTensor {
  return {
    mxx: mt.mpp,
    myy: mt.mtt,
    mzz: mt.mrr,
    mxy: -mt.mtp,
    mxz: mt.mrp,
    myz: -mt.mrt,
  };
}

/** (E, N, U) → (r, t, p). Inverse of {@link toCartesian}. */
export function fromCartesian(c: CartesianTensor): MomentTensor {
  return {
    mrr: c.mzz,
    mtt: c.myy,
    mpp: c.mxx,
    mrt: -c.myz,
    mrp: c.mxz,
    mtp: -c.mxy,
  };
}

/** Assemble the symmetric matrix in the (E, N, U) frame. */
export function tensorMatrix(mt: MomentTensor): Mat3 {
  const { mxx, myy, mzz, mxy, mxz, myz } = toCartesian(mt);
  return [
    mxx, mxy, mxz,
    mxy, myy, myz,
    mxz, myz, mzz,
  ];
}
