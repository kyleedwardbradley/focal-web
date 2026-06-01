/**
 * Eigen-decomposition of a symmetric 3x3 matrix via the cyclic Jacobi method.
 *
 * The moment tensor is symmetric, so this is numerically stable and exact to
 * machine precision in a handful of sweeps — no general (`np.linalg.eig`)
 * solver needed. Returns eigenvalues with their corresponding unit
 * eigenvectors (unsorted; callers order them into T/N/P).
 */
import type { Mat3 } from './MomentTensor';
import type { Vec3 } from './types';

export interface Eigen3 {
  values: [number, number, number];
  vectors: [Vec3, Vec3, Vec3];
}

const idx = (r: number, c: number): number => r * 3 + c;

export function jacobiEigen(m: Mat3): Eigen3 {
  // Working copy of the matrix (symmetric) and the accumulated eigenvector basis.
  const a = Float64Array.from(m);
  const v = Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);

  // Indices are always in-bounds; the helpers narrow away `noUncheckedIndexedAccess`.
  const A = (r: number, c: number): number => a[idx(r, c)]!;
  const V = (r: number, c: number): number => v[idx(r, c)]!;

  const rotate = (p: number, q: number): void => {
    const apq = A(p, q);
    if (Math.abs(apq) < 1e-300) return;

    const app = A(p, p);
    const aqq = A(q, q);
    const theta = (aqq - app) / (2 * apq);
    const sgn = theta >= 0 ? 1 : -1;
    const t = sgn / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // Zero out the (p, q) element and update the two diagonals.
    a[idx(p, p)] = app - t * apq;
    a[idx(q, q)] = aqq + t * apq;
    a[idx(p, q)] = 0;
    a[idx(q, p)] = 0;

    // Update the remaining row/column entries (symmetric).
    for (let k = 0; k < 3; k++) {
      if (k === p || k === q) continue;
      const akp = A(k, p);
      const akq = A(k, q);
      const newKp = c * akp - s * akq;
      const newKq = s * akp + c * akq;
      a[idx(k, p)] = newKp;
      a[idx(p, k)] = newKp;
      a[idx(k, q)] = newKq;
      a[idx(q, k)] = newKq;
    }

    // Accumulate the rotation into the eigenvector basis.
    for (let k = 0; k < 3; k++) {
      const vkp = V(k, p);
      const vkq = V(k, q);
      v[idx(k, p)] = c * vkp - s * vkq;
      v[idx(k, q)] = s * vkp + c * vkq;
    }
  };

  for (let sweep = 0; sweep < 100; sweep++) {
    const off = Math.abs(A(0, 1)) + Math.abs(A(0, 2)) + Math.abs(A(1, 2));
    if (off < 1e-18) break;
    rotate(0, 1);
    rotate(0, 2);
    rotate(1, 2);
  }

  return {
    values: [A(0, 0), A(1, 1), A(2, 2)],
    vectors: [
      [V(0, 0), V(1, 0), V(2, 0)],
      [V(0, 1), V(1, 1), V(2, 1)],
      [V(0, 2), V(1, 2), V(2, 2)],
    ],
  };
}
