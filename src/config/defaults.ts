/** Initial application state. */
import type { MomentTensor } from '../core/types';
import type { FieldMode } from '../core/waveField';

/**
 * Default tensor: a clean 45° thrust (strike 0, dip 45, rake 90) expressed in
 * GCMT (r,t,p) form — mrr > 0, mpp < 0. Gives an immediately recognizable
 * mechanism on load. The UI will let the user edit or load catalog events.
 */
export const DEFAULT_TENSOR: MomentTensor = {
  mrr: 1,
  mtt: 0,
  mpp: -1,
  mrt: 0,
  mrp: 0,
  mtp: 0,
};

/** Body-wave radiation pattern to color the focal sphere by. */
export type WaveType = 'P' | 'S' | 'SV' | 'SH';

/** Toggleable visual layers. 'axes' is the XYZ helper (owned by the Viewer). */
export type LayerKey =
  | 'sphere'
  | 'deformedSphere'
  | 'faultBlock'
  | 'faultPlane'
  | 'cutFault'
  | 'displacementField'
  | 'nodalSurfaces'
  | 'faultVectors'
  | 'principalAxes'
  | 'componentDipoles'
  | 'compass'
  | 'compassFocal'
  | 'axes';

export interface LightingOptions {
  /** Hemisphere (ambient) light intensity. */
  ambient: number;
  /** Directional key-light intensity. */
  key: number;
  /** Key-light azimuth, degrees clockwise from North. */
  azimuth: number;
  /** Key-light elevation above the horizon, degrees. */
  elevation: number;
  /** Key light follows the camera (headlight). */
  headlight: boolean;
}

export interface ViewOptions {
  /** Amount of slip between the two blocks along the slip vector (0 = closed). */
  slip: number;
  /** Body wave to color the focal sphere by. */
  wave: WaveType;
  /** Show the amplitude contour bands on the radiation pattern. */
  contours: boolean;
  /** Show the 2D beachball plot in the upper-right corner. */
  beachballPanel: boolean;
  /** Cut along the conjugate nodal plane instead of the primary. */
  flipPlane: boolean;
  /** Which decomposition parts to include in the visualized tensor. */
  components: { iso: boolean; dc: boolean; clvd: boolean };
  /** Displacement vector field settings. */
  field: { mode: FieldMode; count: number };
  /** Global multiplier for magnitude-sized elements (component dipoles, etc.). */
  scale: number;
  /** Per-layer opacity (0 = invisible, 1 = solid). */
  opacity: Record<LayerKey, number>;
  /** Per-layer visibility. */
  visibility: Record<LayerKey, boolean>;
  /** Per-layer label visibility. */
  labels: Record<LayerKey, boolean>;
  /** Scene lighting. */
  lighting: LightingOptions;
}

const ALL_LAYERS: LayerKey[] = [
  'sphere', 'deformedSphere', 'faultBlock', 'faultPlane', 'cutFault',
  'displacementField', 'nodalSurfaces', 'faultVectors', 'principalAxes',
  'componentDipoles', 'compass', 'compassFocal', 'axes',
];

const allLayers = (value: boolean): Record<LayerKey, boolean> =>
  Object.fromEntries(ALL_LAYERS.map((k) => [k, value])) as Record<LayerKey, boolean>;

export const DEFAULT_OPTIONS: ViewOptions = {
  slip: 0,
  wave: 'P',
  contours: true,
  beachballPanel: true,
  flipPlane: false,
  components: { iso: true, dc: true, clvd: true },
  field: { mode: 'full', count: 200 },
  scale: 1,
  opacity: {
    sphere: 0.82,
    deformedSphere: 0.9,
    faultBlock: 1,
    faultPlane: 1,
    cutFault: 0.5, // fault_alpha
    displacementField: 1,
    nodalSurfaces: 1,
    faultVectors: 1,
    principalAxes: 1,
    componentDipoles: 1,
    compass: 1,
    compassFocal: 1,
    axes: 1,
  },
  visibility: {
    sphere: true,
    deformedSphere: false, // overlaps the focal sphere; off by default
    faultBlock: false, // alternative representation; off by default
    faultPlane: false, // off by default
    cutFault: false, // off by default
    displacementField: false, // dense; off by default
    nodalSurfaces: true,
    faultVectors: true,
    principalAxes: true,
    componentDipoles: false, // dense; off by default
    compass: true,
    compassFocal: false, // off by default
    axes: true,
  },
  labels: allLayers(false),
  lighting: { ambient: 1.0, key: 1.2, azimuth: 120, elevation: 50, headlight: false },
};

/** Quick lighting presets. */
export const LIGHT_PRESETS: Record<string, LightingOptions> = {
  Studio: { ambient: 1.0, key: 1.2, azimuth: 120, elevation: 50, headlight: false },
  Soft: { ambient: 1.7, key: 0.5, azimuth: 120, elevation: 60, headlight: false },
  Dramatic: { ambient: 0.3, key: 2.2, azimuth: 140, elevation: 28, headlight: false },
  Flat: { ambient: 2.0, key: 0.0, azimuth: 120, elevation: 50, headlight: false },
  Headlight: { ambient: 0.7, key: 1.4, azimuth: 120, elevation: 50, headlight: true },
};
