import { describe, it, expect } from 'vitest';
import { derive } from '../../src/core/solve';
import { faultVectors } from '../../src/core/faultVectors';
import { fromCartesian } from '../../src/core/MomentTensor';
import { add, sub, cross, normalize } from '../../src/core/vec';
import type { MomentTensor, Vec3 } from '../../src/core/types';

/**
 * Build a unit pure-double-couple moment tensor (in GCMT r,t,p form) directly
 * from a fault's strike/dip/rake, by constructing M_ij = n_i u_j + n_j u_i in
 * the (E,N,U) frame from the fault normal `n` and slip `u`. This is independent
 * of the derive() path, so a round trip exercises the whole pipeline:
 * conversion → eigen → principal axes → nodal planes.
 */
function dcTensor(strike: number, dip: number, rake: number): { mt: MomentTensor; n: Vec3; u: Vec3 } {
  const { normal: n, slip: u } = faultVectors({ strike, dip, rake });
  const mt = fromCartesian({
    mxx: 2 * n[0] * u[0],
    myy: 2 * n[1] * u[1],
    mzz: 2 * n[2] * u[2],
    mxy: n[0] * u[1] + n[1] * u[0],
    mxz: n[0] * u[2] + n[2] * u[0],
    myz: n[1] * u[2] + n[2] * u[1],
  });
  return { mt, n, u };
}

const matchesUpToSign = (x: Vec3, y: Vec3, eps = 1e-5): boolean => {
  const same = Math.abs(x[0] - y[0]) < eps && Math.abs(x[1] - y[1]) < eps && Math.abs(x[2] - y[2]) < eps;
  const opp = Math.abs(x[0] + y[0]) < eps && Math.abs(x[1] + y[1]) < eps && Math.abs(x[2] + y[2]) < eps;
  return same || opp;
};

const inSet = (x: Vec3, candidates: Vec3[], eps = 1e-4): boolean =>
  candidates.some((c) => matchesUpToSign(x, c, eps));

const FAULTS: Array<[string, number, number, number]> = [
  ['pure thrust', 0, 45, 90],
  ['pure normal', 0, 45, -90],
  ['vertical strike-slip', 30, 90, 0],
  ['oblique', 30, 60, 45],
  ['oblique 2', 123, 37, -112],
  ['shallow dip', 210, 12, 88],
];

describe('derive() — double-couple round trip', () => {
  for (const [name, strike, dip, rake] of FAULTS) {
    describe(name, () => {
      const { mt, n, u } = dcTensor(strike, dip, rake);
      const sol = derive(mt);

      it('recovers eigenvalues (+1, 0, -1) in descending order', () => {
        expect(sol.eigen.values[0]).toBeCloseTo(1, 6);
        expect(sol.eigen.values[1]).toBeCloseTo(0, 6);
        expect(sol.eigen.values[2]).toBeCloseTo(-1, 6);
      });

      it('places T along (n+u), P along (n−u), N along (n×u)', () => {
        expect(matchesUpToSign(sol.axes.T.vec, normalize(add(n, u)))).toBe(true);
        expect(matchesUpToSign(sol.axes.P.vec, normalize(sub(n, u)))).toBe(true);
        expect(matchesUpToSign(sol.axes.N.vec, normalize(cross(n, u)))).toBe(true);
      });

      it('axes obey the lower-hemisphere convention (z ≤ 0)', () => {
        expect(sol.axes.T.vec[2]).toBeLessThanOrEqual(1e-12);
        expect(sol.axes.N.vec[2]).toBeLessThanOrEqual(1e-12);
        expect(sol.axes.P.vec[2]).toBeLessThanOrEqual(1e-12);
      });

      it('recovers the input fault plane and its auxiliary', () => {
        // The two returned planes carry the fault normal and the slip direction;
        // input n and u must each appear among the plane normals (up to sign).
        const planeNormals = sol.planes.map((p) => faultVectors(p).normal);
        expect(inSet(n, planeNormals)).toBe(true);
        expect(inSet(u, planeNormals)).toBe(true);
      });

      it('produces nodal-surface samples that lie on the unit sphere', () => {
        const { nodalSurface: ns } = sol;
        if (!ns.exists) return;
        for (let i = 0; i < ns.xe.length; i++) {
          const r = Math.hypot(ns.xe[i]!, ns.xn[i]!, ns.xz[i]!);
          expect(r).toBeCloseTo(1, 4);
        }
      });
    });
  }
});
