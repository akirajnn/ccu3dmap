import * as THREE from 'three';

export class Waterfalls extends THREE.Group {
  constructor(bounds, meshes, seaLevel) {
    super();
    this.seaLevel = seaLevel;
    this.streams = [];
    this.transform = new THREE.Object3D();
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const splashGeometry = new THREE.IcosahedronGeometry(1, 1);
    const ringGeometry = new THREE.RingGeometry(0.88, 1, 48);
    const splashMaterial = new THREE.MeshBasicMaterial({ color: '#e2fbff', transparent: true, opacity: 0.75, depthWrite: false });

    for (const angle of [Math.PI * 0.25, Math.PI * 0.83]) {
      let source;
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      for (const fraction of [0.98, 0.85, 0.72, 0.59, 0.46]) {
        const origin = new THREE.Vector3(center.x + outward.x * size.x * 0.5 * fraction, bounds.max.y + 5, center.z + outward.z * size.z * 0.5 * fraction);
        raycaster.set(origin, down);
        const hit = raycaster.intersectObjects(meshes, false)[0];
        if (hit) { source = hit.point.clone(); break; }
      }
      if (!source) continue;
      source.y += 0.4;
      const impact = source.clone().addScaledVector(outward, 10);
      impact.y = seaLevel;
      const lip = source.clone().addScaledVector(outward, 5);
      lip.y -= 2;
      const middle = impact.clone();
      middle.y = (source.y + seaLevel) * 0.5;
      const curve = new THREE.CatmullRomCurve3([source, lip, middle, impact.clone().add(new THREE.Vector3(0, -4, 0))]);
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
          varying vec2 waterUv;
          void main() {
            waterUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec2 waterUv;
          void main() {
            float flow = sin(waterUv.x * 110.0 - time * 9.0 + sin(waterUv.y * 35.0) * 1.4);
            float strands = pow(0.5 + 0.5 * sin(waterUv.y * 65.0 + waterUv.x * 12.0 - time * 2.0), 5.0);
            float foam = smoothstep(0.45, 1.0, flow) * 0.45 + strands * 0.55;
            vec3 color = mix(vec3(0.24, 0.68, 0.83), vec3(0.90, 0.99, 1.0), foam);
            gl_FragColor = vec4(color, 0.68 + foam * 0.25);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `
      });
      const water = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 1.6, 8, false), material);
      this.add(water);
      const splash = new THREE.InstancedMesh(splashGeometry, splashMaterial, 40);
      splash.frustumCulled = false;
      splash.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.add(splash);
      const rings = [];
      for (let index = 0; index < 3; index++) {
        const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: '#e3fbff', side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2;
        this.add(ring);
        rings.push(ring);
      }
      this.streams.push({ material, impact, splash, rings });
    }
    if (!this.streams.length) {
      splashGeometry.dispose();
      splashMaterial.dispose();
      ringGeometry.dispose();
    }
  }

  surfaceHeight(position, elapsed) {
    return this.seaLevel
      + Math.sin(position.x * 0.12 - position.z * 0.07 - elapsed * 1.1) * 1.3
      + Math.sin(position.x * -0.08 - position.z * 0.16 - elapsed * 0.85) * 0.65
      + Math.sin(position.x * 0.035 - position.z * 0.045 - elapsed * 0.45) * 2;
  }

  update(elapsed) {
    this.streams.forEach(({ material, impact, splash, rings }) => {
      material.uniforms.time.value = elapsed;
      const surface = this.surfaceHeight(impact, elapsed);
      for (let index = 0; index < splash.count; index++) {
        const age = (elapsed * 0.6 + index / splash.count) % 1;
        const angle = index * 2.399963;
        const distance = 0.8 + age * (3 + index % 4);
        this.transform.position.set(impact.x + Math.cos(angle) * distance, surface + 0.6 + Math.sin(age * Math.PI) * (3 + index % 5), impact.z + Math.sin(angle) * distance);
        this.transform.scale.setScalar((1 - age) * 0.65 + 0.1);
        this.transform.updateMatrix();
        splash.setMatrixAt(index, this.transform.matrix);
      }
      splash.instanceMatrix.needsUpdate = true;
      rings.forEach((ring, index) => {
        const age = (elapsed * 0.35 + index / rings.length) % 1;
        ring.position.set(impact.x, surface + 0.5 + index * 0.05, impact.z);
        ring.scale.setScalar(2 + age * 10);
        ring.material.opacity = (1 - age) * 0.5;
      });
    });
  }
}
