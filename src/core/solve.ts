/**
 * `derive()` — the single entry point of the domain layer.
 *
 * Moment tensor in → fully-resolved {@link FocalSolution} out. This is THE seam:
 * the render layer calls only this, and everything downstream depends solely on
 * the returned plain-data object. Pure and synchronous, so it can run on every
 * slider change and is trivially unit-testable.
 */
import type { FaultPlane, FocalSolution, MomentTensor } from './types';
import { tensorMatrix } from './MomentTensor';
import { jacobiEigen } from './eigen';
import { principalAxes, sdrFromTNP } from './faultPlanes';
import { faultVectors } from './faultVectors';
import { nodalSurfaces } from './nodalSurfaces';

/**
 * `flip` swaps which nodal plane is the active fault plane: the cut, slip, and
 * fault vectors then follow the conjugate plane. `planes[0]` is always the
 * active plane, so downstream code needs no special-casing.
 */
export function derive(tensor: MomentTensor, slip = 0, flip = false): FocalSolution {
  const eigen = jacobiEigen(tensorMatrix(tensor));
  const axes = principalAxes(eigen);
  const sdr = sdrFromTNP(axes);
  const planes: [FaultPlane, FaultPlane] = flip ? [sdr[1], sdr[0]] : sdr;
  const vectors = faultVectors(planes[0]);
  const nodalSurface = nodalSurfaces(axes.T, axes.N, axes.P);

  return {
    tensor,
    eigen: { values: axes.values, vectors: axes.vectors },
    axes: { T: axes.T, N: axes.N, P: axes.P },
    planes,
    vectors,
    nodalSurface,
    slip,
  };
}
