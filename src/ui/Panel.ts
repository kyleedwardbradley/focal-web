/**
 * The control panel — a hand-built sidebar (no UI framework). Purely a driver
 * of the store: every input calls `store.set*`, and a single subscription
 * reflects derived + option state back into the controls. One-way flow is
 * preserved — the panel never touches the scene directly.
 *
 * Two tabs: "Mechanism" (tensor + slip + derived read-out) and "Layers" (a
 * global size scale, then per-element visibility + opacity).
 */
import type { Store } from '../state/store';
import type { FocalSolution, MomentTensor } from '../core/types';
import type { LayerKey, ViewOptions, WaveType } from '../config/defaults';
import type { FieldMode } from '../core/waveField';
import { decompose } from '../core/decompose';
import { Slider } from './controls/Slider';
import { Checkbox } from './controls/Checkbox';
import { LayerControl } from './controls/LayerControl';
import { EventPicker, type FocalEvent } from './EventPicker';
import { fetchEvent } from '../data/usgs';
import events from '../data/events.json';
import './panel.css';

type ComponentKey = keyof ViewOptions['components'];
const DECOMP: Array<{ key: ComponentKey; label: string }> = [
  { key: 'iso', label: 'ISO' },
  { key: 'dc', label: 'DC' },
  { key: 'clvd', label: 'CLVD' },
];

const COMPONENTS: Array<{ key: keyof MomentTensor; label: string }> = [
  { key: 'mrr', label: 'Mrr' },
  { key: 'mtt', label: 'Mtt' },
  { key: 'mpp', label: 'Mpp' },
  { key: 'mrt', label: 'Mrt' },
  { key: 'mrp', label: 'Mrp' },
  { key: 'mtp', label: 'Mtp' },
];

const FIELD_MODES: Array<{ value: FieldMode; label: string }> = [
  { value: 'full', label: 'P+S' },
  { value: 'P', label: 'P' },
  { value: 'S', label: 'S' },
  { value: 'SV', label: 'SV' },
  { value: 'SH', label: 'SH' },
];

const LAYERS: Array<{ key: LayerKey; label: string }> = [
  { key: 'sphere', label: 'Focal sphere' },
  { key: 'deformedSphere', label: 'Displacement field' },
  { key: 'faultBlock', label: 'Fault block' },
  { key: 'faultPlane', label: 'Fault plane' },
  { key: 'cutFault', label: 'Cut fault' },
  { key: 'displacementField', label: 'Vector field' },
  { key: 'nodalSurfaces', label: 'Nodal surfaces' },
  { key: 'faultVectors', label: 'Fault vectors' },
  { key: 'principalAxes', label: 'T / N / P axes' },
  { key: 'componentDipoles', label: 'Component dipoles' },
  { key: 'compass', label: 'Compass' },
  { key: 'compassFocal', label: 'Compass beachball' },
  { key: 'axes', label: 'XYZ axes' },
];

const fixed = (v: number, d = 0): string => v.toFixed(d);

export class Panel {
  readonly el: HTMLDivElement;
  private readonly componentSliders = new Map<keyof MomentTensor, Slider>();
  private readonly decompChecks = new Map<ComponentKey, Checkbox>();
  private readonly layerControls = new Map<LayerKey, LayerControl>();
  private readonly slipSlider: Slider;
  private readonly scaleSlider: Slider;
  private readonly waveSelect: HTMLSelectElement;
  private readonly contoursCheck: Checkbox;
  private readonly panelCheck: Checkbox;
  private readonly flipCheck: Checkbox;
  private readonly fieldModeSelect: HTMLSelectElement;
  private readonly fieldCountSlider: Slider;
  private readonly readout: HTMLDivElement;
  private readonly usgsStatus: HTMLDivElement;

  constructor(private readonly store: Store) {
    const state = store.getState();

    this.el = document.createElement('div');
    this.el.className = 'panel';
    this.el.append(section('Focal Mechanism', 'panel-title'));

    // ── Tabs ────────────────────────────────────────────────────────────────
    const mechanismTab = document.createElement('div');
    const layersTab = document.createElement('div');
    layersTab.style.display = 'none';
    this.el.append(this.buildTabBar(mechanismTab, layersTab), mechanismTab, layersTab);

    // ── Mechanism tab ───────────────────────────────────────────────────────
    const picker = new EventPicker(events as FocalEvent[], (ev) => {
      this.store.setTensor(ev.tensor);
      this.store.setOptions({ slip: 0 });
      this.usgsStatus.textContent = '';
    });
    mechanismTab.append(picker.el);

    // Load a real moment tensor from USGS by event id.
    const usgsRow = document.createElement('div');
    usgsRow.className = 'usgs-row';
    const usgsInput = document.createElement('input');
    usgsInput.type = 'text';
    usgsInput.className = 'usgs-input';
    usgsInput.placeholder = 'USGS event id (e.g. us6000qw60)';
    const usgsButton = document.createElement('button');
    usgsButton.className = 'usgs-button';
    usgsButton.textContent = 'Load';
    const load = (): void => void this.loadUsgs(usgsInput.value);
    usgsButton.addEventListener('click', load);
    usgsInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') load();
    });
    usgsRow.append(usgsInput, usgsButton);
    mechanismTab.append(usgsRow);

    this.usgsStatus = document.createElement('div');
    this.usgsStatus.className = 'usgs-status';
    mechanismTab.append(this.usgsStatus);

    mechanismTab.append(section('Moment Tensor'));
    for (const { key, label } of COMPONENTS) {
      const slider = new Slider({
        label,
        min: -2,
        max: 2,
        step: 0.01,
        value: state.tensor[key],
        onChange: (v) => this.store.setTensor({ [key]: v }),
      });
      this.componentSliders.set(key, slider);
      mechanismTab.append(slider.el);
    }

    // Decomposition component toggles (which parts feed the visualization).
    mechanismTab.append(section('Decomposition'));
    const decompRow = document.createElement('div');
    decompRow.className = 'check-group';
    for (const { key, label } of DECOMP) {
      const check = new Checkbox({
        label,
        value: state.options.components[key],
        onChange: (v) => this.store.setComponents({ [key]: v }),
      });
      this.decompChecks.set(key, check);
      decompRow.append(check.el);
    }
    mechanismTab.append(decompRow);

    mechanismTab.append(section('View'));

    // Wave-type selector (colors the focal sphere by P / S / SV / SH radiation).
    const waveRow = document.createElement('div');
    waveRow.className = 'control-row';
    const waveLabel = document.createElement('label');
    waveLabel.className = 'control-label';
    waveLabel.textContent = 'Wave';
    this.waveSelect = document.createElement('select');
    this.waveSelect.className = 'control-select';
    for (const w of ['P', 'S', 'SV', 'SH'] as WaveType[]) {
      const opt = document.createElement('option');
      opt.value = w;
      opt.textContent = w;
      this.waveSelect.append(opt);
    }
    this.waveSelect.value = state.options.wave;
    this.waveSelect.addEventListener('change', () => this.store.setWave(this.waveSelect.value as WaveType));
    waveRow.append(waveLabel, this.waveSelect);
    mechanismTab.append(waveRow);

    this.slipSlider = new Slider({
      label: 'Slip',
      min: 0,
      max: 1.5,
      step: 0.01,
      value: state.options.slip,
      onChange: (v) => this.store.setOptions({ slip: v }),
    });
    mechanismTab.append(this.slipSlider.el);

    this.contoursCheck = new Checkbox({
      label: 'Contours',
      value: state.options.contours,
      onChange: (v) => this.store.setContours(v),
    });
    mechanismTab.append(this.contoursCheck.el);

    this.panelCheck = new Checkbox({
      label: 'Beachball plot',
      value: state.options.beachballPanel,
      onChange: (v) => this.store.setBeachballPanel(v),
    });
    mechanismTab.append(this.panelCheck.el);

    this.flipCheck = new Checkbox({
      label: 'Flip nodal plane',
      value: state.options.flipPlane,
      onChange: (v) => this.store.setFlipPlane(v),
    });
    mechanismTab.append(this.flipCheck.el);

    // Displacement vector field: wave mode + sample count (toggle is in Layers).
    mechanismTab.append(section('Vector Field'));
    const fieldRow = document.createElement('div');
    fieldRow.className = 'control-row';
    const fieldLabel = document.createElement('label');
    fieldLabel.className = 'control-label';
    fieldLabel.textContent = 'Mode';
    this.fieldModeSelect = document.createElement('select');
    this.fieldModeSelect.className = 'control-select';
    for (const { value, label } of FIELD_MODES) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      this.fieldModeSelect.append(opt);
    }
    this.fieldModeSelect.value = state.options.field.mode;
    this.fieldModeSelect.addEventListener('change', () =>
      this.store.setField({ mode: this.fieldModeSelect.value as FieldMode }),
    );
    fieldRow.append(fieldLabel, this.fieldModeSelect);
    mechanismTab.append(fieldRow);

    this.fieldCountSlider = new Slider({
      label: 'Count',
      min: 20,
      max: 500,
      step: 10,
      value: state.options.field.count,
      onChange: (v) => this.store.setField({ count: Math.round(v) }),
    });
    mechanismTab.append(this.fieldCountSlider.el);

    mechanismTab.append(section('Derived'));
    this.readout = document.createElement('div');
    this.readout.className = 'readout';
    mechanismTab.append(this.readout);

    // ── Layers tab ──────────────────────────────────────────────────────────
    this.scaleSlider = new Slider({
      label: 'Scale',
      min: 0,
      max: 5,
      step: 0.05,
      value: state.options.scale,
      onChange: (v) => this.store.setScale(v),
    });
    layersTab.append(this.scaleSlider.el);
    layersTab.append(section('Layers'));

    for (const { key, label } of LAYERS) {
      const control = new LayerControl({
        label,
        visible: state.options.visibility[key],
        opacity: state.options.opacity[key],
        onVisible: (v) => this.store.setVisibility({ [key]: v }),
        onOpacity: (v) => this.store.setOpacity({ [key]: v }),
      });
      this.layerControls.set(key, control);
      layersTab.append(control.el);
    }

    // The single reflection subscription (fires immediately with current state).
    this.store.subscribe((solution, s) => this.reflect(solution, s));
  }

  private async loadUsgs(input: string): Promise<void> {
    this.usgsStatus.textContent = 'Loading…';
    try {
      const ev = await fetchEvent(input);
      this.store.setTensor(ev.tensor);
      this.store.setOptions({ slip: 0 });
      const date = ev.meta.time ? new Date(ev.meta.time).toLocaleDateString() : '';
      const mag = ev.meta.mag != null ? `M${ev.meta.mag} ` : '';
      this.usgsStatus.textContent = `${mag}${ev.meta.place} · ${date} · ${ev.source.toUpperCase()}`;
    } catch (e) {
      this.usgsStatus.textContent = e instanceof Error ? e.message : 'Failed to load event';
    }
  }

  private buildTabBar(mechanismTab: HTMLElement, layersTab: HTMLElement): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'tab-bar';
    const tabs: Array<[string, HTMLElement]> = [
      ['Mechanism', mechanismTab],
      ['Layers', layersTab],
    ];
    const buttons = tabs.map(([name, content]) => {
      const btn = document.createElement('button');
      btn.className = 'tab-button';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        for (const [, c] of tabs) c.style.display = 'none';
        content.style.display = '';
        for (const b of buttons) b.classList.remove('active');
        btn.classList.add('active');
      });
      bar.append(btn);
      return btn;
    });
    buttons[0]?.classList.add('active');
    return bar;
  }

  private reflect(solution: FocalSolution, state: { tensor: MomentTensor; options: ViewOptions }): void {
    for (const { key } of COMPONENTS) this.componentSliders.get(key)?.setValue(state.tensor[key]);
    for (const { key } of DECOMP) this.decompChecks.get(key)?.setValue(state.options.components[key]);
    this.slipSlider.setValue(state.options.slip);
    this.scaleSlider.setValue(state.options.scale);
    this.fieldCountSlider.setValue(state.options.field.count);
    if (document.activeElement !== this.waveSelect) this.waveSelect.value = state.options.wave;
    if (document.activeElement !== this.fieldModeSelect) this.fieldModeSelect.value = state.options.field.mode;
    this.contoursCheck.setValue(state.options.contours);
    this.panelCheck.setValue(state.options.beachballPanel);
    this.flipCheck.setValue(state.options.flipPlane);
    for (const { key } of LAYERS) {
      const control = this.layerControls.get(key);
      control?.setVisible(state.options.visibility[key]);
      control?.setOpacity(state.options.opacity[key]);
    }

    const [p1, p2] = solution.planes;
    const { T, N, P } = solution.axes;
    const pct = decompose(state.tensor).percent; // composition of the raw event tensor
    this.readout.innerHTML = `
      <div class="readout-line"><span>Plane 1</span> ${fixed(p1.strike)}° / ${fixed(p1.dip)}° / ${fixed(p1.rake)}°</div>
      <div class="readout-line"><span>Plane 2</span> ${fixed(p2.strike)}° / ${fixed(p2.dip)}° / ${fixed(p2.rake)}°</div>
      <div class="readout-sub">strike / dip / rake</div>
      <div class="readout-line"><span>T axis</span> ${fixed(T.azimuth)}° az, ${fixed(T.plunge)}° pl</div>
      <div class="readout-line"><span>N axis</span> ${fixed(N.azimuth)}° az, ${fixed(N.plunge)}° pl</div>
      <div class="readout-line"><span>P axis</span> ${fixed(P.azimuth)}° az, ${fixed(P.plunge)}° pl</div>
      <div class="readout-line"><span>ISO / DC / CLVD</span> ${fixed(pct.iso)} / ${fixed(pct.dc)} / ${fixed(pct.clvd)} %</div>
    `;
  }
}

function section(title: string, className = 'panel-section'): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = title;
  return el;
}
