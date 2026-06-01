/**
 * Builds a MeshStandardMaterial whose base color is the moment-tensor radiation
 * pattern, computed per fragment in GLSL. Using a standard material (rather than
 * a raw ShaderMaterial) means lighting, shadows, and clipping-plane support come
 * for free — we only inject the amplitude→color override.
 *
 * The returned handle exposes `setTensor()` so the sphere view can push a new
 * (normalized) moment tensor as a single `uniform mat3` update — no geometry
 * rebuild when the tensor changes.
 */
import { Color, type IUniform, Matrix3, MeshStandardMaterial } from 'three';
import { RADIATION, WAVE_PALETTE } from '../../config/appearance';
import type { WaveType } from '../../config/defaults';
import {
  FRAG_DECL,
  VERT_BODY,
  VERT_DECL,
  VERT_DISPLACE_BODY,
  VERT_DISPLACE_DECL,
} from '../../shaders/radiationGLSL';

export interface RadiationMaterial {
  material: MeshStandardMaterial;
  /** Update the radiation pattern from a normalized moment-tensor matrix (row-major, ENU). */
  setTensor(matrix: Matrix3): void;
  /** Switch the body wave (P/S/SV/SH) — sets the amplitude mode + polarity palette. */
  setWave(wave: WaveType): void;
  /** Set the radial P-wave displacement factor (deformed sphere; 0 = no deform). */
  setDisplace(factor: number): void;
}

export interface RadiationOptions {
  /** Displace vertices radially by the P-wave amplitude (the deformed sphere). */
  displace?: boolean;
}

export function createRadiationMaterial(options: RadiationOptions = {}): RadiationMaterial {
  const uniforms: Record<string, IUniform> = {
    uM: { value: new Matrix3() },
    uWave: { value: WAVE_PALETTE.P.index },
    uDisplace: { value: 0 },
    uCompressive: { value: new Color(RADIATION.compressive) },
    uTensile: { value: new Color(RADIATION.tensile) },
    uPosContour: { value: new Color(RADIATION.posContour) },
    uNegContour: { value: new Color(RADIATION.negContour) },
    uContours: { value: RADIATION.showContours ? 1 : 0 },
    uContourWidth: { value: RADIATION.contourWidth },
  };

  // Opacity/transparency are managed per-layer via applyOpacity().
  const material = new MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.0,
    opacity: RADIATION.opacity,
  });

  const vertDecl = options.displace ? `${VERT_DECL}${VERT_DISPLACE_DECL}` : VERT_DECL;
  const vertBody = options.displace ? `${VERT_BODY}${VERT_DISPLACE_BODY}` : VERT_BODY;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `${vertDecl}\nvoid main() {`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>${vertBody}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${FRAG_DECL}\nvoid main() {`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = radiationColor();');
  };

  return {
    material,
    setTensor(matrix: Matrix3): void {
      (uniforms.uM!.value as Matrix3).copy(matrix);
    },
    setWave(wave: WaveType): void {
      const p = WAVE_PALETTE[wave];
      uniforms.uWave!.value = p.index;
      (uniforms.uCompressive!.value as Color).set(p.compressive);
      (uniforms.uTensile!.value as Color).set(p.tensile);
      (uniforms.uPosContour!.value as Color).set(p.posContour);
      (uniforms.uNegContour!.value as Color).set(p.negContour);
    },
    setDisplace(factor: number): void {
      uniforms.uDisplace!.value = factor;
    },
  };
}
