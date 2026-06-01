/**
 * A dropdown of preset mechanisms (the web analogue of the source's "Change
 * Event"). Loads from data/events.json; selecting one pushes its tensor into
 * the store. Presets are idealized mechanisms — a real GCMT catalog is just a
 * larger JSON in the same shape.
 */
import type { MomentTensor } from '../core/types';

export interface FocalEvent {
  id: string;
  label: string;
  tensor: MomentTensor;
}

export class EventPicker {
  readonly el: HTMLDivElement;
  private readonly select: HTMLSelectElement;

  constructor(events: FocalEvent[], onPick: (event: FocalEvent) => void) {
    this.el = document.createElement('div');
    this.el.className = 'control-row';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = 'Event';

    this.select = document.createElement('select');
    this.select.className = 'control-select';
    for (const [i, ev] of events.entries()) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = ev.label;
      this.select.append(option);
    }

    this.select.addEventListener('change', () => {
      const ev = events[Number(this.select.value)];
      if (ev) onPick(ev);
    });

    this.el.append(label, this.select);
  }
}
