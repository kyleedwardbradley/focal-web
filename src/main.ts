/**
 * Bootstrap: wire the store to the scene and start rendering.
 *
 *   store.set*()  →  derive()  →  subscribe callback  →  FocalScene.update()
 *
 * That single subscription is the whole data flow. Editing the tensor anywhere
 * re-derives and repaints; nothing else needs to know how.
 */
import { Store } from './state/store';
import { Viewer } from './render/Viewer';
import { FocalScene } from './render/FocalScene';
import { Panel } from './ui/Panel';
import { BeachballPanel } from './ui/BeachballPanel';

const container = document.getElementById('app');
if (!container) throw new Error('#app container not found');

const store = new Store();
const viewer = new Viewer(container);
const focal = new FocalScene(viewer.scene);
const panel = new Panel(store);
document.body.append(panel.el);
const beachball = new BeachballPanel(store);
document.body.append(beachball.el);

// The seam: every derived solution flows straight to the scene, and layer
// visibility is applied from the same state.
store.subscribe((solution, state) => {
  const { visibility, opacity, scale, wave, contours, field } = state.options;
  focal.setField(field.mode, field.count); // before update (sets sample points)
  focal.update(solution, { scale });
  focal.applyVisibility(visibility);
  focal.applyOpacity(opacity);
  focal.setWave(wave);
  focal.setContours(contours);
  viewer.setAxesVisible(visibility.axes);
  viewer.setAxesOpacity(opacity.axes);
});

viewer.start();

// Expose the store for quick console-driven testing.
(globalThis as unknown as { store: Store }).store = store;
