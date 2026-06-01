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
 * Slip convention matches the source (focal_block_2026.py:5187-5207, 3458):
 * the +normal half stays fixed; the −normal half translates by −slip·slipVector.
 */
import {
  CircleGeometry,
  DoubleSide,
  Group,
  Matrix3,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Plane,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { FocalSolution, Vec3 } from '../../core/types';
import type { WaveType } from '../../config/defaults';
import { tensorMatrix } from '../../core/MomentTensor';
import { COLORS, GEOM } from '../../config/appearance';
import { createRadiationMaterial, type RadiationMaterial } from '../materials/radiationMaterial';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView } from './FeatureView';

const toVec3 = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2]);
const Z_AXIS = new Vector3(0, 0, 1);

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

  // Flat discs that cap the exposed cut faces once the halves slide apart.
  private readonly capGeometry: CircleGeometry;
  private readonly capMaterial: MeshStandardMaterial;
  private readonly fixedCap: Mesh;
  private readonly slipCap: Mesh;
  private readonly capQuat = new Quaternion();
  private capsEnabled = true; // suppressed when the fault plane is shown
  private lastParted = false;

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

    // The cut passes through each half's center, so the cap is a full unit disc
    // in the plane perpendicular to the fault normal. Unclipped and neutral-colored.
    // The cap stays opaque (solid "rock interior"), independent of sphere opacity.
    this.capGeometry = new CircleGeometry(GEOM.sphereRadius, 96);
    this.capMaterial = new MeshStandardMaterial({
      color: COLORS.cutFace,
      roughness: 0.9,
      side: DoubleSide,
    });
    this.fixedCap = new Mesh(this.capGeometry, this.capMaterial);
    this.slipCap = new Mesh(this.capGeometry, this.capMaterial);

    this.group.add(this.fixedHalf, this.slipHalf, this.fixedCap, this.slipCap);
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

    // Caps fill the exposed faces (disc normal = fault normal). Only visible
    // once the blocks have parted, and not when the fault plane is being shown.
    this.capQuat.setFromUnitVectors(Z_AXIS, fn);
    for (const cap of [this.fixedCap, this.slipCap]) cap.quaternion.copy(this.capQuat);
    this.fixedCap.position.set(0, 0, 0);
    this.slipCap.position.copy(displacement);
    this.lastParted = solution.slip > 1e-4;
    this.applyCapVisibility();
  }

  /** Suppress the cut caps (e.g. so the fault-plane surface shows through the cut). */
  setCapsEnabled(enabled: boolean): void {
    this.capsEnabled = enabled;
    this.applyCapVisibility();
  }

  private applyCapVisibility(): void {
    const visible = this.lastParted && this.capsEnabled;
    this.fixedCap.visible = visible;
    this.slipCap.visible = visible;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.fixedMat.material, opacity);
    applyOpacity(this.slipMat.material, opacity);
    // capMaterial intentionally left opaque.
  }

  setWave(wave: WaveType): void {
    this.fixedMat.setWave(wave);
    this.slipMat.setWave(wave);
  }

  dispose(): void {
    // disposeObject frees both halves' materials (and the shared geometry).
    disposeObject(this.group);
  }
}
