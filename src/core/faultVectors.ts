/**
 * Fault geometry vectors (strike, normal, slip, dip) from a plane's
 * strike/dip/rake, in the (East, North, Up) frame.
 *
 * Ported from focal_block_2026.py:4567-4585.
 */
import type { FaultPlane, Vec3 } from './types';
import { cross, dot, scale, add } from './vec';

const RAD = Math.PI / 180;

export interface FaultVectors {
  strike: Vec3;
  normal: Vec3;
  slip: Vec3;
  dip: Vec3;
}

export function faultVectors(plane: FaultPlane): FaultVectors {
  const sr = plane.strike * RAD;
  const dr = plane.dip * RAD;
  // Seismological slip convention (focal_block_2026.py:4544): the slip vector
  // uses rr = -(rake + 180)°, NOT the naive rake. This negates the along-strike
  // component (cos(rr) = -cos(rake)) while leaving the dip component unchanged
  // (sin(rr) = sin(rake)). Without it, strike-slip motion renders with reversed
  // lateral sense; dip-slip is unaffected (cos(rake) = 0 there).
  const rr = -(plane.rake + 180) * RAD;

  const strike: Vec3 = [Math.sin(sr), Math.cos(sr), 0];
  const normal: Vec3 = [-Math.sin(dr) * Math.cos(sr), Math.sin(dr) * Math.sin(sr), -Math.cos(dr)];

  // Slip = strike rotated about the fault normal by the rake (Rodrigues).
  const nxs = cross(normal, strike);
  const nds = dot(normal, strike);
  const slip: Vec3 = add(
    add(scale(strike, Math.cos(rr)), scale(nxs, Math.sin(rr))),
    scale(normal, nds * (1 - Math.cos(rr))),
  );

  const dip = cross(normal, strike);

  return { strike, normal, slip, dip };
}
