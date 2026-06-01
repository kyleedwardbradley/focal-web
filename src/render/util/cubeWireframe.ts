/**
 * Edge segments of a cube half — the cube [-half, half]³ clipped to one side of
 * the plane through the origin (normal `n`, kept where `side·(n·p) ≥ 0`), plus
 * the cut-face polygon edges. Returns a flat [x,y,z, x,y,z, ...] array of segment
 * endpoints suitable for LineSegmentsGeometry.setPositions.
 */
import type { Vec3 } from '../../core/types';
import { dot, normalize } from '../../core/vec';
import { cubePlaneSection } from './cubeSection';

export function cubeHalfWireframe(n: Vec3, half: number, side: number): number[] {
  const fn = normalize(n);

  const corners: Vec3[] = [];
  for (const x of [-half, half]) {
    for (const y of [-half, half]) {
      for (const z of [-half, half]) corners.push([x, y, z]);
    }
  }

  const seg: number[] = [];
  const push = (a: Vec3, b: Vec3): void => {
    seg.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  };

  // Cube edges, each clipped to the kept half-space.
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const a = corners[i]!;
      const b = corners[j]!;
      const differing = (a[0] !== b[0] ? 1 : 0) + (a[1] !== b[1] ? 1 : 0) + (a[2] !== b[2] ? 1 : 0);
      if (differing !== 1) continue; // not an edge
      const va = side * dot(fn, a);
      const vb = side * dot(fn, b);
      if (va >= 0 && vb >= 0) {
        push(a, b);
      } else if (va < 0 && vb < 0) {
        continue;
      } else {
        const t = va / (va - vb);
        const p: Vec3 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
        if (va >= 0) push(a, p);
        else push(p, b);
      }
    }
  }

  // Cut-face polygon edges.
  const poly = cubePlaneSection(n, half);
  for (let i = 0; i < poly.length; i++) push(poly[i]!, poly[(i + 1) % poly.length]!);

  return seg;
}
