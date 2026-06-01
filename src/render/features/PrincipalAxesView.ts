/**
 * The principal stress axes T, N, P (eigenvectors of the moment tensor), drawn
 * as arrows. Grouping over the reusable ArrowView.
 */
import { Group, type Object3D } from 'three';
import type { FocalSolution } from '../../core/types';
import { COLORS, GEOM } from '../../config/appearance';
import { ArrowView, type ArrowSpec } from './ArrowView';
import type { FeatureView } from './FeatureView';

const SPECS: ArrowSpec[] = [
  { color: COLORS.tAxis, select: (s) => ({ dir: s.axes.T.vec, length: GEOM.tnpLength }) },
  { color: COLORS.nAxis, select: (s) => ({ dir: s.axes.N.vec, length: GEOM.tnpLength }) },
  { color: COLORS.pAxis, select: (s) => ({ dir: s.axes.P.vec, length: GEOM.tnpLength }) },
];

export class PrincipalAxesView implements FeatureView {
  private readonly group = new Group();
  private readonly arrows: ArrowView[];

  constructor(parent: Object3D) {
    parent.add(this.group);
    this.arrows = SPECS.map((spec) => new ArrowView(this.group, spec));
  }

  update(solution: FocalSolution): void {
    for (const arrow of this.arrows) arrow.update(solution);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    for (const arrow of this.arrows) arrow.setOpacity(opacity);
  }

  dispose(): void {
    for (const arrow of this.arrows) arrow.dispose();
    this.group.removeFromParent();
  }
}
