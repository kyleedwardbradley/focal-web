/**
 * The radiation-pattern shader, ported from the `new_focalMaterial` node graph
 * (focal_block_2026.py:2167-2473).
 *
 * Per fragment, with n = unit surface direction and M the (normalized) moment
 * tensor: the P-wave amplitude is the radial traction component
 *
 *     amp = nᵀ · M · n          ∈ [-1, 1]
 *
 * The sign gives the beachball polarity (compressive vs tensile), and |amp|
 * contours every 0.1 reproduce the source's CONSTANT-interpolation color ramp.
 *
 * These snippets are injected into a MeshStandardMaterial via onBeforeCompile so
 * the sphere keeps Three.js lighting, shadows, and — crucially — clipping-plane
 * support for free.
 */

/** Pass the object-space position to the fragment stage. */
export const VERT_DECL = /* glsl */ `
varying vec3 vObjPos;
`;

export const VERT_BODY = /* glsl */ `
  vObjPos = position;
`;

/** Extra vertex uniforms when displacing (the deformed sphere). */
export const VERT_DISPLACE_DECL = /* glsl */ `
uniform mat3 uM;
uniform float uDisplace;
`;

/**
 * Radially displace each vertex by the P-wave amplitude, turning the sphere
 * into the four-lobed radiation surface (focal_block_2026.py:5220):
 *   r' = r · (1 + uDisplace · nᵀMn).
 * Clamped to avoid inversion at large scales.
 */
export const VERT_DISPLACE_BODY = /* glsl */ `
  {
    vec3 dir = normalize(position);
    float pAmp = dot(dir, uM * dir);
    transformed *= max(0.05, 1.0 + uDisplace * pAmp);
  }
`;

/**
 * Uniforms + the amplitude→color function, generalized over wave type
 * (focal_block_2026.py:2253-2467). With n the unit direction and
 * t = M·n − (nᵀMn)·n the transverse traction:
 *   uWave 0 (P)  : amp = nᵀMn          range [-1,1], polarity coloring
 *   uWave 1 (S)  : amp = ‖t‖           range [0,2],  magnitude gradient
 *   uWave 2 (SV) : amp = t·ẑ           range [-1,1], polarity coloring
 *   uWave 3 (SH) : amp = t·(n×ẑ)       range [-1,1], polarity coloring
 */
export const FRAG_DECL = /* glsl */ `
uniform mat3 uM;
uniform int uWave;
uniform vec3 uCompressive;
uniform vec3 uTensile;
uniform vec3 uPosContour;
uniform vec3 uNegContour;
uniform float uContours;
uniform float uContourWidth;
varying vec3 vObjPos;

float waveAmplitude(vec3 n) {
  float p = dot(n, uM * n);
  if (uWave == 0) return p;                 // P
  vec3 t = uM * n - p * n;                   // transverse traction
  if (uWave == 1) return length(t);          // S (total)
  if (uWave == 2) return t.z;                // SV (vertical; z = Up)
  return dot(t, cross(n, vec3(0.0, 0.0, 1.0))); // SH (horizontal)
}

float waveFac(float a) {
  if (uWave == 1) return clamp(a * 0.5, 0.0, 1.0);   // [0,2] → [0,1]
  return clamp((a + 1.0) * 0.5, 0.0, 1.0);            // [-1,1] → [0,1]
}

// S-wave ramp: CONSTANT (stepped) interpolation, matching the source stops
// (focal_block_2026.py:2378-2399) — discrete bands, not a smooth gradient.
vec3 sRamp(float f) {
  if (f < 0.17) return vec3(0.00, 0.07, 1.00);  // blue
  if (f < 0.34) return vec3(0.51, 0.06, 0.54);  // purple
  if (f < 0.50) return vec3(0.76, 0.06, 0.31);  // magenta
  if (f < 0.69) return vec3(1.00, 0.12, 0.17);  // red-pink
  return vec3(1.00, 0.00, 0.00);                // red
}

vec3 radiationColor() {
  vec3 n = normalize(vObjPos);
  float amp = waveAmplitude(n);
  float fac = waveFac(amp);

  if (uWave == 1) return sRamp(fac);         // S: stepped magnitude bands

  vec3 col = amp >= 0.0 ? uCompressive : uTensile;
  if (uContours > 0.5) {
    float f10 = fac * 10.0;
    float nearest = floor(f10 + 0.5);        // nearest 0.1 band (0..10)
    float dist = abs(f10 - nearest);
    float halfw = uContourWidth * 5.0;       // contour_width in f10 units / 2
    // Lines at every 0.1 except the poles (0,1) and the polarity flip (0.5).
    if (dist < halfw && nearest > 0.5 && nearest < 9.5 && abs(nearest - 5.0) > 0.5) {
      col = amp >= 0.0 ? uPosContour : uNegContour;
    }
  }
  return col;
}
`;
