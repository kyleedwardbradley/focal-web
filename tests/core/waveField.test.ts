import { describe, it, expect } from 'vitest';
import { fibonacciSphere, waveDisplacement } from '../../src/core/waveField';
import { tensorMatrix } from '../../src/core/MomentTensor';
import { faultVectors } from '../../src/core/faultVectors';
import { fromCartesian } from '../../src/core/MomentTensor';
import { add, dot, length, sub } from '../../src/core/vec';
import type { MomentTensor } from '../../src/core/types';

const near0 = (x: number): boolean => Math.abs(x) < 1e-9;

const dcMatrix = (strike: number, dip: number, rake: number) => {
  const { normal: n, slip: u } = faultVectors({ strike, dip, rake });
  const mt: MomentTensor = fromCartesian({
    mxx: 2 * n[0] * u[0],
    myy: 2 * n[1] * u[1],
    mzz: 2 * n[2] * u[2],
    mxy: n[0] * u[1] + n[1] * u[0],
    mxz: n[0] * u[2] + n[2] * u[0],
    myz: n[1] * u[2] + n[2] * u[1],
  });
  return tensorMatrix(mt);
};

describe('fibonacciSphere', () => {
  it('returns ~count unit vectors', () => {
    const pts = fibonacciSphere(200);
    expect(pts.length).toBe(200);
    for (const p of pts) expect(length(p)).toBeCloseTo(1, 6);
  });
});

describe('waveDisplacement', () => {
  const M = dcMatrix(30, 60, 45);
  const n = fibonacciSphere(50)[17]!; // an arbitrary off-axis direction

  it('P is radial (parallel to n)', () => {
    const p = waveDisplacement(M, n, 'P');
    // p × n ≈ 0  ⇒  collinear
    const cx = p[1] * n[2] - p[2] * n[1];
    const cy = p[2] * n[0] - p[0] * n[2];
    const cz = p[0] * n[1] - p[1] * n[0];
    expect(near0(cx) && near0(cy) && near0(cz)).toBe(true);
  });

  it('S is transverse (perpendicular to n)', () => {
    const s = waveDisplacement(M, n, 'S');
    expect(dot(s, n)).toBeCloseTo(0, 9);
  });

  it('SH + SV reconstruct S', () => {
    const s = waveDisplacement(M, n, 'S');
    const sh = waveDisplacement(M, n, 'SH');
    const sv = waveDisplacement(M, n, 'SV');
    const recon = add(sh, sv);
    expect(length(sub(recon, s))).toBeCloseTo(0, 9);
  });

  it('SH is horizontal (no vertical component)', () => {
    const sh = waveDisplacement(M, n, 'SH');
    expect(sh[2]).toBeCloseTo(0, 9);
  });

  it('full = P + S', () => {
    const full = waveDisplacement(M, n, 'full');
    const p = waveDisplacement(M, n, 'P');
    const s = waveDisplacement(M, n, 'S');
    expect(length(sub(full, add(p, s)))).toBeCloseTo(0, 9);
  });
});
