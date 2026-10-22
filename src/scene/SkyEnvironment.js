import * as THREE from 'three';
import { Waterfalls } from './Waterfalls.js';
import { CampusRobots } from './CampusRobots.js';

export class SkyEnvironment extends THREE.Group {
  constructor() {
    super();
    this.elapsed = 0;
    this.motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 skyDirection;
          void main() {
            skyDirection = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 skyDirection;
          void main() {
            float height = normalize(skyDirection).y;
            vec3 horizon = vec3(0.88, 0.95, 0.97);
            vec3 zenith = vec3(0.46, 0.73, 0.88);
            vec3 color = mix(horizon, zenith, smoothstep(-0.05, 0.85, height));
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `
      })
    );
    this.sky.renderOrder = -100;
    this.sky.frustumCulled = false;
    this.add(this.sky);

    this.ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 6000, 240, 240),
      new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
          uniform float time;
          varying vec2 oceanPosition;
          varying float waveHeight;
          varying vec3 waveNormal;
          varying vec3 viewDirection;
          void main() {
            vec3 displaced = position;
            vec2 point = position.xy;
            float first = point.x * 0.12 + point.y * 0.07 - time * 1.1;
            float second = point.x * -0.08 + point.y * 0.16 - time * 0.85;
            float swell = point.x * 0.035 + point.y * 0.045 - time * 0.45;
            displaced.z = sin(first) * 1.3 + sin(second) * 0.65 + sin(swell) * 2.0;
            float slopeX = cos(first) * 0.156 - cos(second) * 0.052 + cos(swell) * 0.07;
            float slopeY = cos(first) * 0.091 + cos(second) * 0.104 + cos(swell) * 0.09;
            waveNormal = normalize(mat3(modelMatrix) * vec3(-slopeX, -slopeY, 1.0));
            vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
            viewDirection = cameraPosition - worldPosition.xyz;
            oceanPosition = point;
            waveHeight = displaced.z;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec2 oceanPosition;
          varying float waveHeight;
          varying vec3 waveNormal;
          varying vec3 viewDirection;
          void main() {
            vec3 normal = normalize(waveNormal);
            vec3 view = normalize(viewDirection);
            float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
            vec3 color = mix(vec3(0.10, 0.43, 0.57), vec3(0.30, 0.68, 0.75), waveHeight * 0.1 + 0.5);
            color = mix(color, vec3(0.76, 0.89, 0.93), fresnel * 0.75);
            vec3 sunlight = normalize(vec3(0.5, 1.0, 0.4));
            float sparkle = pow(max(dot(reflect(-sunlight, normal), view), 0.0), 90.0);
            float ripple = sin(oceanPosition.x * 0.7 + sin(oceanPosition.y * 0.4 - time) * 1.8 - time * 1.6);
            float foam = smoothstep(2.3, 3.7, waveHeight) * smoothstep(0.65, 1.0, ripple);
            color += sparkle * 0.35;
            color = mix(color, vec3(0.88, 0.97, 0.97), foam * 0.65);
            float distanceFade = smoothstep(350.0, 1150.0, length(viewDirection));
            color = mix(color, vec3(0.78, 0.90, 0.94), distanceFade);
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `
      })
    );
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -62;
    this.ocean.frustumCulled = false;
    this.add(this.ocean);

    const cloudGeometry = new THREE.IcosahedronGeometry(1, 2);
    const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#fffdf5' });
    this.clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, 180);
    const transform = new THREE.Object3D();
    for (let index = 0; index < 180; index++) {
      const cluster = Math.floor(index / 5);
      const puff = index % 5;
      const angle = cluster * 2.399963;
      const distance = 105 + (cluster % 4) * 43;
      transform.position.set(
        Math.cos(angle) * distance + (puff - 2) * 9,
        -27 - (cluster % 3) * 8 + Math.sin(puff * 2.1) * 3,
        Math.sin(angle) * distance + Math.cos(puff * 1.8) * 10
      );
      transform.scale.set(16 + puff * 2, 5 + (puff % 3) * 2, 12 + (cluster % 3) * 3);
      transform.updateMatrix();
      this.clouds.setMatrixAt(index, transform.matrix);
    }
    this.clouds.instanceMatrix.needsUpdate = true;
    this.clouds.computeBoundingSphere();
    this.add(this.clouds);

    const wingGeometry = new THREE.BufferGeometry();
    wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0.5, 2.3, 0, -0.2, 0.4, 0, -0.65
    ], 3));
    wingGeometry.computeVertexNormals();
    const birdMaterial = new THREE.MeshBasicMaterial({ color: '#526777', side: THREE.DoubleSide });
    this.birds = [];
    for (let index = 0; index < 9; index++) {
      const bird = new THREE.Group();
      const left = new THREE.Mesh(wingGeometry, birdMaterial);
      const right = new THREE.Mesh(wingGeometry, birdMaterial);
      left.scale.x = -1;
      bird.add(left, right);
      bird.scale.setScalar(0.6 + (index % 3) * 0.12);
      this.add(bird);
      this.birds.push({ bird, left, right, phase: index * 0.7 });
    }
  }

  addWaterfalls(bounds, meshes) {
    this.waterfalls = new Waterfalls(bounds, meshes, this.ocean.position.y);
    this.add(this.waterfalls);
    this.robots = new CampusRobots(bounds, meshes);
    this.add(this.robots);
  }

  update(delta, camera) {
    if (!this.motionPreference.matches) this.elapsed += Math.min(delta, 0.05);
    this.sky.position.copy(camera.position);
    this.sky.scale.setScalar(camera.far * 0.75);
    this.ocean.material.uniforms.time.value = this.elapsed;
    this.waterfalls?.update(this.elapsed);
    this.robots?.update(this.elapsed);
    this.clouds.rotation.y = this.elapsed * 0.004;
    this.birds.forEach(({ bird, left, right, phase }, index) => {
      const angle = this.elapsed * 0.07 + phase * 0.16;
      const distance = 68 + (index % 3) * 8;
      bird.position.set(Math.cos(angle) * distance, 28 + Math.sin(angle * 2 + phase) * 4 + index * 0.8, Math.sin(angle) * distance);
      bird.rotation.y = -angle;
      const flap = Math.sin(this.elapsed * 6 + phase) * 0.5;
      left.rotation.z = -flap;
      right.rotation.z = flap;
    });
  }
}
