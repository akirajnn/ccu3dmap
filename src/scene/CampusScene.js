import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { gsap } from 'gsap';
import { SkyEnvironment } from './SkyEnvironment.js';

export class CampusScene {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#c6e5f0');
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', '可旋轉與縮放的 3D 校園模型');
    container.append(this.renderer.domElement);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels';
    container.append(this.labels.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener('start', () => this.stopFlight());
    this.editTarget = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffbd69', depthTest: false }));
    this.editTarget.visible = false;
    this.editTarget.renderOrder = 1000;
    this.scene.add(this.editTarget);
    this.transform = new TransformControls(this.camera, this.renderer.domElement);
    this.transform.setMode('translate');
    this.transform.setSpace('world');
    this.transform.setSize(0.85);
    this.transform.enabled = false;
    this.scene.add(this.transform.getHelper());
    this.transform.addEventListener('dragging-changed', event => {
      this.controls.enabled = !event.value;
      if (event.value) { this.gizmoUsed = true; this.stopFlight(); }
    });
    this.transform.addEventListener('objectChange', () => {
      this.editTarget.position.clampScalar(-1000, 1000);
      this.previewEditorMarker();
      this.callbacks.move?.(this.editTarget.position.toArray().map(value => Number(value.toFixed(4))));
    });
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.3));
    this.scene.add(new THREE.HemisphereLight(0xe5f5ff, 0x8a9473, 1.6));
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.5);
    this.sun.position.set(65, 110, 50);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 300 });
    this.sun.shadow.bias = -0.00015;
    this.scene.add(this.sun);
    this.environment = new SkyEnvironment();
    this.scene.add(this.environment);
    this.markers = new THREE.Group();
    this.scene.add(this.markers);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.down = null;
    this.onDown = event => {
      this.gizmoUsed = this.transform.enabled && Boolean(this.transform.axis);
      this.down = [event.clientX, event.clientY];
    };
    this.onUp = event => this.pick(event);
    this.renderer.domElement.addEventListener('pointerdown', this.onDown);
    this.renderer.domElement.addEventListener('pointerup', this.onUp);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.lastFrame = performance.now();
    this.frameCount = 0;
    this.fpsTime = this.lastFrame;
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
  }

  async load(url) {
    const gltf = await new GLTFLoader().loadAsync(url, event => {
      this.callbacks.progress(event.total ? event.loaded / event.total : null);
    });
    if (this.disposed) { this.release(gltf.scene); return; }
    this.model = gltf.scene;
    this.model.updateMatrixWorld(true);
    const originalBox = new THREE.Box3().setFromObject(this.model);
    const size = originalBox.getSize(new THREE.Vector3());
    const center = originalBox.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(longest) || longest <= 0) throw new Error('模型沒有有效的幾何範圍');
    this.scale = 100 / longest;
    this.root = new THREE.Group();
    this.root.scale.setScalar(this.scale);
    this.root.position.copy(center).multiplyScalar(-this.scale);
    this.root.add(this.model);
    this.scene.add(this.root);
    this.meshes = [];
    this.model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = true;
        this.meshes.push(object);
      }
    });
    this.bounds = new THREE.Box3().setFromObject(this.root);
    this.environment.addWaterfalls(this.bounds, this.meshes);
    this.radius = this.bounds.getBoundingSphere(new THREE.Sphere()).radius;
    this.controls.minDistance = this.radius * 0.65;
    this.controls.maxDistance = this.radius * 6;
    this.camera.far = this.radius * 20;
    this.camera.updateProjectionMatrix();
    this.resize();
    this.overview(false);
    this.callbacks.loaded({ size: size.toArray(), center: center.toArray(), scale: this.scale, meshCount: this.meshes.length });
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labels.setSize(width, height);
  }

  overview(smooth = true) {
    if (!this.radius) return;
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const horizontalFov = Math.atan(Math.tan(halfFov) * this.camera.aspect);
    const distance = this.radius / Math.sin(Math.min(halfFov, horizontalFov)) * 1.12;
    this.controls.maxDistance = Math.max(this.radius * 6, distance * 1.4);
    this.fly(new THREE.Vector3(1, 1.35, 1).normalize().multiplyScalar(distance), new THREE.Vector3(), smooth);
  }

  setTopView(enabled) {
    if (!this.radius || enabled === Boolean(this.topView)) return;
    this.stopFlight();
    if (enabled) {
      this.savedView = { position: this.camera.position.clone(), target: this.controls.target.clone() };
      this.topView = true;
      this.controls.enableRotate = false;
      this.controls.minPolarAngle = 0.001;
      this.controls.maxPolarAngle = 0.001;
      const vertical = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const horizontal = Math.atan(Math.tan(vertical) * this.camera.aspect);
      const distance = this.radius / Math.sin(Math.min(vertical, horizontal)) * 1.05;
      this.controls.maxDistance = Math.max(this.controls.maxDistance, distance * 1.2);
      this.fly(new THREE.Vector3(0, distance, distance * 0.001), new THREE.Vector3(), false);
    } else {
      this.topView = false;
      this.controls.enableRotate = true;
      this.controls.minPolarAngle = 0.2;
      this.controls.maxPolarAngle = Math.PI * 0.46;
      this.fly(this.savedView.position, this.savedView.target, false);
    }
  }

  setEditorEnabled(enabled, id, position) {
    this.controls.enabled = true;
    this.editTarget.visible = enabled;
    this.transform.enabled = enabled;
    if (enabled) {
      this.setEditorTarget(id, position);
      this.transform.attach(this.editTarget);
    } else {
      this.transform.detach();
      this.editingId = null;
      this.setTopView(false);
    }
  }

  setEditorTarget(id, position) {
    this.editingId = id;
    this.editTarget.position.fromArray(position);
    this.editTarget.updateMatrixWorld(true);
    if (this.transform.enabled) this.previewEditorMarker();
  }

  previewEditorMarker() {
    const marker = this.markers.children.find(child => child.userData.landmarkId === this.editingId);
    if (marker) {
      marker.position.copy(this.editTarget.position);
      marker.position.y += 3;
    }
  }

  focus(position) {
    if (!this.radius) return;
    const target = new THREE.Vector3(...position);
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    direction.y = Math.max(direction.y, 0.7);
    direction.normalize();
    this.fly(target.clone().addScaledVector(direction, this.controls.minDistance), target);
  }

  stopFlight() {
    this.flight?.kill();
    this.flight = null;
  }

  fly(position, target, smooth = true) {
    this.stopFlight();
    if (!smooth || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.camera.position.copy(position);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.flight = gsap.timeline({ defaults: { duration: 1.5, ease: 'power2.inOut' } })
      .to(this.camera.position, { x: position.x, y: position.y, z: position.z }, 0)
      .to(this.controls.target, { x: target.x, y: target.y, z: target.z }, 0);
  }

  setLandmarks(landmarks, select, selectedId) {
    for (const marker of [...this.markers.children]) {
      marker.element.remove();
      this.markers.remove(marker);
    }
    landmarks.forEach((landmark, index) => {
      const button = document.createElement('button');
      button.className = `map-label${landmark.id === selectedId ? ' selected' : ''}`;
      button.textContent = `${String(index + 1).padStart(2, '0')}  ${landmark.name}${landmark.provisional ? ' · 暫定' : ''}`;
      button.addEventListener('click', () => select(landmark.id));
      const marker = new CSS2DObject(button);
      marker.userData.landmarkId = landmark.id;
      marker.position.fromArray(landmark.position);
      marker.position.y += 3;
      this.markers.add(marker);
    });
  }

  pick(event) {
    if (this.gizmoUsed || this.transform.dragging) return;
    if (!this.model || !this.down || Math.hypot(event.clientX - this.down[0], event.clientY - this.down[1]) > 5) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.meshes, false)[0];
    if (hit) this.callbacks.pick(hit.point.toArray().map(value => Number(value.toFixed(4))));
  }

  animate(now) {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.bounds && !this.flight) {
      this.controls.target.clamp(this.bounds.min, this.bounds.max);
      const floor = this.bounds.max.y + this.radius * 0.12;
      if (this.camera.position.y < floor) this.camera.position.y = floor;
      this.camera.lookAt(this.controls.target);
    }
    this.environment.update((now - this.lastFrame) / 1000, this.camera);
    this.lastFrame = now;
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
    this.frameCount++;
    if (now - this.fpsTime >= 700) {
      this.callbacks.fps(Math.round(this.frameCount * 1000 / (now - this.fpsTime)));
      this.fpsTime = now;
      this.frameCount = 0;
    }
  }

  release(root) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    textures.forEach(texture => { texture.dispose(); texture.source?.data?.close?.(); });
    materials.forEach(material => material.dispose());
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.stopFlight();
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.onDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onUp);
    this.controls.dispose();
    this.transform.detach();
    this.transform.dispose();
    this.scene.remove(this.transform.getHelper());
    this.release(this.scene);
    this.sun.shadow.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.labels.domElement.remove();
    this.renderer.domElement.remove();
  }
}
