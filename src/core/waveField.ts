/**
 * Far-field displacement vector field: Fibonacci-spiral sample points on the
 * focal sphere, and the per-wave displacement at each.
 *
 * Placement ports focal_block_2026.py:3420-3423 (golden-angle spiral). The
 * displacement directions are the standard far-field body-wave terms: with
 * Mn = M·n and p = nᵀMn,
 *   P    = p·n               (radial)
 *   full = Mn                (P + S, the full traction)
 *   S    = Mn − p·n          (transverse)
 *   SH   = component of S along (n × ẑ)   (horizontal)
 *   SV   = S − SH                          (in the vertical plane)
 */
import type { Vec3 } from './types';
import type { Mat3 } from './MomentTensor';
import { cross, dot, length, normalize, scale, sub } from './vec';

export type FieldMode = 'P' | 'S' | 'SV' | 'SH' | 'full';

const PHI = 1.618033988749895;

/** ~`count` points spread evenly over the unit sphere via the golden-angle spiral. */
export function fibonacciSphere(count: number): Vec3[] {
  const ga = (2 * Math.PI) / PHI; // golden angle (source: 2 * phi_inv * pi)
  const half = Math.max(1, Math.floor(count / 2));
  const points: Vec3[] = [];
  for (let i = -half; i < half; i++) {
    const lon = (ga * i) % (2 * Math.PI);
    const lat = Math.asin((2 * i) / (2 * half + 1));
    const cl = Math.cos(lat);
    points.push([cl * Math.sin(lon), cl * Math.cos(lon), Math.sin(lat)]);
  }
  return points;
}

const matVec = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** Displacement vector at unit direction `n` for the given wave mode. */
export function waveDisplacement(m: Mat3, n: Vec3, mode: FieldMode): Vec3 {
  const Mn = matVec(m, n);
  if (mode === 'full') return Mn;

  const p = dot(n, Mn);
  const radial = scale(n, p);
  if (mode === 'P') return radial;

  const transverse = sub(Mn, radial);
  if (mode === 'S') return transverse;

  // Split S into horizontal (SH) and vertical-plane (SV) parts.
  const zc = cross(n, [0, 0, 1]);
  if (length(zc) < 1e-6) return mode === 'SV' ? transverse : [0, 0, 0]; // n ∥ ẑ: SH undefined
  const h = normalize(zc); // SH direction
  const sh = scale(h, dot(transverse, h));
  return mode === 'SH' ? sh : sub(transverse, sh);
}
