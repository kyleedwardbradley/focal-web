/**
 * CPU mirror of the radiation shader (src/shaders/radiationGLSL.ts) for the 2D
 * beachball plot — same amplitudes and colors so the plot matches the 3D sphere.
 */
import type { WaveType } from '../config/defaults';
import type { Vec3 } from '../core/types';
import type { Mat3 } from '../core/MomentTensor';
import { cross, dot, length, scale, sub } from '../core/vec';
import { RADIATION, WAVE_PALETTE } from '../config/appearance';

export type RGB = [number, number, number];

const matVec = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

/** nᵀMn (P) / ‖t‖ (S) / t·ẑ (SV) / t·(n×ẑ) (SH), t = Mn − (nᵀMn)n. */
export function waveAmplitude(m: Mat3, n: Vec3, wave: WaveType): number {
  const mn = matVec(m, n);
  const p = dot(n, mn);
  if (wave === 'P') return p;
  const t = sub(mn, scale(n, p));
  if (wave === 'S') return length(t);
  if (wave === 'SV') return t[2];
  return dot(t, cross(n, [0, 0, 1]));
}

const rgb = (hex: number): RGB => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** S-wave stepped ramp (matches GLSL sRamp), returned as 0–255. */
function sRamp(f: number): RGB {
  if (f < 0.17) return [0, 18, 255];
  if (f < 0.34) return [130, 15, 138];
  if (f < 0.5) return [194, 15, 79];
  if (f < 0.69) return [255, 31, 43];
  return [255, 0, 0];
}

export function radiationRGB(amp: number, wave: WaveType, contours: boolean): RGB {
  if (wave === 'S') return sRamp(clamp01(amp * 0.5));

  const pal = WAVE_PALETTE[wave];
  let col = amp >= 0 ? rgb(pal.compressive) : rgb(pal.tensile);
  if (contours) {
    const fac = clamp01((amp + 1) * 0.5);
    const f10 = fac * 10;
    const nearest = Math.round(f10);
    const dist = Math.abs(f10 - nearest);
    const halfw = RADIATION.contourWidth * 5;
    if (dist < halfw && nearest > 0.5 && nearest < 9.5 && Math.abs(nearest - 5) > 0.5) {
      col = amp >= 0 ? rgb(pal.posContour) : rgb(pal.negContour);
    }
  }
  return col;
}
