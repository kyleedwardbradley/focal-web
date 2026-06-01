/**
 * Principal axes (T/N/P) and nodal planes (strike/dip/rake) from the moment
 * tensor's eigen-decomposition.
 *
 * Ported from focal_block_2026.py: the eigenvalue sort + lower-hemisphere sign
 * convention (3481-3516) and `RecalculateSDRFromTNP` (3600-3669).
 */
import type { Eigen3 } from './eigen';
import type { FaultPlane, PrincipalAxis, Vec3 } from './types';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const norm360 = (a: number): number => ((a % 360) + 360) % 360;

export interface PrincipalAxes {
  T: PrincipalAxis;
  N: PrincipalAxis;
  P: PrincipalAxis;
  /** Eigenvalues ordered (T, N, P), descending. */
  values: [number, number, number];
  /** Eigenvectors ordered (T, N, P), lower hemisphere. */
  vectors: [Vec3, Vec3, Vec3];
}

/** Build a principal axis from an eigenvector, forcing it to the lower hemisphere (z ≤ 0). */
function axisFrom(vec: Vec3, value: number): PrincipalAxis {
  let [x, y, z] = vec;
  // Source convention: keep when z < 0, otherwise negate (so z ≤ 0).
  if (!(z < 0)) {
    x = -x;
    y = -y;
    z = -z;
  }
  const azimuth = norm360(Math.atan2(x, y) * DEG);
  const plunge = -Math.asin(clamp(z, -1, 1)) * DEG;
  return { vec: [x, y, z], value, azimuth, plunge };
}

/** Order eigenpairs descending (T = max, N = middle, P = min) and build the axes. */
export function principalAxes(eigen: Eigen3): PrincipalAxes {
  const order: [number, number, number] = [0, 1, 2];
  order.sort((a, b) => eigen.values[b]! - eigen.values[a]!);
  const [iT, iN, iP] = order;

  const T = axisFrom(eigen.vectors[iT]!, eigen.values[iT]!);
  const N = axisFrom(eigen.vectors[iN]!, eigen.values[iN]!);
  const P = axisFrom(eigen.vectors[iP]!, eigen.values[iP]!);

  return {
    T,
    N,
    P,
    values: [T.value, N.value, P.value],
    vectors: [T.vec, N.vec, P.vec],
  };
}

const atan2dSafe = (y: number, x: number): number => (x === 0 && y === 0 ? 0 : Math.atan2(y, x) * DEG);

/** Rake of plane (S1,D1) given the conjugate plane (S2,D2) and slip sense `im` (±1). */
function rakeFromTwoSD(S1: number, D1: number, S2: number, D2: number, im: number): number {
  const ss = Math.sin((S1 - S2) * RAD);
  const cs = Math.cos((S1 - S2) * RAD);
  const sd = Math.sin(D1 * RAD);
  const cd = Math.cos(D2 * RAD);

  const sinrake2 = Math.abs(D2 - 90) < 0.1 ? im * cd : (-im * sd * cs) / cd;
  return atan2dSafe(sinrake2, -im * sd * ss);
}

/**
 * Both nodal planes from the T and P axes.
 * Returns [primary, auxiliary] as strike/dip/rake in degrees.
 */
export function sdrFromTNP(axes: PrincipalAxes): [FaultPlane, FaultPlane] {
  const { T, P } = axes;

  const sdp = Math.sin(P.plunge * RAD);
  const cdp = Math.cos(P.plunge * RAD);
  const sdt = Math.sin(T.plunge * RAD);
  const cdt = Math.cos(T.plunge * RAD);

  // Horizontal projections of the T and P axes.
  const cpt = Math.cos(T.azimuth * RAD) * cdt;
  const spt = Math.sin(T.azimuth * RAD) * cdt;
  const cpp = Math.cos(P.azimuth * RAD) * cdp;
  const spp = Math.sin(P.azimuth * RAD) * cdp;

  // Plane 1 from (T + P).
  let amz = sdt + sdp;
  let amx = spt + spp;
  let amy = cpt + cpp;
  let d1 = Math.atan2(Math.sqrt(amx * amx + amy * amy), amz) * DEG;
  let p1 = Math.atan2(amy, -amx) * DEG;
  if (d1 > 90) {
    d1 = 180 - d1;
    p1 -= 180;
  }
  if (p1 < 0) p1 += 360;

  // Plane 2 from (T - P).
  amz = sdt - sdp;
  amx = spt - spp;
  amy = cpt - cpp;
  let d2 = Math.atan2(Math.sqrt(amx * amx + amy * amy), amz) * DEG;
  let p2 = Math.atan2(amy, -amx) * DEG;
  if (d2 > 90) {
    d2 = 180 - d2;
    p2 -= 180;
  }
  if (p2 < 0) p2 += 360;

  const im = P.plunge > T.plunge ? -1 : 1;

  let rake1 = rakeFromTwoSD(p2, d2, p1, d1, im);
  let rake2 = rakeFromTwoSD(p1, d1, p2, d2, im);
  const wrap = (r: number): number => {
    while (r > 180) r -= 360;
    while (r < -180) r += 360;
    return r;
  };
  rake1 = wrap(rake1);
  rake2 = wrap(rake2);

  return [
    { strike: p1, dip: d1, rake: rake1 },
    { strike: p2, dip: d2, rake: rake2 },
  ];
}
