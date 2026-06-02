/**
 * The focal sphere: a unit sphere painted with the moment-tensor radiation
 * pattern, cut along the fault plane into two halves that slide apart with slip.
 *
 * Porting strategy (the plan's "one hard feature"): rather than re-bisecting a
 * mesh on every change (as the Blender script does with `bmesh.bisect`), each
 * half is a full sphere clipped by a world-space plane whose normal is the fault
 * normal. Changing the mechanism = setting a plane normal + a uniform; sliding
 * the block = translating it and moving its clip plane with it. No geometry is
 * rebuilt when the tensor or slip changes.
 *
 * The cut is left open (the DoubleSide material reveals the interior); the fault
 * surface itself is shown by the Cut fault / Fault plane layers, which is why we
 * don't fill the cut with a cap (it only ever z-fought those coplanar surfaces).
 *
 * Slip convention matches the source (focal_block_2026.py:5187-5207, 3458):
 * the +normal half stays fixed; the −normal half translates by −slip·slipVector.
 */
import { DoubleSide, Group, Matrix3, Mesh, type Object3D, Plane, SphereGeometry, Vector3 } from 'three';
import type { FocalSolution, Vec3 } from '../../core/types';
import type { WaveType } from '../../config/defaults';
import { tensorMatrix } from '../../core/MomentTensor';
import { GEOM } from '../../config/appearance';
import { createRadiationMaterial, type RadiationMaterial } from '../materials/radiationMaterial';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView } from './FeatureView';

const toVec3 = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2]);

export class FocalSphereView implements FeatureView {
  private readonly group = new Group();
  private readonly geometry: SphereGeometry;
  private readonly fixedHalf: Mesh;
  private readonly slipHalf: Mesh;
  private readonly fixedMat: RadiationMaterial;
  private readonly slipMat: RadiationMaterial;
  private readonly fixedPlane = new Plane(new Vector3(0, 0, 1), 0);
  private readonly slipPlane = new Plane(new Vector3(0, 0, -1), 0);
  private readonly scratch = new Matrix3();

  constructor(parent: Object3D) {
    this.geometry = new SphereGeometry(GEOM.sphereRadius, 96, 64);

    this.fixedMat = createRadiationMaterial();
    this.slipMat = createRadiationMaterial();
    // DoubleSide so the open cut face reveals the interior once the halves part.
    for (const m of [this.fixedMat.material, this.slipMat.material]) m.side = DoubleSide;
    this.fixedMat.material.clippingPlanes = [this.fixedPlane];
    this.slipMat.material.clippingPlanes = [this.slipPlane];

    this.fixedHalf = new Mesh(this.geometry, this.fixedMat.material);
    this.slipHalf = new Mesh(this.geometry, this.slipMat.material);
    // The translucent sphere paints first, so co-centered transparent layers
    // (nodal surfaces, etc.) render on top of it deterministically — no
    // angle-dependent sort flicker.
    this.fixedHalf.renderOrder = -1;
    this.slipHalf.renderOrder = -1;

    this.group.add(this.fixedHalf, this.slipHalf);
    parent.add(this.group);
  }

  update(solution: FocalSolution): void {
    // Normalize the tensor so the largest |eigenvalue| is 1 → amplitude ∈ [-1, 1].
    const [t, , p] = solution.eigen.values;
    const norm = Math.max(Math.abs(t), Math.abs(p), 1e-9);
    const m = tensorMatrix(solution.tensor);
    this.scratch.set(
      m[0] / norm, m[1] / norm, m[2] / norm,
      m[3] / norm, m[4] / norm, m[5] / norm,
      m[6] / norm, m[7] / norm, m[8] / norm,
    );
    this.fixedMat.setTensor(this.scratch);
    this.slipMat.setTensor(this.scratch);

    // Cut + slide along the fault.
    const fn = toVec3(solution.vectors.normal); // fault normal
    const displacement = toVec3(solution.vectors.slip).multiplyScalar(-solution.slip);

    // Fixed half keeps the +normal side, cut through the origin.
    this.fixedHalf.position.set(0, 0, 0);
    this.fixedPlane.set(fn, 0);

    // Slip half keeps the −normal side and travels with its clip plane.
    this.slipHalf.position.copy(displacement);
    this.slipPlane.set(fn.clone().negate(), fn.dot(displacement));
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.fixedMat.material, opacity);
    applyOpacity(this.slipMat.material, opacity);
  }

  setWave(wave: WaveType): void {
    this.fixedMat.setWave(wave);
    this.slipMat.setWave(wave);
  }

  setContours(on: boolean): void {
    this.fixedMat.setContours(on);
    this.slipMat.setContours(on);
  }

  dispose(): void {
    // disposeObject frees both halves' materials (and the shared geometry).
    disposeObject(this.group);
  }
}
