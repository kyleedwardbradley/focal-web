import { describe, it, expect } from 'vitest';
import { faultVectors } from '../../src/core/faultVectors';
import type { Vec3 } from '../../src/core/types';

const expectVecClose = (got: Vec3, want: Vec3, eps = 1e-4): void => {
  expect(got[0]).toBeCloseTo(want[0], 4);
  expect(got[1]).toBeCloseTo(want[1], 4);
  expect(got[2]).toBeCloseTo(want[2], 4);
  void eps;
};

const R2 = Math.SQRT1_2; // 1/√2

/**
 * Pin the seismological slip convention (rr = -(rake + 180)°): the along-strike
 * component is negated relative to the dip component. Regression guard for the
 * "strike-slip renders backwards" bug — the pipeline round-trip tests can't
 * catch it because they build M from this same slip vector and only assert
 * geometric properties (orthogonality, plane normals), not slip sense.
 */
describe('faultVectors — slip convention', () => {
  it('rake 0 (strike-slip): slip is anti-parallel to strike', () => {
    const { strike, slip } = faultVectors({ strike: 0, dip: 90, rake: 0 });
    expectVecClose(strike, [0, 1, 0]); // North
    expectVecClose(slip, [0, -1, 0]); // South — the negated along-strike sense
  });

  it('rake 90 (pure thrust): slip equals the dip vector (dip-slip is unaffected)', () => {
    const { dip, slip } = faultVectors({ strike: 0, dip: 45, rake: 90 });
    expectVecClose(slip, dip);
    expectVecClose(slip, [R2, 0, -R2]);
  });

  it('oblique (rake 45): both components carry their convention signs', () => {
    const { slip } = faultVectors({ strike: 0, dip: 90, rake: 45 });
    // strike=(0,1,0), dip=(0,0,-1) ⇒ slip = -strike·cos45 + dip·sin45
    expectVecClose(slip, [0, -R2, -R2]);
  });

  it('slip stays a unit vector perpendicular to the fault normal', () => {
    const { slip, normal } = faultVectors({ strike: 123, dip: 37, rake: -112 });
    expect(Math.hypot(slip[0], slip[1], slip[2])).toBeCloseTo(1, 6);
    expect(slip[0] * normal[0] + slip[1] * normal[1] + slip[2] * normal[2]).toBeCloseTo(0, 6);
  });
});
