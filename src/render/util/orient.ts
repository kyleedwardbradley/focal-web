/** Bridge from the pure (E,N,U) `Vec3` tuples into Three.js, plus orientation helpers. */
import { Object3D, Vector3 } from 'three';
import type { Vec3 } from '../../core/types';

/** +Y is the canonical "along the arrow" axis for geometry built in this app. */
const ALONG = new Vector3(0, 1, 0);

export const toVector3 = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2]);

/** Rotate `obj` so its local +Y points along `dir` (need not be normalized). */
export function orientAlong(obj: Object3D, dir: Vec3): void {
  const v = toVector3(dir);
  if (v.lengthSq() === 0) return;
  v.normalize();
  obj.quaternion.setFromUnitVectors(ALONG, v);
}
