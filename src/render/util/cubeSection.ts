/**
 * Intersection polygon of a plane through the origin (normal `n`) with the cube
 * [-half, half]³ — the cross-section used to cap a clipped cube block. Returns
 * the polygon vertices ordered around the normal (3–6 of them), or [] if the
 * plane misses the cube.
 */
import type { Vec3 } from '../../core/types';
import { add, cross, dot, normalize, scale, sub } from '../../core/vec';

export function cubePlaneSection(n: Vec3, half: number): Vec3[] {
  const fn = normalize(n);

  const corners: Vec3[] = [];
  for (const x of [-half, half]) {
    for (const y of [-half, half]) {
      for (const z of [-half, half]) corners.push([x, y, z]);
    }
  }

  // Intersect the plane (fn·p = 0) with each cube edge (corners differing in one axis).
  const pts: Vec3[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const a = corners[i]!;
      const b = corners[j]!;
      const differing = (a[0] !== b[0] ? 1 : 0) + (a[1] !== b[1] ? 1 : 0) + (a[2] !== b[2] ? 1 : 0);
      if (differing !== 1) continue; // not an edge
      const pa = dot(fn, a);
      const pb = dot(fn, b);
      if (pa * pb < 0) pts.push(add(a, scale(sub(b, a), pa / (pa - pb))));
    }
  }
  if (pts.length < 3) return [];

  // Order the points by angle in the cut plane.
  const ref: Vec3 = Math.abs(fn[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = normalize(cross(fn, ref));
  const v = cross(fn, u);
  return pts.sort((p, q) => Math.atan2(dot(p, v), dot(p, u)) - Math.atan2(dot(q, v), dot(q, u)));
}
