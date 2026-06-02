/**
 * The lower-hemisphere focal mechanism plotted onto the compass plane below the
 * sphere (the source's compass beachball). The 2D beachball is drawn to an
 * offscreen canvas and applied as a texture to a horizontal disc, so it shares
 * exactly the panel's rendering (radiation colors, nodal curves, P/T/N axes,
 * strike/dip labels).
 */
import {
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  SRGBColorSpace,
} from 'three';
import type { FocalSolution } from '../../core/types';
import type { WaveType } from '../../config/defaults';
import { COMPASS } from '../../config/appearance';
import { drawBeachball } from '../../plot/beachball';
import { disposeObject } from '../util/disposable';
import { applyOpacity } from '../util/opacity';
import type { FeatureView } from './FeatureView';

const TEX = 256;

export class CompassFocalView implements FeatureView {
  private readonly group = new Group();
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: CanvasTexture;
  private readonly material: MeshBasicMaterial;
  private last: FocalSolution | null = null;
  private contours = true;
  private wave: WaveType = 'P';

  constructor(parent: Object3D) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = TEX;
    this.canvas.height = TEX;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;

    // CircleGeometry lies in the XY (East/North) plane, normal +Z (Up) → flat on
    // the compass. Sized so the beachball (0.78 of the canvas) ≈ focalRadius.
    const geo = new CircleGeometry(COMPASS.focalRadius / 0.78, 64);
    this.material = new MeshBasicMaterial({ map: this.texture, transparent: true, side: DoubleSide });
    const mesh = new Mesh(geo, this.material);
    mesh.position.set(0, 0, COMPASS.depth + 0.02);
    this.group.add(mesh);
    this.group.visible = false; // off by default
    parent.add(this.group);
  }

  update(solution: FocalSolution): void {
    this.last = solution;
    this.redraw();
  }

  setContours(on: boolean): void {
    this.contours = on;
    this.redraw();
  }

  setWave(wave: WaveType): void {
    this.wave = wave;
    this.redraw();
  }

  private redraw(): void {
    if (!this.last) return;
    drawBeachball(this.ctx, TEX, this.last, {
      contours: this.contours,
      wave: this.wave,
      background: null, // transparent outside the disc
      line: '#111111',
      text: '#111111',
    });
    this.texture.needsUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setOpacity(opacity: number): void {
    applyOpacity(this.material, opacity);
  }

  dispose(): void {
    disposeObject(this.group);
    this.texture.dispose();
  }
}
