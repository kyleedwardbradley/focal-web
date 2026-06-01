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
import type { FeatureView, RenderContext } from './features/FeatureView';

/** Layers the scene owns ('axes' is the Viewer's XYZ helper, handled there). */
type SceneLayer = Exclude<LayerKey, 'axes'>;

export class FocalScene {
  readonly root = new Group();
  private readonly views: Record<SceneLayer, FeatureView>;
  private readonly sphere: FocalSphereView;
  private readonly deformed: DeformedSphereView;
  private readonly field: DisplacementFieldView;

  constructor(parent: Object3D) {
    parent.add(this.root);
    this.sphere = new FocalSphereView(this.root);
    this.deformed = new DeformedSphereView(this.root);
    this.field = new DisplacementFieldView(this.root);
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
    };
  }

  /** Push a freshly derived solution (+ render context) to every feature view. */
  update(solution: FocalSolution, ctx: RenderContext): void {
    for (const view of Object.values(this.views)) view.update(solution, ctx);
  }

  /** Set the body wave that colors the focal + deformed spheres. */
  setWave(wave: WaveType): void {
    this.sphere.setWave(wave);
    this.deformed.setWave(wave);
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
    // Don't cap the sphere's cut when a fault-surface layer is shown: the cap
    // would otherwise z-fight the coplanar fault plane / cut-fault patch, and we
    // want those surfaces visible through the opening instead.
    this.sphere.setCapsEnabled(!visibility.faultPlane && !visibility.cutFault);
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
