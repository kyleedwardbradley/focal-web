import { describe, it, expect } from 'vitest';
import { cubePlaneSection } from '../../src/render/util/cubeSection';
import type { Vec3 } from '../../src/core/types';

describe('cubePlaneSection', () => {
  // Regression: a dip-slip mechanism's 45° nodal planes are axis-aligned (x = ∓z),
  // so the cut plane passes exactly through cube corners. A strict pa·pb<0 edge
  // test alone returns an empty polygon (the "cut fault disappears on flip" bug).
  it('handles axis-aligned planes through cube corners', () => {
    const planes: Vec3[] = [
      [-Math.SQRT1_2, 0, -Math.SQRT1_2],
      [Math.SQRT1_2, 0, -Math.SQRT1_2],
      [0, 0, 1],
      [1, 0, 0],
    ];
    for (const n of planes) {
      const poly = cubePlaneSection(n, 1);
      expect(poly.length).toBeGreaterThanOrEqual(3);
      for (const p of poly) {
        // on the plane, and within the cube
        expect(Math.abs(n[0] * p[0] + n[1] * p[1] + n[2] * p[2])).toBeLessThan(1e-6);
        expect(Math.max(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]))).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('handles a generic oblique plane', () => {
    const poly = cubePlaneSection([0.3, 0.5, 0.8], 1);
    expect(poly.length).toBeGreaterThanOrEqual(3);
  });
});
