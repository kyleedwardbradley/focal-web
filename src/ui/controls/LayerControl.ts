/**
 * One row in the Layers tab: a visibility checkbox + label, a compact opacity
 * slider, and a label-toggle checkbox. Emits via callbacks; the setters reflect
 * store state back in without re-firing (the opacity range is focus-guarded).
 */
export interface LayerControlOptions {
  label: string;
  visible: boolean;
  opacity: number;
  labelOn: boolean;
  onVisible: (visible: boolean) => void;
  onOpacity: (opacity: number) => void;
  onLabel: (on: boolean) => void;
}

export class LayerControl {
  readonly el: HTMLDivElement;
  private readonly checkbox: HTMLInputElement;
  private readonly range: HTMLInputElement;
  private readonly labelCheck: HTMLInputElement;

  constructor(opts: LayerControlOptions) {
    this.el = document.createElement('div');
    this.el.className = 'layer-row';

    const toggle = document.createElement('label');
    toggle.className = 'layer-toggle';

    this.checkbox = document.createElement('input');
    this.checkbox.type = 'checkbox';
    this.checkbox.checked = opts.visible;
    this.checkbox.addEventListener('change', () => opts.onVisible(this.checkbox.checked));

    const text = document.createElement('span');
    text.textContent = opts.label;
    toggle.append(this.checkbox, text);

    this.range = document.createElement('input');
    this.range.type = 'range';
    this.range.className = 'layer-opacity';
    this.range.min = '0';
    this.range.max = '1';
    this.range.step = '0.01';
    this.range.value = String(opts.opacity);
    this.range.title = 'Opacity';
    this.range.addEventListener('input', () => opts.onOpacity(Number(this.range.value)));

    const labelWrap = document.createElement('label');
    labelWrap.className = 'layer-labeltoggle';
    labelWrap.title = 'Labels';
    this.labelCheck = document.createElement('input');
    this.labelCheck.type = 'checkbox';
    this.labelCheck.checked = opts.labelOn;
    this.labelCheck.addEventListener('change', () => opts.onLabel(this.labelCheck.checked));
    const tag = document.createElement('span');
    tag.textContent = 'L';
    labelWrap.append(this.labelCheck, tag);

    this.el.append(toggle, this.range, labelWrap);
  }

  setVisible(visible: boolean): void {
    this.checkbox.checked = visible;
  }

  setOpacity(opacity: number): void {
    if (document.activeElement === this.range) return;
    this.range.value = String(opacity);
  }

  setLabelOn(on: boolean): void {
    this.labelCheck.checked = on;
  }
}
