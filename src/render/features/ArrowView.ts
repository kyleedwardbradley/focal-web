/**
 * A reusable solid arrow (cylinder shaft + cone head), the workhorse of this
 * app — strike/dip/normal/slip vectors and the T/N/P axes are all instances of
 * it. The arrow is built once pointing along +Y; on each `update()` it only
 * reorients (quaternion) and rescales the shaft, keeping the head a constant
 * size. No geometry is reallocated, so updates are effectively free.
 */
import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three';
import type { FocalSolution, Vec3 } from '../../core/types';
import { GEOM } from '../../config/appearance';
import { orientAlong } from '../util/orient';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';

export interface ArrowSpec {
  color: number;
  radius?: number;
  headRadius?: number;
  headLength?: number;
  /**
   * Pull the direction + length (and optional base position) for this arrow out
   * of the solution, or null to hide. `origin` defaults to the center.
   */
  select: (s: FocalSolution) => { dir: Vec3; length: number; origin?: Vec3 } | null;
}

/** A single arrow. Not a top-level FeatureView — its parent group governs visibility. */
export class ArrowView {
  private readonly group = new Group();
  private readonly shaft: Mesh;
  private readonly head: Mesh;
  private readonly material: MeshStandardMaterial;
  private readonly headLength: number;
  private readonly select: ArrowSpec['select'];

  constructor(parent: Object3D, spec: ArrowSpec) {
    this.select = spec.select;
    const radius = spec.radius ?? GEOM.arrowRadius;
    const headRadius = spec.headRadius ?? GEOM.headRadius;
    this.headLength = spec.headLength ?? GEOM.headLength;

    const material = new MeshStandardMaterial({ color: spec.color, roughness: 0.5, metalness: 0.1 });
    this.material = material;

    // Shaft: unit-height cylinder with its base at the origin (scales upward in Y).
    const shaftGeo = new CylinderGeometry(radius, radius, 1, 20);
    shaftGeo.translate(0, 0.5, 0);
    this.shaft = new Mesh(shaftGeo, material);

    // Head: cone with its base at the origin, apex at +headLength.
    const headGeo = new ConeGeometry(headRadius, this.headLength, 20);
    headGeo.translate(0, this.headLength / 2, 0);
    this.head = new Mesh(headGeo, material);

    this.group.add(this.shaft, this.head);
    parent.add(this.group);
  }

  /** `lengthScale` multiplies the arrow length (for magnitude-sized arrows). */
  update(solution: FocalSolution, lengthScale = 1): void {
    const spec = this.select(solution);
    const length = spec ? spec.length * lengthScale : 0;
    if (!spec || length <= 0) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const shaftLength = Math.max(length - this.headLength, 1e-3);
    this.shaft.scale.y = shaftLength;
    this.head.position.y = shaftLength;

    const o = spec.origin;
    this.group.position.set(o ? o[0] : 0, o ? o[1] : 0, o ? o[2] : 0);
    orientAlong(this.group, spec.dir);
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.material, opacity);
  }

  dispose(): void {
    disposeObject(this.group);
  }
}
