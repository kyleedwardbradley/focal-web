/**
 * The far-field displacement vector field: small gray arrows at Fibonacci-spiral
 * sample points on the focal sphere, each pointing in the displacement direction
 * for the selected wave mode (P / S / SV / SH / full) with length ∝ magnitude.
 *
 * Rendered as a single InstancedMesh of a merged "arrow" geometry, so hundreds of
 * arrows cost one draw call and the count is cheap to adjust. The physics lives
 * in core/waveField; this view only places instances.
 */
import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FocalSolution, Vec3 } from '../../core/types';
import { type Mat3, tensorMatrix } from '../../core/MomentTensor';
import { fibonacciSphere, waveDisplacement, type FieldMode } from '../../core/waveField';
import { length as vlen } from '../../core/vec';
import { FIELD } from '../../config/appearance';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView, RenderContext } from './FeatureView';

const UP = new Vector3(0, 1, 0);

export class DisplacementFieldView implements FeatureView {
  private readonly group = new Group();
  private readonly geometry;
  private readonly material: MeshStandardMaterial;
  private readonly mesh: InstancedMesh;

  private points: Vec3[] = [];
  private mode: FieldMode = 'full';
  private count = -1;

  // Scratch objects reused per instance to avoid per-frame allocation.
  private readonly m4 = new Matrix4();
  private readonly quat = new Quaternion();
  private readonly pos = new Vector3();
  private readonly dir = new Vector3();
  private readonly scl = new Vector3();

  constructor(parent: Object3D) {
    // A unit arrow along +Y (length 1, base at the origin): shaft + cone head.
    const shaft = new CylinderGeometry(FIELD.radius, FIELD.radius, 0.78, 8);
    shaft.translate(0, 0.39, 0);
    const head = new ConeGeometry(FIELD.headRadius, 0.22, 8);
    head.translate(0, 0.89, 0);
    this.geometry = mergeGeometries([shaft, head])!;

    this.material = new MeshStandardMaterial({ color: FIELD.color, roughness: 0.6 });
    this.mesh = new InstancedMesh(this.geometry, this.material, FIELD.maxCount);
    this.mesh.count = 0;
    this.group.add(this.mesh);
    this.group.visible = false; // off by default
    parent.add(this.group);
  }

  /** Mode/count come from options (render state), set before each update. */
  setField(mode: FieldMode, count: number): void {
    this.mode = mode;
    if (count !== this.count) {
      this.count = count;
      this.points = fibonacciSphere(Math.min(count, FIELD.maxCount));
      this.mesh.count = this.points.length;
    }
  }

  update(solution: FocalSolution, ctx: RenderContext): void {
    if (this.points.length === 0) return;

    // Normalize the tensor (largest |eigenvalue| → 1), matching the spheres.
    const [t, , p] = solution.eigen.values;
    const inv = 1 / Math.max(Math.abs(t), Math.abs(p), 1e-9);
    const r = tensorMatrix(solution.tensor);
    const M: Mat3 = [
      r[0] * inv, r[1] * inv, r[2] * inv,
      r[3] * inv, r[4] * inv, r[5] * inv,
      r[6] * inv, r[7] * inv, r[8] * inv,
    ];
    const lenScale = ctx.scale * FIELD.coef;

    for (let i = 0; i < this.points.length; i++) {
      const n = this.points[i]!;
      const d = waveDisplacement(M, n, this.mode);
      const len = vlen(d) * lenScale;
      if (len < 1e-5) {
        this.scl.set(0, 0, 0); // collapse near-zero arrows
        this.m4.compose(this.pos.set(0, 0, 0), this.quat, this.scl);
      } else {
        this.dir.set(d[0], d[1], d[2]).normalize();
        this.quat.setFromUnitVectors(UP, this.dir);
        this.pos.set(n[0], n[1], n[2]); // base on the unit sphere
        this.scl.set(1, len, 1); // stretch along the arrow axis only
        this.m4.compose(this.pos, this.quat, this.scl);
      }
      this.mesh.setMatrixAt(i, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.material, opacity);
  }

  dispose(): void {
    disposeObject(this.group);
  }
}
