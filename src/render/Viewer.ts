/**
 * The Three.js stage: renderer, camera, orbit controls, lighting, and the
 * render loop. Knows nothing about moment tensors — it just exposes a `scene`
 * for feature views to populate and keeps drawing.
 *
 * The world uses the geographic frame (x=East, y=North, z=Up), so the camera's
 * up-vector is +Z and an AxesHelper labels E/N/U (red/green/blue).
 */
import {
  AxesHelper,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Material,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { COLORS } from '../config/appearance';
import { applyOpacity } from './util/opacity';

export class Viewer {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly axes = new AxesHelper(2);

  constructor(container: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    // Enable per-material clipping planes now — FocalSphereView (step 3) relies on it.
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new Color(COLORS.background);

    this.camera = new PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.up.set(0, 0, 1); // Z is up in the ENU frame
    this.camera.position.set(3.5, -3.5, 2.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    // Lighting for the MeshStandardMaterial arrows.
    this.scene.add(new HemisphereLight(0xffffff, 0x202028, 1.0));
    const key = new DirectionalLight(0xffffff, 1.2);
    key.position.set(4, -2, 6);
    this.scene.add(key);

    // E/N/U orientation reference (red/green/blue).
    this.scene.add(this.axes);

    window.addEventListener('resize', this.onResize);
  }

  private readonly frameCallbacks: Array<(camera: PerspectiveCamera) => void> = [];

  /** Register a per-frame callback (e.g. the label manager re-projecting on orbit). */
  onFrame(cb: (camera: PerspectiveCamera) => void): void {
    this.frameCallbacks.push(cb);
  }

  /** Begin the render loop. */
  start(): void {
    this.renderer.setAnimationLoop(this.tick);
  }

  /** Toggle the XYZ orientation axes. */
  setAxesVisible(visible: boolean): void {
    this.axes.visible = visible;
  }

  /** Set the XYZ axes opacity. */
  setAxesOpacity(opacity: number): void {
    applyOpacity(this.axes.material as Material, opacity);
  }

  private readonly tick = (): void => {
    this.controls.update();
    for (const cb of this.frameCallbacks) cb(this.camera);
    this.renderer.render(this.scene, this.camera);
  };

  private readonly onResize = (): void => {
    const { clientWidth: w, clientHeight: h } = this.renderer.domElement.parentElement ?? document.body;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };
}
