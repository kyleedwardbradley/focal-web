/**
 * A labeled slider: a range input paired with a number box that stay in sync.
 * Emits the new value via `onChange`; `setValue` updates the display without
 * re-firing, so the store can reflect state back into it without a feedback loop.
 */
export interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

const fmt = (v: number): string => (Math.round(v * 100) / 100).toString();

export class Slider {
  readonly el: HTMLDivElement;
  private readonly range: HTMLInputElement;
  private readonly num: HTMLInputElement;

  constructor(opts: SliderOptions) {
    this.el = document.createElement('div');
    this.el.className = 'control-row';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = opts.label;

    this.range = document.createElement('input');
    this.range.type = 'range';
    this.range.min = String(opts.min);
    this.range.max = String(opts.max);
    this.range.step = String(opts.step);
    this.range.value = String(opts.value);

    this.num = document.createElement('input');
    this.num.type = 'number';
    this.num.className = 'control-number';
    this.num.step = String(opts.step);
    this.num.value = fmt(opts.value);

    this.range.addEventListener('input', () => {
      this.num.value = fmt(Number(this.range.value));
      opts.onChange(Number(this.range.value));
    });
    this.num.addEventListener('input', () => {
      const v = Number(this.num.value);
      if (Number.isNaN(v)) return;
      this.range.value = String(v);
      opts.onChange(v);
    });

    this.el.append(label, this.range, this.num);
  }

  /** True while the user is actively editing, so reflection can skip it. */
  get focused(): boolean {
    return document.activeElement === this.num || document.activeElement === this.range;
  }

  setValue(value: number): void {
    if (this.focused) return;
    this.range.value = String(value);
    this.num.value = fmt(value);
  }
}
