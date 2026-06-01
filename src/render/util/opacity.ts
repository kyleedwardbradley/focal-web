/**
 * Apply an opacity to a material the way WebGL wants it, to avoid transparency
 * sorting artifacts:
 *
 *  - `transparent` is true ONLY when opacity < 1. A fully-opaque material stays
 *    in the opaque render pass, where it is depth-sorted correctly and never
 *    flickers. (Marking an opacity-1 material `transparent` is the usual cause
 *    of "objects disappear depending on angle".)
 *  - Transparent materials do NOT write depth, so they stop occluding each other
 *    in the depth buffer (which causes flicker between near-coincident objects).
 *    They still depth-*test* against opaque geometry, so real occlusion holds.
 *
 * Toggling `transparent` needs a shader recompile, so `needsUpdate` is set only
 * when it actually changes.
 */
import type { Material } from 'three';

export function applyOpacity(material: Material, opacity: number): void {
  const transparent = opacity < 1;
  if (material.transparent !== transparent) {
    material.transparent = transparent;
    material.needsUpdate = true;
  }
  material.opacity = opacity;
  material.depthWrite = !transparent;
}
