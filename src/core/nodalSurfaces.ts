/**
 * Nodal surface curves — the intersection of the moment-tensor radiation
 * pattern with the focal sphere (361 samples, one per degree).
 *
 * For a non-double-couple source these are curved surfaces parameterized by
 * the deviatoric eigenvalues; for a pure double couple (or pure isotropic)
 * source they degenerate and `exists` is false, signalling the renderer to
 * draw plain great circles instead.
 *
 * Ported from focal_block_2026.py `RecalculateNodalSurfaces` (3671-3820).
 */
import type { NodalSurface, PrincipalAxis } from './types';

const RAD = Math.PI / 180;
const SEIS_EPSILON = 0.0001;

const NONE: NodalSurface = {
  exists: false,
  xe: new Float32Array(0),
  xn: new Float32Array(0),
  xz: new Float32Array(0),
};

export function nodalSurfaces(T: PrincipalAxis, N: PrincipalAxis, P: PrincipalAxis): NodalSurface {
  const B = 1; // index of the null (N) axis

  // Trend / plunge / eigenvalue, ordered (T, N, P).
  const a = [T.azimuth, N.azimuth, P.azimuth];
  const p = [T.plunge, N.plunge, P.plunge];
  const v = [T.value, N.value, P.value];

  const vi = (v[0]! + v[1]! + v[2]!) / 3;

  // Degenerate eigenvalues → fall back to nodal planes.
  if (v[0] === 0 || v[2] === 0) return NONE;

  // Deviatoric part.
  for (let i = 0; i < 3; i++) v[i] = v[i]! - vi;

  // Pure implosion / explosion.
  if (v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2 < SEIS_EPSILON) return NONE;

  if (v[0] === 0) v[0] = 0.00001;
  if (v[2] === 0) v[2] = 0.00001;

  // Decide which eigenvalue indexes the "dominant" cone (d) vs the minor (m).
  let bigisotestv0 = 0;
  let bigisotestv2 = 0;
  for (let i = 0; i <= 360; i++) {
    const fir = i * RAD;

    let f = -v[1]! / v[0]!;
    let iso = vi / v[0]!;
    if (3 + (1 - 2 * f) * Math.cos(2 * fir) === 0) return NONE;
    if ((2 + 2 * iso) / (3 + (1 - 2 * f) * Math.cos(2 * fir)) > 1) bigisotestv0++;

    f = -v[1]! / v[2]!;
    iso = vi / v[2]!;
    if (3 + (1 - 2 * f) * Math.cos(2 * fir) === 0) return NONE;
    if ((2 + 2 * iso) / (3 + (1 - 2 * f) * Math.cos(2 * fir)) > 1) bigisotestv2++;
  }

  let d: number;
  let m: number;
  if (bigisotestv0 === 0) {
    d = 0;
    m = 2;
  } else if (bigisotestv2 === 0) {
    d = 2;
    m = 0;
  } else {
    // Warning: bigisotest failed (no representable surface).
    return NONE;
  }

  const f = -v[1]! / v[d]!;
  const iso = vi / v[d]!;

  const spd = Math.sin(p[d]! * RAD);
  const cpd = Math.cos(p[d]! * RAD);
  const spb = Math.sin(p[B]! * RAD);
  const cpb = Math.cos(p[B]! * RAD);
  const spm = Math.sin(p[m]! * RAD);
  const cpm = Math.cos(p[m]! * RAD);

  const sad = Math.sin(a[d]! * RAD);
  const cad = Math.cos(a[d]! * RAD);
  const sab = Math.sin(a[B]! * RAD);
  const cab = Math.cos(a[B]! * RAD);
  const sam = Math.sin(a[m]! * RAD);
  const cam = Math.cos(a[m]! * RAD);

  const xz = new Float32Array(361);
  const xn = new Float32Array(361);
  const xe = new Float32Array(361);

  for (let i = 0; i < 361; i++) {
    const fir = i * RAD;
    const s2alphan = (2 + 2 * iso) / (3 + (1 - 2 * f) * Math.cos(2 * fir));
    if (s2alphan < 0) return NONE;

    const alphan = Math.asin(Math.sqrt(s2alphan));
    const sfi = Math.sin(fir);
    const cfi = Math.cos(fir);
    const san = Math.sin(alphan);
    const can = Math.cos(alphan);

    xz[i] = -(can * spd + san * sfi * spb + san * cfi * spm);
    xn[i] = can * cpd * cad + san * sfi * cpb * cab + san * cfi * cpm * cam;
    xe[i] = can * cpd * sad + san * sfi * cpb * sab + san * cfi * cpm * sam;
  }

  return { exists: true, xe, xn, xz };
}
