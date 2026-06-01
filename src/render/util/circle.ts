/** Generate a closed circle as a flat [x,y,z,...] position array, in a plane
 *  perpendicular to `axis`, centered at `center`. Used for principal-axis
 *  circles and the compass ring. */
import type { Vec3 } from '../../core/types';
import { cross, normalize } from '../../core/vec';

export function circlePositions(
  axis: Vec3,
  radius: number,
  segments: number,
  center: Vec3 = [0, 0, 0],
): number[] {
  const a = normalize(axis);
  // Any reference not parallel to the axis, to seed an in-plane basis.
  const ref: Vec3 = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = normalize(cross(a, ref));
  const v = cross(a, u); // unit (a ⟂ u, both unit)

  const out: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const c = Math.cos(t) * radius;
    const s = Math.sin(t) * radius;
    out.push(
      center[0] + c * u[0] + s * v[0],
      center[1] + c * u[1] + s * v[1],
      center[2] + c * u[2] + s * v[2],
    );
  }
  return out;
}
