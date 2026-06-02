/**
 * Owns the focal-mechanism feature views and fans `update()` / visibility /
 * opacity out to them. This is the consumer side of the seam: it receives a
 * FocalSolution + render context and knows nothing about how they were computed.
 * Adding a new visual = one entry here keyed by its LayerKey.
 */
import { Group, type Object3D } from 'three';
import type { FocalSolution } from '../core/types';
import type { LayerKey, WaveType } from '../config/defaults';
import type { FieldMode } from '../core/waveField';
import { FocalSphereView } from './features/FocalSphereView';
import { DeformedSphereView } from './features/DeformedSphereView';
import { FaultBlockView } from './features/FaultBlockView';
import { FaultPlaneView } from './features/FaultPlaneView';
import { CutFaultView } from './features/CutFaultView';
import { DisplacementFieldView } from './features/DisplacementFieldView';
import { NodalSurfacesView } from './features/NodalSurfacesView';
import { FaultVectorsView } from './features/FaultVectorsView';
import { PrincipalAxesView } from './features/PrincipalAxesView';
import { ComponentDipolesView } from './features/ComponentDipolesView';
import { CompassView } from './features/CompassView';
import { CompassFocalView } from './features/CompassFocalView';
import type { FeatureView, RenderContext } from './features/FeatureView';

/** Layers the scene owns ('axes' is the Viewer's XYZ helper, handled there). */
type SceneLayer = Exclude<LayerKey, 'axes'>;

export class FocalScene {
  readonly root = new Group();
  private readonly views: Record<SceneLayer, FeatureView>;
  private readonly sphere: FocalSphereView;
  private readonly deformed: DeformedSphereView;
  private readonly field: DisplacementFieldView;
  private readonly compassFocal: CompassFocalView;

  constructor(parent: Object3D) {
    parent.add(this.root);
    this.sphere = new FocalSphereView(this.root);
    this.deformed = new DeformedSphereView(this.root);
    this.field = new DisplacementFieldView(this.root);
    this.compassFocal = new CompassFocalView(this.root);
    this.views = {
      sphere: this.sphere,
      deformedSphere: this.deformed,
      faultBlock: new FaultBlockView(this.root),
      faultPlane: new FaultPlaneView(this.root),
      cutFault: new CutFaultView(this.root),
      displacementField: this.field,
      nodalSurfaces: new NodalSurfacesView(this.root),
      faultVectors: new FaultVectorsView(this.root),
      principalAxes: new PrincipalAxesView(this.root),
      componentDipoles: new ComponentDipolesView(this.root),
      compass: new CompassView(this.root),
      compassFocal: this.compassFocal,
    };
  }

  /** Push a freshly derived solution (+ render context) to every feature view. */
  update(solution: FocalSolution, ctx: RenderContext): void {
    for (const view of Object.values(this.views)) view.update(solution, ctx);
  }

  /** Set the body wave that colors the focal + deformed spheres + compass plot. */
  setWave(wave: WaveType): void {
    this.sphere.setWave(wave);
    this.deformed.setWave(wave);
    this.compassFocal.setWave(wave);
  }

  /** Toggle amplitude contour bands on the spheres + compass plot. */
  setContours(on: boolean): void {
    this.sphere.setContours(on);
    this.deformed.setContours(on);
    this.compassFocal.setContours(on);
  }

  /** Set the displacement-field mode + sample count. */
  setField(mode: FieldMode, count: number): void {
    this.field.setField(mode, count);
  }

  /** Apply per-layer visibility (ignores 'axes', which the Viewer owns). */
  applyVisibility(visibility: Record<LayerKey, boolean>): void {
    for (const key of Object.keys(this.views) as SceneLayer[]) {
      this.views[key].setVisible(visibility[key]);
    }
  }

  /** Apply per-layer opacity (ignores 'axes', which the Viewer owns). */
  applyOpacity(opacity: Record<LayerKey, number>): void {
    for (const key of Object.keys(this.views) as SceneLayer[]) {
      this.views[key].setOpacity(opacity[key]);
    }
  }

  dispose(): void {
    for (const view of Object.values(this.views)) view.dispose();
    this.root.removeFromParent();
  }
}
