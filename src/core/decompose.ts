/**
 * Moment-tensor decomposition into isotropic (ISO), double-couple (DC), and
 * compensated-linear-vector-dipole (CLVD) parts — the Jost & Herrmann scheme.
 * Ported from focal_block_2026.py:4356-4438.
 *
 * From the sorted eigenvalues M1 ≥ M2 ≥ M3:
 *   M_ISO  = (M1 + M2 + M3) / 3
 *   M_DC   = ½(M1 − M3 − |M1 + M3 − 2·M2|)
 *   M_CLVD = ⅔(M1 + M3 − 2·M2)
 * with basis tensors E_ISO = I, E_DC = diag(1,0,−1), and
 *   E_CLVD = diag(2,−1,−1)/2   (M_CLVD ≥ 0)  or  diag(1,1,−2)/2  (M_CLVD < 0),
 * each rotated back into the geographic frame via E·(scalar·E_comp)·Eᵀ.
 */
import type { MomentTensor, Vec3 } from './types';
import { jacobiEigen } from './eigen';
import { tensorMatrix, fromCartesian, type CartesianTensor } from './MomentTensor';

export interface TensorDecomposition {
  /** Scalar magnitudes of each part. */
  iso: number;
  dc: number;
  clvd: number;
  /** Each part as a standalone moment tensor (GCMT r,t,p form). */
  isoTensor: MomentTensor;
  dcTensor: MomentTensor;
  clvdTensor: MomentTensor;
  /** Share of each part, |M_i| / Σ|M|, as percentages (sum to 100). */
  percent: { iso: number; dc: number; clvd: number };
}

export interface ComponentSelection {
  iso: boolean;
  dc: boolean;
  clvd: boolean;
}

/** component_ij = Σ_k d_k · col_k[i] · col_k[j]  (E · diag(d) · Eᵀ). */
function component(d: readonly [number, number, number], cols: readonly [Vec3, Vec3, Vec3]): CartesianTensor {
  const m = (i: number, j: number): number =>
    d[0] * cols[0][i]! * cols[0][j]! +
    d[1] * cols[1][i]! * cols[1][j]! +
    d[2] * cols[2][i]! * cols[2][j]!;
  return { mxx: m(0, 0), myy: m(1, 1), mzz: m(2, 2), mxy: m(0, 1), mxz: m(0, 2), myz: m(1, 2) };
}

export function decompose(mt: MomentTensor): TensorDecomposition {
  const eig = jacobiEigen(tensorMatrix(mt));

  // Sort eigenpairs descending: M1 ≥ M2 ≥ M3.
  const order: [number, number, number] = [0, 1, 2];
  order.sort((a, b) => eig.values[b]! - eig.values[a]!);
  const cols: [Vec3, Vec3, Vec3] = [
    eig.vectors[order[0]]!,
    eig.vectors[order[1]]!,
    eig.vectors[order[2]]!,
  ];
  const M1 = eig.values[order[0]]!;
  const M2 = eig.values[order[1]]!;
  const M3 = eig.values[order[2]]!;

  const iso = (M1 + M2 + M3) / 3;
  const dc = 0.5 * (M1 - M3 - Math.abs(M1 + M3 - 2 * M2));
  const clvd = (2 / 3) * (M1 + M3 - 2 * M2);

  const clvdDiag: [number, number, number] =
    clvd >= 0 ? [clvd, -clvd / 2, -clvd / 2] : [clvd / 2, clvd / 2, -clvd];

  const isoTensor = fromCartesian(component([iso, iso, iso], cols));
  const dcTensor = fromCartesian(component([dc, 0, -dc], cols));
  const clvdTensor = fromCartesian(component(clvdDiag, cols));

  const total = Math.abs(iso) + Math.abs(dc) + Math.abs(clvd) || 1;
  const percent = {
    iso: (100 * Math.abs(iso)) / total,
    dc: (100 * Math.abs(dc)) / total,
    clvd: (100 * Math.abs(clvd)) / total,
  };

  return { iso, dc, clvd, isoTensor, dcTensor, clvdTensor, percent };
}

const ZERO: MomentTensor = { mrr: 0, mtt: 0, mpp: 0, mrt: 0, mrp: 0, mtp: 0 };
const addTensor = (a: MomentTensor, b: MomentTensor): MomentTensor => ({
  mrr: a.mrr + b.mrr,
  mtt: a.mtt + b.mtt,
  mpp: a.mpp + b.mpp,
  mrt: a.mrt + b.mrt,
  mrp: a.mrp + b.mrp,
  mtp: a.mtp + b.mtp,
});

/**
 * Rebuild a tensor from only the selected components. With all three selected
 * the original tensor is returned unchanged (the decomposition is complete, so
 * this also avoids round-trip rounding drift).
 */
export function applyComponents(mt: MomentTensor, sel: ComponentSelection): MomentTensor {
  if (sel.iso && sel.dc && sel.clvd) return mt;
  const d = decompose(mt);
  let out = ZERO;
  if (sel.iso) out = addTensor(out, d.isoTensor);
  if (sel.dc) out = addTensor(out, d.dcTensor);
  if (sel.clvd) out = addTensor(out, d.clvdTensor);
  return out;
}
