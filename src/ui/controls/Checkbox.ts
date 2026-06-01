/** A plain labeled checkbox. Emits via `onChange`; `setValue` reflects without re-firing. */
export interface CheckboxOptions {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export class Checkbox {
  readonly el: HTMLLabelElement;
  private readonly input: HTMLInputElement;

  constructor(opts: CheckboxOptions) {
    this.el = document.createElement('label');
    this.el.className = 'check-row';

    this.input = document.createElement('input');
    this.input.type = 'checkbox';
    this.input.checked = opts.value;
    this.input.addEventListener('change', () => opts.onChange(this.input.checked));

    const text = document.createElement('span');
    text.textContent = opts.label;
    this.el.append(this.input, text);
  }

  setValue(value: boolean): void {
    this.input.checked = value;
  }
}
