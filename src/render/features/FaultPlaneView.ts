/**
 * The fault plane with slickensides — a disc lying in the primary nodal plane,
 * textured with slip striations oriented along the slip vector (the source's
 * `make_focal_fault`, focal_block_2026.py:5228-5279). Two coincident faces (the
 * two block surfaces): the +normal face stays fixed, the −normal face slides
 * with slip, exposing the striated fault surface.
 *
 * Orientation: the disc's local +Z is the fault normal and its local +X is the
 * slip direction, so the texture's horizontal striations run along slip.
 */
import {
  CircleGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';
import type { FocalSolution, Vec3 } from '../../core/types';
import { GEOM } from '../../config/appearance';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import slickTextureUrl from '../../assets/slickenlines.png';
import type { FeatureView } from './FeatureView';

const toV3 = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2]);
const EPS = 0.004; // tiny normal offset so the two faces don't z-fight at slip 0

export class FaultPlaneView implements FeatureView {
  private readonly group = new Group();
  private readonly geometry: CircleGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly fixedFace: Mesh;
  private readonly slipFace: Mesh;
  private readonly basis = new Matrix4();
  private readonly xAxis = new Vector3();
  private readonly perp = new Vector3();

  constructor(parent: Object3D) {
    const texture = new TextureLoader().load(slickTextureUrl);
    texture.colorSpace = SRGBColorSpace;

    // Unlit, so the striae read full-bright from both sides regardless of lighting.
    this.geometry = new CircleGeometry(GEOM.sphereRadius, 64);
    this.material = new MeshBasicMaterial({ map: texture, side: DoubleSide });

    this.fixedFace = new Mesh(this.geometry, this.material);
    this.slipFace = new Mesh(this.geometry, this.material);
    this.group.add(this.fixedFace, this.slipFace);
    this.group.visible = false; // off by default
    parent.add(this.group);
  }

  update(solution: FocalSolution): void {
    const fn = toV3(solution.vectors.normal).normalize();
    const slipDir = toV3(solution.vectors.slip).normalize();

    // Orthonormal fault-plane basis: X = slip, Y = in-plane perpendicular, Z = normal.
    this.perp.crossVectors(fn, slipDir).normalize();
    this.xAxis.crossVectors(this.perp, fn).normalize();
    this.basis.makeBasis(this.xAxis, this.perp, fn);
    this.fixedFace.quaternion.setFromRotationMatrix(this.basis);
    this.slipFace.quaternion.copy(this.fixedFace.quaternion);

    // +normal face fixed; −normal face slides by −slip·slipVector. Tiny normal
    // offsets separate the coincident faces.
    const displacement = toV3(solution.vectors.slip).multiplyScalar(-solution.slip);
    this.fixedFace.position.copy(fn).multiplyScalar(EPS);
    this.slipFace.position.copy(displacement).addScaledVector(fn, -EPS);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.material, opacity);
  }

  dispose(): void {
    disposeObject(this.group);
    this.geometry.dispose();
  }
}
