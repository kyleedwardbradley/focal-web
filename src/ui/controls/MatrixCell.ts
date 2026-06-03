/**
 * One moment-tensor cell: a number with a center-origin slider behind it. Drag
 * horizontally to set the value (left = −max, center = 0, right = +max); click
 * to type an exact value. The fill grows from the center; its color shows sign.
 */
export interface MatrixCellOptions {
  label: string;
  value: number;
  max: number; // |range|, e.g. 9.99
  onChange: (value: number) => void;
}

const fmt = (v: number): string => v.toFixed(2);

export class MatrixCell {
  readonly el: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private value: number;
  private down = false;
  private dragging = false;
  private startX = 0;

  constructor(private readonly opts: MatrixCellOptions) {
    this.value = opts.value;

    this.el = document.createElement('div');
    this.el.className = 'matrix-cell';

    this.fill = document.createElement('div');
    this.fill.className = 'matrix-cell-fill';

    const tag = document.createElement('span');
    tag.className = 'matrix-cell-tag';
    tag.textContent = opts.label;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'matrix-cell-num';
    this.input.value = fmt(this.value);
    this.input.addEventListener('change', () => this.commitTyped());
    this.input.addEventListener('blur', () => this.commitTyped());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.input.blur();
    });

    this.el.append(this.fill, tag, this.input);
    this.updateFill();

    this.el.addEventListener('pointerdown', this.onDown);
    this.el.addEventListener('pointermove', this.onMove);
    this.el.addEventListener('pointerup', this.onUp);
    this.el.addEventListener('pointercancel', this.onUp);
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.down = true;
    this.dragging = false;
    this.startX = e.clientX;
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (!this.down) return;
    if (!this.dragging && Math.abs(e.clientX - this.startX) > 3) {
      this.dragging = true;
      this.el.setPointerCapture(e.pointerId);
      this.input.blur();
    }
    if (this.dragging) this.setFromPointer(e.clientX);
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (!this.down) return;
    this.down = false;
    if (this.dragging) {
      this.el.releasePointerCapture(e.pointerId);
    } else if (document.activeElement !== this.input) {
      this.input.focus();
      this.input.select();
    }
  };

  private setFromPointer(clientX: number): void {
    const rect = this.el.getBoundingClientRect();
    const frac = (clientX - rect.left) / rect.width;
    this.commit((frac * 2 - 1) * this.opts.max);
  }

  private commitTyped(): void {
    const v = Number.parseFloat(this.input.value);
    if (Number.isNaN(v)) {
      this.input.value = fmt(this.value);
      return;
    }
    this.commit(v);
  }

  private commit(v: number): void {
    const c = Math.round(Math.max(-this.opts.max, Math.min(this.opts.max, v)) * 100) / 100;
    this.value = c;
    this.input.value = fmt(c);
    this.updateFill();
    this.opts.onChange(c);
  }

  private updateFill(): void {
    const frac = this.value / this.opts.max; // -1..1
    if (frac >= 0) {
      this.fill.style.left = '50%';
      this.fill.style.width = `${frac * 50}%`;
    } else {
      this.fill.style.left = `${50 + frac * 50}%`;
      this.fill.style.width = `${-frac * 50}%`;
    }
    this.fill.style.background = this.value >= 0 ? 'rgba(74, 163, 255, 0.45)' : 'rgba(255, 120, 90, 0.45)';
  }

  /** Reflect a store value (skips while the user is typing in this cell). */
  setValue(v: number): void {
    if (document.activeElement === this.input) return;
    this.value = v;
    this.input.value = fmt(v);
    this.updateFill();
  }
}
