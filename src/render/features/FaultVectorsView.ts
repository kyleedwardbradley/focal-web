/**
 * The fault-geometry arrows of the primary nodal plane: strike, dip, normal,
 * and slip. A thin grouping over the reusable ArrowView — each arrow just
 * reorients/rescales on update.
 */
import { Group, type Object3D } from 'three';
import type { FocalSolution } from '../../core/types';
import { COLORS, GEOM } from '../../config/appearance';
import { ArrowView, type ArrowSpec } from './ArrowView';
import type { FeatureView } from './FeatureView';

const SPECS: ArrowSpec[] = [
  { color: COLORS.strike, select: (s) => ({ dir: s.vectors.strike, length: GEOM.vectorLength }) },
  { color: COLORS.dip, select: (s) => ({ dir: s.vectors.dip, length: GEOM.vectorLength }) },
  { color: COLORS.normal, select: (s) => ({ dir: s.vectors.normal, length: GEOM.vectorLength }) },
  { color: COLORS.slip, select: (s) => ({ dir: s.vectors.slip, length: GEOM.vectorLength }) },
];

export class FaultVectorsView implements FeatureView {
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
