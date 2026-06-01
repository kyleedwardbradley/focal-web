/**
 * The contract every visual element implements. A feature view builds its
 * persistent meshes once in its constructor, repositions/rescales them on
 * `update()`, toggles `setVisible`/`setOpacity` from render state, and frees GPU
 * resources on `dispose()`. The scene just holds a list and fans calls out.
 */
import type { FocalSolution } from '../../core/types';

/** Render-only parameters threaded through `update` (not part of the solution). */
export interface RenderContext {
  /** Global multiplier for magnitude-sized elements. */
  scale: number;
}

export interface FeatureView {
  update(solution: FocalSolution, ctx: RenderContext): void;
  /** Toggle this layer's visibility. */
  setVisible(visible: boolean): void;
  /** Set this layer's opacity (0–1). */
  setOpacity(opacity: number): void;
  dispose(): void;
}
