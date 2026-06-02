/**
 * Draw a 2D lower-hemisphere focal-mechanism plot ("beachball") onto a Canvas
 * 2D context: the radiation pattern (same colors as the 3D sphere), the nodal
 * plane great circles, the P/T/N axis positions, and strike/dip labels by each
 * plane's strike line.
 *
 * Projection is Lambert equal-area (focal_block_2026.py:1608) on the lower
 * hemisphere (z ≤ 0, z = Up): a unit down-vector maps to v.xy / √(1 − v.z), with
 * the horizontal (z = 0) at radius 1. The inverse, for the per-pixel fill, is
 *   v = (px·√(2−r²), py·√(2−r²), r²−1),  r² = px²+py² ≤ 1.
 * The plot frame is North-up, East-right.
 */
import type { FocalSolution, Vec3 } from '../core/types';
import type { Mat3 } from '../core/MomentTensor';
import { tensorMatrix } from '../core/MomentTensor';
import { faultVectors } from '../core/faultVectors';
import { cross, normalize } from '../core/vec';
import type { WaveType } from '../config/defaults';
import { radiationRGB, waveAmplitude } from './radiation';

export interface BeachballStyle {
  contours: boolean;
  wave: WaveType;
  background: [number, number, number] | null; // RGB fill outside the disk, or transparent
  line: string; // stroke color for the disk + nodal curves
  text: string; // label color
}

/** Lower-hemisphere equal-area projection (z ≤ 0) → 2D [East, North], radius ≤ 1. */
function project(v: Vec3): [number, number] {
  const k = 1 / Math.sqrt(1 - v[2]);
  return [v[0] * k, v[1] * k];
}

export function drawBeachball(
  ctx: CanvasRenderingContext2D,
  size: number,
  solution: FocalSolution,
  style: BeachballStyle,
): void {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.39; // leave a margin for strike/dip labels
  const toCanvas = (v: Vec3): [number, number] => {
    const [px, py] = project(v);
    return [cx + px * R, cy - py * R];
  };

  // Normalized moment tensor (largest |eigenvalue| = 1), matching the 3D sphere.
  const [t, , p] = solution.eigen.values;
  const norm = Math.max(Math.abs(t), Math.abs(p), 1e-9);
  const raw = tensorMatrix(solution.tensor);
  const M = raw.map((x) => x / norm) as unknown as Mat3;

  // ── Radiation fill (per-pixel inverse projection) ────────────────────────────
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const bg = style.background;
  const R2 = R * R;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const idx = (j * size + i) * 4;
      const dx = i - cx;
      const dy = j - cy;
      const r2 = (dx * dx + dy * dy) / R2;
      if (r2 > 1) {
        if (bg) {
          data[idx] = bg[0];
          data[idx + 1] = bg[1];
          data[idx + 2] = bg[2];
          data[idx + 3] = 255;
        }
        continue;
      }
      const s = Math.sqrt(2 - r2);
      const v: Vec3 = [(dx / R) * s, (-dy / R) * s, r2 - 1];
      const amp = waveAmplitude(M, v, style.wave);
      const [cr, cg, cb] = radiationRGB(amp, style.wave, style.contours);
      data[idx] = cr;
      data[idx + 1] = cg;
      data[idx + 2] = cb;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // ── Disk outline ─────────────────────────────────────────────────────────────
  ctx.lineWidth = Math.max(1, size / 200);
  ctx.strokeStyle = style.line;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // ── Nodal plane great circles (lower hemisphere) ─────────────────────────────
  for (const plane of solution.planes) {
    const n = faultVectors(plane).normal;
    const ref: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = normalize(cross(n, ref));
    const w = cross(n, u);
    ctx.beginPath();
    let pen = false;
    for (let a = 0; a <= 360; a++) {
      const th = (a * Math.PI) / 180;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const d: Vec3 = [c * u[0] + sn * w[0], c * u[1] + sn * w[1], c * u[2] + sn * w[2]];
      if (d[2] > 1e-6) {
        pen = false;
        continue;
      }
      const [ix, iy] = toCanvas(d);
      if (pen) ctx.lineTo(ix, iy);
      else {
        ctx.moveTo(ix, iy);
        pen = true;
      }
    }
    ctx.stroke();
  }

  // ── P/T/N axes ───────────────────────────────────────────────────────────────
  ctx.fillStyle = style.text;
  ctx.font = `bold ${Math.round(size / 16)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, axis] of [
    ['P', solution.axes.P],
    ['T', solution.axes.T],
    ['N', solution.axes.N],
  ] as const) {
    const [ix, iy] = toCanvas(axis.vec);
    ctx.beginPath();
    ctx.arc(ix, iy, Math.max(2, size / 90), 0, Math.PI * 2);
    ctx.fillStyle = style.line;
    ctx.fill();
    ctx.fillStyle = style.text;
    ctx.fillText(label, ix, iy - size / 28);
  }

  // ── Strike/dip labels by each plane's strike line ────────────────────────────
  ctx.font = `${Math.round(size / 22)}px sans-serif`;
  for (const plane of solution.planes) {
    const a = (plane.strike * Math.PI) / 180;
    const ux = Math.sin(a); // East
    const uy = Math.cos(a); // North
    const lr = R * 1.14;
    const ix = cx + ux * lr;
    const iy = cy - uy * lr;
    ctx.textAlign = ux > 0.25 ? 'left' : ux < -0.25 ? 'right' : 'center';
    ctx.textBaseline = uy > 0.25 ? 'bottom' : uy < -0.25 ? 'top' : 'middle';
    ctx.fillText(`${Math.round(plane.strike)}°/${Math.round(plane.dip)}°`, ix, iy);
  }
}
