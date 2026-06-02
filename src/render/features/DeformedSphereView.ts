/**
 * The displacement field — a sphere whose vertices are pushed radially by the
 * P-wave amplitude, turning it into the classic four-lobed radiation surface
 * (focal_block_2026.py:5210-5220). The displacement is done in the vertex shader
 * (no geometry rebuild), and the surface is colored by the current wave's
 * radiation pattern. The displacement magnitude tracks the global Scale.
 *
 * Off by default (it overlaps the focal sphere); toggle the focal sphere off to
 * see it cleanly.
 */
import { DoubleSide, Group, IcosahedronGeometry, Matrix3, Mesh, type Object3D } from 'three';
import type { FocalSolution } from '../../core/types';
import type { WaveType } from '../../config/defaults';
import { tensorMatrix } from '../../core/MomentTensor';
import { DEFORM } from '../../config/appearance';
import { createRadiationMaterial, type RadiationMaterial } from '../materials/radiationMaterial';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView, RenderContext } from './FeatureView';

export class DeformedSphereView implements FeatureView {
  private readonly group = new Group();
  private readonly geometry: IcosahedronGeometry;
  private readonly mat: RadiationMaterial;
  private readonly scratch = new Matrix3();

  constructor(parent: Object3D) {
    this.geometry = new IcosahedronGeometry(1, DEFORM.detail);
    this.mat = createRadiationMaterial({ displace: true });
    this.mat.material.side = DoubleSide;

    const mesh = new Mesh(this.geometry, this.mat.material);
    mesh.renderOrder = -1; // paint first, like the focal sphere (stable transparency)
    this.group.add(mesh);
    this.group.visible = false; // off by default
    parent.add(this.group);
  }

  update(solution: FocalSolution, ctx: RenderContext): void {
    // Same normalization as the focal sphere (largest |eigenvalue| → 1).
    const [t, , p] = solution.eigen.values;
    const norm = Math.max(Math.abs(t), Math.abs(p), 1e-9);
    const m = tensorMatrix(solution.tensor);
    this.scratch.set(
      m[0] / norm, m[1] / norm, m[2] / norm,
      m[3] / norm, m[4] / norm, m[5] / norm,
      m[6] / norm, m[7] / norm, m[8] / norm,
    );
    this.mat.setTensor(this.scratch);
    this.mat.setDisplace(ctx.scale * DEFORM.coef);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.mat.material, opacity);
  }

  setWave(wave: WaveType): void {
    this.mat.setWave(wave);
  }

  setContours(on: boolean): void {
    this.mat.setContours(on);
  }

  dispose(): void {
    disposeObject(this.group);
  }
}
