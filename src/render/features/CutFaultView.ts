/**
 * The fault plane as a polygon patch (`make_cut_fault`, focal_block_2026.py:5416-5458):
 * the fault plane clipped to the unit cube — i.e. the cube/plane cross-section —
 * drawn as a translucent red surface. Unlike the slickensided fault disc, this
 * is a single fixed patch showing the fault's extent through the cube.
 *
 * Geometry is the same cross-section polygon used for the fault-block cap,
 * fan-triangulated from the origin and rebuilt when the fault normal changes.
 */
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import type { FocalSolution, Vec3 } from '../../core/types';
import { BLOCK, COLORS } from '../../config/appearance';
import { cubePlaneSection } from '../util/cubeSection';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView } from './FeatureView';

function fanGeometry(pts: Vec3[]): BufferGeometry {
  const geo = new BufferGeometry();
  if (pts.length < 3) {
    geo.setAttribute('position', new Float32BufferAttribute([], 3));
    return geo;
  }
  const position = [0, 0, 0]; // fan center (origin lies in the cut plane)
  for (const p of pts) position.push(p[0], p[1], p[2]);
  const index: number[] = [];
  const n = pts.length;
  for (let i = 1; i <= n; i++) index.push(0, i, i === n ? 1 : i + 1);
  geo.setAttribute('position', new Float32BufferAttribute(position, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

export class CutFaultView implements FeatureView {
  private readonly group = new Group();
  private readonly material: MeshStandardMaterial;
  private readonly mesh: Mesh;
  private geo: BufferGeometry = fanGeometry([]);

  constructor(parent: Object3D) {
    // polygonOffset pulls the patch slightly toward the camera so it renders
    // cleanly on top of coplanar surfaces (the nodal surfaces / sphere cut)
    // instead of z-fighting them.
    this.material = new MeshStandardMaterial({
      color: COLORS.faultPoly,
      roughness: 0.8,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new Mesh(this.geo, this.material);
    this.mesh.renderOrder = 1; // translucent; paint after the sphere (stable order)
    this.group.add(this.mesh);
    this.group.visible = false; // off by default
    parent.add(this.group);
  }

  update(solution: FocalSolution): void {
    this.geo.dispose();
    this.geo = fanGeometry(cubePlaneSection(solution.vectors.normal, BLOCK.half));
    this.mesh.geometry = this.geo;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.material, opacity);
  }

  dispose(): void {
    disposeObject(this.group);
    this.geo.dispose();
  }
}
