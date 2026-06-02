/**
 * The 2D focal-mechanism plot in the upper-right corner. Subscribes to the store
 * and redraws the lower-hemisphere beachball (white background) on every change.
 */
import type { Store } from '../state/store';
import { drawBeachball } from '../plot/beachball';
import './beachball.css';

const DISPLAY = 230; // CSS px

export class BeachballPanel {
  readonly el: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backing: number;

  constructor(private readonly store: Store) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.backing = Math.round(DISPLAY * dpr);

    this.el = document.createElement('div');
    this.el.className = 'beachball-panel';

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.backing;
    this.canvas.height = this.backing;
    this.canvas.style.width = `${DISPLAY}px`;
    this.canvas.style.height = `${DISPLAY}px`;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.el.append(this.canvas);

    this.store.subscribe((solution, state) => {
      const on = state.options.beachballPanel;
      this.el.style.display = on ? '' : 'none';
      if (!on) return;
      drawBeachball(this.ctx, this.backing, solution, {
        contours: state.options.contours,
        wave: state.options.wave,
        background: [255, 255, 255],
        line: '#111111',
        text: '#111111',
      });
    });
  }
}
