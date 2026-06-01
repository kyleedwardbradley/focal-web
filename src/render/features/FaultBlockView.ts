/**
 * The displaced cube — the fault-block representation. A cube cut by the fault
 * plane into two blocks that slide apart with slip (focal_block_2026.py:5282-5411).
 * The +normal block stays fixed; the −normal block translates by −slip·slipVector.
 *
 * Faces carry the source's flatcolors_labeled cube-net texture (unlit, like the
 * Blender emission material). The cube halves are GPU-clipped; the exposed cut
 * faces are capped with the cube/plane cross-section polygon, and a thick
 * wireframe (Line2) traces the clipped cube edges + the cut-face polygon.
 */
import {
  BoxGeometry,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  Plane,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { FocalSolution, Vec3 } from '../../core/types';
import { BLOCK } from '../../config/appearance';
import { cubePlaneSection } from '../util/cubeSection';
import { cubeHalfWireframe } from '../util/cubeWireframe';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import blockTextureUrl from '../../assets/flatcolors_labeled.png';
import type { FeatureView } from './FeatureView';

const toVec3 = (v: Vec3): Vector3 => new Vector3(v[0], v[1], v[2]);

/**
 * Cube-net cells (u0, v0) for each BoxGeometry face — order px,nx,py,ny,pz,nz =
 * East, West, North, South, Up, Down. Each cell is 0.25×0.25; opposite faces map
 * to opposite cells, and the compass sits on the Up face.
 */
const CELLS: ReadonlyArray<readonly [number, number]> = [
  [0.375, 0.75], // +X East
  [0.375, 0.25], // -X West
  [0.375, 0.5], // +Y North
  [0.375, 0.0], // -Y South
  [0.625, 0.5], // +Z Up (compass)
  [0.125, 0.5], // -Z Down
];
const CELL = 0.25;

/** A box whose per-face UVs sample the cross-net cells. */
function texturedBox(): BoxGeometry {
  const geo = new BoxGeometry(BLOCK.half * 2, BLOCK.half * 2, BLOCK.half * 2);
  const uv = geo.getAttribute('uv');
  for (let f = 0; f < 6; f++) {
    const [u0, v0] = CELLS[f]!;
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, u0 + uv.getX(i) * CELL, v0 + uv.getY(i) * CELL);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

/** Fan-triangulate the cut cross-section from the origin. */
function capGeometry(pts: Vec3[]): BufferGeometry {
  const geo = new BufferGeometry();
  if (pts.length < 3) {
    geo.setAttribute('position', new Float32BufferAttribute([], 3));
    return geo;
  }
  const position = [0, 0, 0];
  for (const p of pts) position.push(p[0], p[1], p[2]);
  const index: number[] = [];
  const n = pts.length;
  for (let i = 1; i <= n; i++) index.push(0, i, i === n ? 1 : i + 1);
  geo.setAttribute('position', new Float32BufferAttribute(position, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

export class FaultBlockView implements FeatureView {
  private readonly group = new Group();
  private readonly boxGeometry = texturedBox();
  private readonly fixedMat: MeshBasicMaterial;
  private readonly slipMat: MeshBasicMaterial;
  private readonly capMaterial: MeshStandardMaterial;
  private readonly wireMaterial: LineMaterial;
  private readonly fixedHalf: Mesh;
  private readonly slipHalf: Mesh;
  private readonly fixedCap: Mesh;
  private readonly slipCap: Mesh;
  private readonly fixedWire: LineSegments2;
  private readonly slipWire: LineSegments2;
  private readonly fixedPlane = new Plane(new Vector3(0, 0, 1), 0);
  private readonly slipPlane = new Plane(new Vector3(0, 0, -1), 0);
  private capGeo: BufferGeometry = capGeometry([]);

  constructor(parent: Object3D) {
    const texture = new TextureLoader().load(blockTextureUrl);
    texture.colorSpace = SRGBColorSpace;

    const faceMat = () =>
      new MeshBasicMaterial({
        map: texture,
        side: DoubleSide,
        polygonOffset: true, // push faces back so the wireframe reads cleanly
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
    this.fixedMat = faceMat();
    this.slipMat = faceMat();
    this.fixedMat.clippingPlanes = [this.fixedPlane];
    this.slipMat.clippingPlanes = [this.slipPlane];

    this.fixedHalf = new Mesh(this.boxGeometry, this.fixedMat);
    this.slipHalf = new Mesh(this.boxGeometry, this.slipMat);

    this.capMaterial = new MeshStandardMaterial({ color: BLOCK.cutFace, roughness: 0.9, side: DoubleSide });
    this.fixedCap = new Mesh(this.capGeo, this.capMaterial);
    this.slipCap = new Mesh(this.capGeo, this.capMaterial);

    this.wireMaterial = new LineMaterial({ color: BLOCK.edgeColor, linewidth: BLOCK.edgeWidth });
    this.wireMaterial.resolution.set(window.innerWidth, window.innerHeight);
    this.fixedWire = new LineSegments2(new LineSegmentsGeometry(), this.wireMaterial);
    this.slipWire = new LineSegments2(new LineSegmentsGeometry(), this.wireMaterial);

    this.group.add(
      this.fixedHalf,
      this.slipHalf,
      this.fixedCap,
      this.slipCap,
      this.fixedWire,
      this.slipWire,
    );
    this.group.visible = false; // alternative representation, off by default
    parent.add(this.group);

    window.addEventListener('resize', this.onResize);
  }

  update(solution: FocalSolution): void {
    const fn = toVec3(solution.vectors.normal);
    const displacement = toVec3(solution.vectors.slip).multiplyScalar(-solution.slip);

    this.fixedHalf.position.set(0, 0, 0);
    this.fixedPlane.set(fn, 0);
    this.slipHalf.position.copy(displacement);
    this.slipPlane.set(fn.clone().negate(), fn.dot(displacement));

    // Cut-face caps.
    this.capGeo.dispose();
    this.capGeo = capGeometry(cubePlaneSection(solution.vectors.normal, BLOCK.half));
    this.fixedCap.geometry = this.capGeo;
    this.slipCap.geometry = this.capGeo;
    this.fixedCap.position.set(0, 0, 0);
    this.slipCap.position.copy(displacement);
    const parted = solution.slip > 1e-4;
    this.fixedCap.visible = parted;
    this.slipCap.visible = parted;

    // Wireframe: clipped cube edges + cut polygon, per half.
    this.setWire(this.fixedWire, cubeHalfWireframe(solution.vectors.normal, BLOCK.half, 1));
    this.fixedWire.position.set(0, 0, 0);
    this.setWire(this.slipWire, cubeHalfWireframe(solution.vectors.normal, BLOCK.half, -1));
    this.slipWire.position.copy(displacement);
  }

  private setWire(wire: LineSegments2, positions: number[]): void {
    if (positions.length === 0) {
      wire.visible = false;
      return;
    }
    wire.visible = true;
    (wire.geometry as LineSegmentsGeometry).setPositions(positions);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.fixedMat, opacity);
    applyOpacity(this.slipMat, opacity);
    applyOpacity(this.capMaterial, opacity);
    applyOpacity(this.wireMaterial, opacity);
  }

  private readonly onResize = (): void => {
    this.wireMaterial.resolution.set(window.innerWidth, window.innerHeight);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    disposeObject(this.group);
    this.boxGeometry.dispose();
    this.capGeo.dispose();
  }
}
