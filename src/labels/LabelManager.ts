/**
 * Projects label anchors to screen each frame and places the labels.
 *
 * - at-end labels sit at the projected tip (small outward nudge, no line).
 * - offset labels sit on a ring around the mechanism at the anchor's screen
 *   angle, with a leader line back to the anchor; overlapping offset labels are
 *   spread apart by angular relaxation (collision deconfliction).
 * - a label whose anchor is hidden behind the focal sphere fades out (it points
 *   to something you can't directly see).
 *
 * Motion stabilization (hysteresis/damping) is the remaining polish phase.
 */
import { type PerspectiveCamera, Vector3 } from 'three';
import type { Store } from '../state/store';
import { collectLabels, type LabelSpec } from './sources';
import { LabelOverlay, type PlacedLabel } from './LabelOverlay';

const SAMPLE: Vector3[] = [
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1),
];

interface Screen {
  x: number;
  y: number;
  behind: boolean;
}

/** Is `point` hidden behind the unit sphere (radius R) as seen from `cam`? */
function occludedBySphere(point: Vector3, cam: Vector3, dir: Vector3, R = 1): boolean {
  dir.copy(point).sub(cam);
  const len = dir.length();
  if (len < 1e-6) return false;
  dir.divideScalar(len);
  const tca = -cam.dot(dir); // cam + tca·dir is closest to the origin
  const d2 = cam.lengthSq() - tca * tca; // squared distance from origin to the ray
  if (d2 > R * R) return false;
  const t0 = tca - Math.sqrt(R * R - d2); // near intersection
  return t0 > 0.01 && t0 < len - 0.01; // sphere lies between cam and point
}

const DAMP = 0.22; // per-frame fraction moved toward the target angle

const wrapToPi = (a: number): number => {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};

export class LabelManager {
  private specs: LabelSpec[] = [];
  private occlude = false;
  private readonly angles = new Map<string, number>(); // persistent offset-label angles
  private readonly ndc = new Vector3();
  private readonly scratch = new Vector3();
  private readonly dir = new Vector3();

  constructor(store: Store, private readonly overlay: LabelOverlay) {
    store.subscribe((solution, state) => {
      this.specs = collectLabels(solution, state.options.labels);
      this.occlude = state.options.visibility.sphere || state.options.visibility.deformedSphere;
    });
  }

  /** Re-project and place labels for the current camera (call every frame). */
  project(camera: PerspectiveCamera): void {
    if (this.specs.length === 0) {
      this.overlay.render([]);
      return;
    }
    const w = this.overlay.el.clientWidth;
    const h = this.overlay.el.clientHeight;
    const cam = camera.position;

    const toScreen = (p: Vector3): Screen => {
      this.ndc.copy(p).project(camera);
      return { x: (this.ndc.x * 0.5 + 0.5) * w, y: (-this.ndc.y * 0.5 + 0.5) * h, behind: this.ndc.z > 1 };
    };

    const center = toScreen(new Vector3(0, 0, 0));
    let mechR = 0;
    for (const s of SAMPLE) {
      const sp = toScreen(this.scratch.copy(s).multiplyScalar(1.9));
      mechR = Math.max(mechR, Math.hypot(sp.x - center.x, sp.y - center.y));
    }
    const ring = mechR + 46;

    const placed: PlacedLabel[] = [];
    interface Off {
      spec: LabelSpec;
      ax: number;
      ay: number;
      angle: number;
    }
    const offs: Off[] = [];

    for (const spec of this.specs) {
      const a = toScreen(spec.anchor);
      const visible = !a.behind && !(this.occlude && occludedBySphere(spec.anchor, cam, this.dir));

      if (spec.style === 'at-end') {
        const dx = a.x - center.x;
        const dy = a.y - center.y;
        const len = Math.hypot(dx, dy) || 1;
        placed.push({
          id: spec.id,
          text: spec.text,
          color: spec.color,
          x: a.x + (dx / len) * 12,
          y: a.y + (dy / len) * 12,
          line: null,
          visible,
        });
      } else if (!visible) {
        // keep a hidden placeholder so it fades rather than pops
        placed.push({ id: spec.id, text: spec.text, color: spec.color, x: a.x, y: a.y, line: null, visible: false });
      } else {
        // Damp the persistent angle toward the anchor's screen angle (shortest path).
        const target = Math.atan2(a.y - center.y, a.x - center.x);
        const prev = this.angles.get(spec.id);
        const angle = prev === undefined ? target : prev + DAMP * wrapToPi(target - prev);
        offs.push({ spec, ax: a.x, ay: a.y, angle });
      }
    }

    // Collision deconfliction: spread overlapping offset labels apart on the ring.
    spreadAngles(offs, (20 + 6) / ring);
    for (const o of offs) {
      this.angles.set(o.spec.id, o.angle); // persist the relaxed angle for next frame
      const lx = center.x + Math.cos(o.angle) * ring;
      const ly = center.y + Math.sin(o.angle) * ring;
      placed.push({
        id: o.spec.id,
        text: o.spec.text,
        color: o.spec.color,
        x: lx,
        y: ly,
        line: { x1: o.ax, y1: o.ay, x2: lx, y2: ly },
        visible: true,
      });
    }

    this.overlay.render(placed);
  }
}

/** Push overlapping angles apart (circular relaxation) to a minimum separation. */
function spreadAngles(items: Array<{ angle: number }>, minSep: number): void {
  const n = items.length;
  if (n < 2 || minSep * n >= Math.PI * 2) return;
  items.sort((a, b) => a.angle - b.angle);
  for (let pass = 0; pass < 24; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      let gap = items[j]!.angle - items[i]!.angle;
      if (j === 0) gap += Math.PI * 2; // wrap pair
      if (gap < minSep) {
        const push = (minSep - gap) / 2;
        items[i]!.angle -= push;
        items[j]!.angle += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
}
