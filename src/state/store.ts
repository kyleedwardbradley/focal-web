/**
 * The observable application state — the single source of truth.
 *
 * Holds the moment tensor + view options, and on any change re-runs the pure
 * `derive()` to produce a fresh {@link FocalSolution}, then notifies
 * subscribers. This is the one-way data flow: UI calls `set*`, the store
 * derives, the render layer reacts. Nothing flows the other way.
 */
import { derive } from '../core/solve';
import { applyComponents } from '../core/decompose';
import type { FocalSolution, MomentTensor } from '../core/types';
import { DEFAULT_OPTIONS, DEFAULT_TENSOR, type LayerKey, type ViewOptions } from '../config/defaults';

export interface AppState {
  tensor: MomentTensor;
  options: ViewOptions;
}

export type Listener = (solution: FocalSolution, state: AppState) => void;

export class Store {
  private state: AppState;
  private solution: FocalSolution;
  private readonly listeners = new Set<Listener>();

  constructor(initial: AppState = { tensor: DEFAULT_TENSOR, options: DEFAULT_OPTIONS }) {
    this.state = initial;
    const o = initial.options;
    this.solution = derive(applyComponents(initial.tensor, o.components), o.slip, o.flipPlane);
  }

  getState(): AppState {
    return this.state;
  }

  getSolution(): FocalSolution {
    return this.solution;
  }

  /** Merge moment-tensor components and recompute. */
  setTensor(patch: Partial<MomentTensor>): void {
    this.state = { ...this.state, tensor: { ...this.state.tensor, ...patch } };
    this.recompute();
  }

  /** Merge view options (e.g. slip) and recompute. */
  setOptions(patch: Partial<ViewOptions>): void {
    this.state = { ...this.state, options: { ...this.state.options, ...patch } };
    this.recompute();
  }

  /** Cut along the conjugate nodal plane (re-derives the fault geometry). */
  setFlipPlane(flipPlane: boolean): void {
    this.state = { ...this.state, options: { ...this.state.options, flipPlane } };
    this.recompute();
  }

  /** Toggle which decomposition parts (ISO/DC/CLVD) feed the visualization. */
  setComponents(patch: Partial<ViewOptions['components']>): void {
    const components = { ...this.state.options.components, ...patch };
    this.state = { ...this.state, options: { ...this.state.options, components } };
    this.recompute();
  }

  /**
   * Toggle layer visibility. Pure render state — no re-derive needed, so this
   * notifies with the cached solution.
   */
  setVisibility(patch: Partial<Record<LayerKey, boolean>>): void {
    const visibility = { ...this.state.options.visibility, ...patch };
    this.state = { ...this.state, options: { ...this.state.options, visibility } };
    this.notify();
  }

  /** Update scene lighting. Pure render state — notifies with cached solution. */
  setLighting(patch: Partial<ViewOptions['lighting']>): void {
    const lighting = { ...this.state.options.lighting, ...patch };
    this.state = { ...this.state, options: { ...this.state.options, lighting } };
    this.notify();
  }

  /** Toggle per-layer labels. Pure render state — notifies with cached solution. */
  setLabels(patch: Partial<Record<LayerKey, boolean>>): void {
    const labels = { ...this.state.options.labels, ...patch };
    this.state = { ...this.state, options: { ...this.state.options, labels } };
    this.notify();
  }

  /** Set per-layer opacity. Pure render state — notifies with cached solution. */
  setOpacity(patch: Partial<Record<LayerKey, number>>): void {
    const opacity = { ...this.state.options.opacity, ...patch };
    this.state = { ...this.state, options: { ...this.state.options, opacity } };
    this.notify();
  }

  /** Set the global magnitude scale. Pure render state — notifies with cached solution. */
  setScale(scale: number): void {
    this.state = { ...this.state, options: { ...this.state.options, scale } };
    this.notify();
  }

  /** Set the body wave for radiation coloring. Pure render state — notifies with cached solution. */
  setWave(wave: ViewOptions['wave']): void {
    this.state = { ...this.state, options: { ...this.state.options, wave } };
    this.notify();
  }

  /** Toggle amplitude contour bands. Pure render state — notifies with cached solution. */
  setContours(contours: boolean): void {
    this.state = { ...this.state, options: { ...this.state.options, contours } };
    this.notify();
  }

  /** Toggle the upper-right 2D beachball panel. Pure render state. */
  setBeachballPanel(beachballPanel: boolean): void {
    this.state = { ...this.state, options: { ...this.state.options, beachballPanel } };
    this.notify();
  }

  /** Set displacement-field settings (mode/count). Pure render state. */
  setField(patch: Partial<ViewOptions['field']>): void {
    const field = { ...this.state.options.field, ...patch };
    this.state = { ...this.state, options: { ...this.state.options, field } };
    this.notify();
  }

  /**
   * Subscribe to solution changes. The listener fires immediately with the
   * current solution, and the returned function unsubscribes.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.solution, this.state);
    return () => this.listeners.delete(listener);
  }

  private recompute(): void {
    // The visualized tensor is the raw tensor filtered to the selected
    // decomposition components (full tensor when all are selected).
    const o = this.state.options;
    const tensor = applyComponents(this.state.tensor, o.components);
    this.solution = derive(tensor, o.slip, o.flipPlane);
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.solution, this.state);
  }
}
