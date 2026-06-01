/**
 * A compass ring beneath the focal sphere, with a North marker. Static — it
 * doesn't depend on the moment tensor — but implements FeatureView so the scene
 * and the Layers panel can treat it uniformly. The source used a textured
 * compass disc (compass_green.png); this is a lightweight procedural stand-in.
 */
import {
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { COLORS, COMPASS } from '../../config/appearance';
import { circlePositions } from '../util/circle';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView } from './FeatureView';

export class CompassView implements FeatureView {
  private readonly group = new Group();
  private readonly material: LineMaterial;
  private readonly northMaterial: MeshStandardMaterial;

  constructor(parent: Object3D) {
    this.material = new LineMaterial({ color: COLORS.compass, linewidth: COMPASS.width });
    this.material.resolution.set(window.innerWidth, window.innerHeight);

    const geo = new LineGeometry();
    geo.setPositions(circlePositions([0, 0, 1], COMPASS.radius, 96, [0, 0, COMPASS.depth]));
    const ring = new Line2(geo, this.material);
    ring.computeLineDistances();

    // North marker: a small cone at +N on the ring, pointing North (+Y).
    this.northMaterial = new MeshStandardMaterial({ color: COLORS.compassNorth, roughness: 0.6 });
    const north = new Mesh(new ConeGeometry(0.06, 0.18, 16), this.northMaterial);
    north.position.set(0, COMPASS.radius, COMPASS.depth);

    this.group.add(ring, north);
    parent.add(this.group);

    window.addEventListener('resize', this.onResize);
  }

  update(): void {
    // Static — nothing to recompute.
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.material, opacity);
    applyOpacity(this.northMaterial, opacity);
  }

  private readonly onResize = (): void => {
    this.material.resolution.set(window.innerWidth, window.innerHeight);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    disposeObject(this.group);
  }
}
