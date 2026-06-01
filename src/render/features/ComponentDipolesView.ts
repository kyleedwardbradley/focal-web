/**
 * The moment-tensor components as force dipoles: for each entry M_ij of the
 * tensor (in the E/N/U frame), a pair of arrows at ±offset along axis i pointing
 * along ±axis j, with length |M_ij|. Positive components point outward (a
 * dipole), negative inward. Ported from focal_block_2026.py:5062-5086.
 *
 * Dense by default (off in the Layers panel), this is the literal "what each
 * tensor component does" visualization.
 */
import { Group, type Object3D } from 'three';
import type { FocalSolution, Vec3 } from '../../core/types';
import { toCartesian } from '../../core/MomentTensor';
import { scale } from '../../core/vec';
import { COLORS, DIPOLE } from '../../config/appearance';
import { ArrowView, type ArrowSpec } from './ArrowView';
import type { FeatureView, RenderContext } from './FeatureView';

const E: Vec3 = [1, 0, 0];
const N: Vec3 = [0, 1, 0];
const U: Vec3 = [0, 0, 1];

/** Normalized E/N/U tensor components [exx, eyy, ezz, exy, exz, eyz]. */
function components(s: FocalSolution): number[] {
  const c = toCartesian(s.tensor);
  const max = Math.max(
    Math.abs(c.mxx),
    Math.abs(c.myy),
    Math.abs(c.mzz),
    Math.abs(c.mxy),
    Math.abs(c.mxz),
    Math.abs(c.myz),
    1e-9,
  );
  return [c.mxx / max, c.myy / max, c.mzz / max, c.mxy / max, c.mxz / max, c.myz / max];
}

interface Comp {
  axisI: Vec3; // row axis (offset direction)
  axisJ: Vec3; // column axis (arrow direction)
  color: number;
  value: (c: number[]) => number;
}

const DEFS: Comp[] = [
  { axisI: E, axisJ: E, color: COLORS.compE, value: (c) => c[0]! }, // EE
  { axisI: E, axisJ: N, color: COLORS.compE, value: (c) => c[3]! }, // EN
  { axisI: E, axisJ: U, color: COLORS.compE, value: (c) => c[4]! }, // EU
  { axisI: N, axisJ: N, color: COLORS.compN, value: (c) => c[1]! }, // NN
  { axisI: N, axisJ: E, color: COLORS.compN, value: (c) => c[3]! }, // NE
  { axisI: N, axisJ: U, color: COLORS.compN, value: (c) => c[5]! }, // NU
  { axisI: U, axisJ: U, color: COLORS.compU, value: (c) => c[2]! }, // UU
  { axisI: U, axisJ: E, color: COLORS.compU, value: (c) => c[4]! }, // UE
  { axisI: U, axisJ: N, color: COLORS.compU, value: (c) => c[5]! }, // UN
];

/** Build the two (outward + inward) arrow specs for one component. */
function specsFor(comp: Comp): ArrowSpec[] {
  const make = (side: number): ArrowSpec => ({
    color: comp.color,
    radius: DIPOLE.radius,
    headRadius: DIPOLE.headRadius,
    headLength: DIPOLE.headLength,
    select: (s) => {
      const v = comp.value(components(s));
      const length = Math.abs(v) * DIPOLE.scale;
      if (length <= 1e-6) return null;
      const sgn = Math.sign(v) * side;
      return {
        origin: scale(comp.axisI, DIPOLE.offset * side),
        dir: scale(comp.axisJ, sgn),
        length,
      };
    },
  });
  return [make(1), make(-1)];
}

export class ComponentDipolesView implements FeatureView {
  private readonly group = new Group();
  private readonly arrows: ArrowView[];

  constructor(parent: Object3D) {
    parent.add(this.group);
    this.arrows = DEFS.flatMap(specsFor).map((spec) => new ArrowView(this.group, spec));
  }

  update(solution: FocalSolution, ctx: RenderContext): void {
    for (const arrow of this.arrows) arrow.update(solution, ctx.scale);
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
