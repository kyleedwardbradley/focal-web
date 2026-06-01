import { describe, it, expect } from 'vitest';
import { decompose, applyComponents } from '../../src/core/decompose';
import { faultVectors } from '../../src/core/faultVectors';
import { fromCartesian } from '../../src/core/MomentTensor';
import type { MomentTensor } from '../../src/core/types';

const dcTensor = (strike: number, dip: number, rake: number): MomentTensor => {
  const { normal: n, slip: u } = faultVectors({ strike, dip, rake });
  return fromCartesian({
    mxx: 2 * n[0] * u[0],
    myy: 2 * n[1] * u[1],
    mzz: 2 * n[2] * u[2],
    mxy: n[0] * u[1] + n[1] * u[0],
    mxz: n[0] * u[2] + n[2] * u[0],
    myz: n[1] * u[2] + n[2] * u[1],
  });
};

describe('decompose', () => {
  it('pure double couple → ~100% DC', () => {
    const d = decompose(dcTensor(30, 60, 45));
    expect(d.percent.dc).toBeCloseTo(100, 4);
    expect(d.percent.iso).toBeCloseTo(0, 4);
    expect(d.percent.clvd).toBeCloseTo(0, 4);
  });

  it('pure explosion → ~100% ISO', () => {
    const d = decompose({ mrr: 1, mtt: 1, mpp: 1, mrt: 0, mrp: 0, mtp: 0 });
    expect(d.percent.iso).toBeCloseTo(100, 4);
  });

  it('pure CLVD (2,-1,-1) → ~100% CLVD', () => {
    // Deviatoric, trace 0, so no ISO; eigenvalues 2,-1,-1 ⇒ no DC.
    const d = decompose({ mrr: 2, mtt: -1, mpp: -1, mrt: 0, mrp: 0, mtp: 0 });
    expect(d.percent.clvd).toBeCloseTo(100, 4);
    expect(d.percent.iso).toBeCloseTo(0, 4);
  });
});

describe('applyComponents', () => {
  const mt = dcTensor(123, 37, -112);

  it('all components selected returns the original tensor unchanged', () => {
    expect(applyComponents(mt, { iso: true, dc: true, clvd: true })).toEqual(mt);
  });

  it('DC-only of a pure DC source is ~unchanged', () => {
    const filtered = applyComponents(mt, { iso: false, dc: true, clvd: false });
    for (const k of ['mrr', 'mtt', 'mpp', 'mrt', 'mrp', 'mtp'] as const) {
      expect(filtered[k]).toBeCloseTo(mt[k], 6);
    }
  });

  it('removing all components yields a null tensor', () => {
    const filtered = applyComponents(mt, { iso: false, dc: false, clvd: false });
    for (const k of ['mrr', 'mtt', 'mpp', 'mrt', 'mrp', 'mtp'] as const) {
      expect(filtered[k]).toBeCloseTo(0, 9);
    }
  });

  it('ISO + DC + CLVD parts sum back to the original tensor', () => {
    const mixed: MomentTensor = { mrr: 0.5, mtt: 0.5, mpp: -1, mrt: 0.8, mrp: 0.3, mtp: 0 };
    const d = decompose(mixed);
    const sum = applyComponents(mixed, { iso: true, dc: true, clvd: true });
    // (all-true short-circuits; verify the parts themselves reconstruct it)
    const recon = {
      mrr: d.isoTensor.mrr + d.dcTensor.mrr + d.clvdTensor.mrr,
      mtt: d.isoTensor.mtt + d.dcTensor.mtt + d.clvdTensor.mtt,
      mpp: d.isoTensor.mpp + d.dcTensor.mpp + d.clvdTensor.mpp,
      mrt: d.isoTensor.mrt + d.dcTensor.mrt + d.clvdTensor.mrt,
      mrp: d.isoTensor.mrp + d.dcTensor.mrp + d.clvdTensor.mrp,
      mtp: d.isoTensor.mtp + d.dcTensor.mtp + d.clvdTensor.mtp,
    };
    expect(sum).toEqual(mixed);
    for (const k of ['mrr', 'mtt', 'mpp', 'mrt', 'mrp', 'mtp'] as const) {
      expect(recon[k]).toBeCloseTo(mixed[k], 6);
    }
  });
});
