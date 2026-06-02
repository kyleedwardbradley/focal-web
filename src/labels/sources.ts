/**
 * Label sources: given the current solution and which layers are labeled,
 * produce the list of labels with their 3D anchor points (world space, the
 * scene is origin-centered with identity transforms).
 *
 * Phase-1 scope (core set): XYZ axes (E/N/Up, at-end), the fault vectors
 * (Strike/Dip/Normal/Slip), and the T/N/P principal axes.
 */
import { Vector3 } from 'three';
import type { FocalSolution, Vec3 } from '../core/types';
import type { LayerKey } from '../config/defaults';
import { GEOM } from '../config/appearance';

export type LabelStyle = 'at-end' | 'offset';

export interface LabelSpec {
  id: string;
  text: string;
  style: LabelStyle;
  anchor: Vector3;
  color: number;
}

const tip = (v: Vec3, s: number): Vector3 => new Vector3(v[0] * s, v[1] * s, v[2] * s);

const AXIS_LEN = 2; // matches AxesHelper(2)

export function collectLabels(
  solution: FocalSolution,
  labels: Record<LayerKey, boolean>,
): LabelSpec[] {
  const out: LabelSpec[] = [];

  if (labels.axes) {
    out.push({ id: 'ax-e', text: 'E', style: 'at-end', anchor: new Vector3(AXIS_LEN, 0, 0), color: 0xff5a5a });
    out.push({ id: 'ax-n', text: 'N', style: 'at-end', anchor: new Vector3(0, AXIS_LEN, 0), color: 0x5aff7a });
    out.push({ id: 'ax-up', text: 'Up', style: 'at-end', anchor: new Vector3(0, 0, AXIS_LEN), color: 0x5a8aff });
  }

  if (labels.faultVectors) {
    const v = solution.vectors;
    const L = GEOM.vectorLength;
    out.push({ id: 'fv-strike', text: 'Strike', style: 'offset', anchor: tip(v.strike, L), color: 0xff0a0a });
    out.push({ id: 'fv-dip', text: 'Dip', style: 'offset', anchor: tip(v.dip, L), color: 0x280ac8 });
    out.push({ id: 'fv-normal', text: 'Normal', style: 'offset', anchor: tip(v.normal, L), color: 0x9b30ff });
    out.push({ id: 'fv-slip', text: 'Slip', style: 'offset', anchor: tip(v.slip, L), color: 0x3cff3c });
  }

  if (labels.principalAxes) {
    const L = GEOM.tnpLength;
    out.push({ id: 'pa-t', text: 'T', style: 'offset', anchor: tip(solution.axes.T.vec, L), color: 0xff8c00 });
    out.push({ id: 'pa-n', text: 'N', style: 'offset', anchor: tip(solution.axes.N.vec, L), color: 0xdddddd });
    out.push({ id: 'pa-p', text: 'P', style: 'offset', anchor: tip(solution.axes.P.vec, L), color: 0x1e90ff });
  }

  return out;
}
