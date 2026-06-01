/**
 * The nodal surfaces — the 3D surfaces where P-wave amplitude is zero. For a
 * non-double-couple source these are conical funnels swept from the origin out
 * to the nodal curve on the focal sphere (and its antipode); for a pure DC they
 * collapse to the nodal planes.
 *
 * Built as a triangle fan from the origin to the 361-point nodal curve (scaled
 * ×1.1), exactly as the source (focal_block_2026.py:4776-4803). Fixed topology
 * (362 vertices, 360 triangles), so updates just rewrite the position buffer.
 * Colored the source's pink (Mat_NodalSurface).
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import type { FocalSolution } from '../../core/types';
import { COLORS, GEOM } from '../../config/appearance';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView } from './FeatureView';

const SAMPLES = 361; // curve points (vertices 1..361; vertex 0 is the origin)
const VERTS = SAMPLES + 1;
const RADIUS = GEOM.sphereRadius * 1.1;

/** Triangle fan: center (0) → consecutive curve points, closing the loop. */
function fanIndices(): Uint16Array {
  const idx: number[] = [];
  for (let k = 0; k < 360; k++) {
    idx.push(0, 1 + k, 1 + ((k + 1) % 360));
  }
  return new Uint16Array(idx);
}

export class NodalSurfacesView implements FeatureView {
  private readonly group = new Group();
  private readonly material: MeshStandardMaterial;
  private readonly surface: Mesh;
  private readonly antipode: Mesh;
  private readonly surfacePos: BufferAttribute;
  private readonly antipodePos: BufferAttribute;

  constructor(parent: Object3D) {
    this.material = new MeshStandardMaterial({
      color: COLORS.nodalSurface,
      roughness: 0.6,
      side: DoubleSide,
    });

    const index = fanIndices();
    this.surfacePos = new BufferAttribute(new Float32Array(VERTS * 3), 3);
    this.antipodePos = new BufferAttribute(new Float32Array(VERTS * 3), 3);

    const surfaceGeo = new BufferGeometry();
    surfaceGeo.setAttribute('position', this.surfacePos);
    surfaceGeo.setIndex(new BufferAttribute(index, 1));
    const antipodeGeo = new BufferGeometry();
    antipodeGeo.setAttribute('position', this.antipodePos);
    antipodeGeo.setIndex(new BufferAttribute(index.slice(), 1));

    this.surface = new Mesh(surfaceGeo, this.material);
    this.antipode = new Mesh(antipodeGeo, this.material);
    // Render after the translucent spheres so the sort order is stable (see below).
    this.surface.renderOrder = 1;
    this.antipode.renderOrder = 1;
    this.group.add(this.surface, this.antipode);
    parent.add(this.group);
  }

  update(solution: FocalSolution): void {
    const ns = solution.nodalSurface;
    this.surface.visible = ns.exists;
    this.antipode.visible = ns.exists;
    if (!ns.exists) return;

    const a = this.surfacePos.array as Float32Array;
    const b = this.antipodePos.array as Float32Array;
    for (let i = 0; i < SAMPLES; i++) {
      const e = ns.xe[i]! * RADIUS;
      const n = ns.xn[i]! * RADIUS;
      const z = ns.xz[i]! * RADIUS;
      const v = (1 + i) * 3; // vertex 0 is the origin (left at 0,0,0)
      a[v] = e;
      a[v + 1] = n;
      a[v + 2] = z;
      b[v] = -e;
      b[v + 1] = -n;
      b[v + 2] = -z;
    }
    this.surfacePos.needsUpdate = true;
    this.antipodePos.needsUpdate = true;
    this.surface.geometry.computeVertexNormals();
    this.antipode.geometry.computeVertexNormals();
    this.surface.geometry.computeBoundingSphere();
    this.antipode.geometry.computeBoundingSphere();
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
