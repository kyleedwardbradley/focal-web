/**
 * GPU-resource cleanup. Unlike Blender (Python GC), Three.js will not free
 * geometries/materials/textures on its own — dropping a reference leaks VRAM.
 * Every feature view routes its teardown through here.
 */
import { Material, Mesh, Object3D, type Texture } from 'three';

function disposeMaterial(material: Material | Material[]): void {
  const list = Array.isArray(material) ? material : [material];
  for (const m of list) {
    // Free any textures bound to the material.
    for (const value of Object.values(m as unknown as Record<string, unknown>)) {
      if (value && (value as Texture).isTexture) (value as Texture).dispose();
    }
    m.dispose();
  }
}

/** Recursively dispose every geometry and material under `root`, then detach it. */
export function disposeObject(root: Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) disposeMaterial(mesh.material);
  });
  root.removeFromParent();
}
