/**
 * The HTML/SVG label overlay: a pointer-events-none layer over the WebGL canvas
 * holding the callout lines (SVG) and the label text (divs). Reconciles by id
 * each frame so DOM nodes persist across frames (no flicker, cheap updates).
 *
 * Labels are HTML, so they always face the user and stay crisp.
 */
import './labels.css';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface PlacedLabel {
  id: string;
  text: string;
  color: number;
  x: number; // label center, px
  y: number;
  line: { x1: number; y1: number; x2: number; y2: number } | null;
  visible: boolean; // false → fade out (e.g. occluded)
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

export class LabelOverlay {
  readonly el: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly divs = new Map<string, HTMLDivElement>();
  private readonly lines = new Map<string, SVGLineElement>();

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'label-overlay';
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'label-lines');
    this.el.append(this.svg);
  }

  render(placed: PlacedLabel[]): void {
    const seen = new Set<string>();

    for (const p of placed) {
      seen.add(p.id);

      // Callout line (offset style only, when visible).
      if (p.line && p.visible) {
        let line = this.lines.get(p.id);
        if (!line) {
          line = document.createElementNS(SVG_NS, 'line');
          this.lines.set(p.id, line);
          this.svg.append(line);
        }
        line.setAttribute('x1', String(p.line.x1));
        line.setAttribute('y1', String(p.line.y1));
        line.setAttribute('x2', String(p.line.x2));
        line.setAttribute('y2', String(p.line.y2));
        line.style.opacity = '0.7'; // stroke color is uniform white (CSS)
      } else {
        this.lines.get(p.id)?.style.setProperty('opacity', '0');
      }

      // Text.
      let div = this.divs.get(p.id);
      if (!div) {
        div = document.createElement('div');
        div.className = 'label-text';
        this.divs.set(p.id, div);
        this.el.append(div);
      }
      if (div.textContent !== p.text) div.textContent = p.text;
      div.style.color = hex(p.color);
      // Don't move a fading-out label (avoids a slide while it disappears).
      if (p.visible) div.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`;
      div.style.opacity = p.visible ? '1' : '0';
    }

    // Fade out anything not placed this frame.
    for (const [id, div] of this.divs) if (!seen.has(id)) div.style.opacity = '0';
    for (const [id, line] of this.lines) if (!seen.has(id)) line.style.opacity = '0';
  }
}
