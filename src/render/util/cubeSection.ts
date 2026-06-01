/**
 * Intersection polygon of a plane through the origin (normal `n`) with the cube
 * [-half, half]³ — the cross-section used to cap a clipped cube block and to draw
 * the cut-fault patch. Returns the polygon vertices ordered around the normal
 * (3–6 of them), or [] if the plane misses the cube.
 *
 * Robust to axis-aligned planes that pass exactly through cube corners/edges:
 * corners lying on the plane (within an epsilon) are included directly, so the
 * result doesn't depend on floating-point noise. (A strict pa·pb<0 edge test
 * alone yields an empty polygon for those planes — e.g. the 45° planes of a
 * dip-slip mechanism.)
 */
import type { Vec3 } from '../../core/types';
import { cross, dot, normalize } from '../../core/vec';

export function cubePlaneSection(n: Vec3, half: number): Vec3[] {
  const fn = normalize(n);
  const eps = 1e-7 * half;

  const corners: Vec3[] = [];
  for (const x of [-half, half]) {
    for (const y of [-half, half]) {
      for (const z of [-half, half]) corners.push([x, y, z]);
    }
  }
  const d = corners.map((c) => dot(fn, c));

  const pts: Vec3[] = [];
  // Corners lying on the plane.
  for (let i = 0; i < 8; i++) {
    if (Math.abs(d[i]!) <= eps) pts.push(corners[i]!);
  }
  // Edge crossings, strictly on opposite sides (skip corners already on the plane).
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const a = corners[i]!;
      const b = corners[j]!;
      const differing = (a[0] !== b[0] ? 1 : 0) + (a[1] !== b[1] ? 1 : 0) + (a[2] !== b[2] ? 1 : 0);
      if (differing !== 1) continue; // not an edge
      const da = d[i]!;
      const db = d[j]!;
      if (da > eps && db < -eps) {
        const t = da / (da - db);
        pts.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]);
      } else if (da < -eps && db > eps) {
        const t = da / (da - db);
        pts.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]);
      }
    }
  }

  // Deduplicate near-coincident points (a corner can coincide with a crossing).
  const uniq: Vec3[] = [];
  for (const p of pts) {
    if (!uniq.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < eps * 100)) uniq.push(p);
  }
  if (uniq.length < 3) return [];

  // Order the points by angle in the cut plane.
  const ref: Vec3 = Math.abs(fn[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = normalize(cross(fn, ref));
  const v = cross(fn, u);
  return uniq.sort((p, q) => Math.atan2(dot(p, v), dot(p, u)) - Math.atan2(dot(q, v), dot(q, u)));
}
