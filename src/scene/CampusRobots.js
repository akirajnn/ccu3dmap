import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export class CampusRobots extends THREE.Group {
  constructor(bounds, meshes) {
    super();
    this.walkers = [];
    this.previousTime = null;
    const center = bounds.getCenter(new THREE.Vector3());
    const spacing = 3;
    const raycaster = new THREE.Raycaster();
    const normalMatrix = new THREE.Matrix3();
    const sample = (horizontal, depth) => {
      raycaster.set(new THREE.Vector3(horizontal, bounds.max.y + 3, depth), new THREE.Vector3(0, -1, 0));
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit?.face) return null;
      normalMatrix.getNormalMatrix(hit.object.matrixWorld);
      const normal = hit.face.normal.clone().applyNormalMatrix(normalMatrix);
      return normal.y > 0.85 ? hit.point.clone() : null;
    };
    const nodes = new Map();
    for (let row = -2; row <= 2; row++) {
      for (let column = -2; column <= 2; column++) {
        const point = sample(center.x + column * spacing, center.z + row * spacing);
        if (point) nodes.set(`${column},${row}`, { point, neighbors: [], column, row });
      }
    }
    for (const node of nodes.values()) {
      for (const [offsetX, offsetZ] of [[1, 0], [0, 1]]) {
        const neighbor = nodes.get(`${node.column + offsetX},${node.row + offsetZ}`);
        if (!neighbor || Math.abs(node.point.y - neighbor.point.y) > 0.65) continue;
        const midpoint = node.point.clone().lerp(neighbor.point, 0.5);
        const surface = sample(midpoint.x, midpoint.z);
        if (!surface || Math.abs(surface.y - midpoint.y) > 0.3) continue;
        node.neighbors.push(neighbor);
        neighbor.neighbors.push(node);
      }
    }
    const starts = [...nodes.values()].filter(node => node.neighbors.length);
    if (!starts.length) return;
    this.boxGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.14);
    this.sphereGeometry = new THREE.SphereGeometry(1, 12, 8);
    const shell = new THREE.MeshStandardMaterial({ color: '#fff7e7', roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: '#263d49', roughness: 0.6 });
    const eyes = new THREE.MeshBasicMaterial({ color: '#a3f6ec' });
    const colors = ['#83bfb0', '#edb482', '#a8b9dc'];
    colors.slice(0, Math.min(3, starts.length)).forEach((color, index) => {
      const accent = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
      const robot = new THREE.Group();
      const part = (parent, material, size, position, round = false) => {
        const mesh = new THREE.Mesh(round ? this.sphereGeometry : this.boxGeometry, material);
        mesh.scale.set(...size);
        mesh.position.set(...position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      };
      part(robot, accent, [1.05, 1.05, 0.72], [0, 1.55, 0]);
      const head = new THREE.Group();
      head.position.y = 2.55;
      robot.add(head);
      part(head, shell, [1.5, 1.1, 0.95], [0, 0, 0]);
      part(head, dark, [1.18, 0.62, 0.12], [0, 0.02, 0.47]);
      for (const side of [-1, 1]) {
        part(head, eyes, [0.17, 0.22, 0.08], [side * 0.3, 0.05, 0.55]);
        part(head, accent, [0.15, 0.22, 0.22], [side * 0.82, 0, 0], true);
      }
      part(head, accent, [0.09, 0.34, 0.09], [0, 0.68, 0]);
      part(head, eyes, [0.14, 0.14, 0.14], [0, 0.9, 0], true);
      part(robot, shell, [0.46, 0.32, 0.1], [0, 1.65, 0.38]);
      const legs = [];
      const arms = [];
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.32, 1, 0);
        robot.add(leg);
        part(leg, dark, [0.28, 0.58, 0.3], [0, -0.3, 0]);
        part(leg, shell, [0.43, 0.3, 0.58], [0, -0.72, 0.12]);
        legs.push(leg);
        const arm = new THREE.Group();
        arm.position.set(side * 0.72, 1.95, 0);
        robot.add(arm);
        part(arm, shell, [0.3, 0.63, 0.36], [0, -0.3, 0]);
        part(arm, accent, [0.2, 0.2, 0.2], [0, -0.7, 0], true);
        arms.push(arm);
      }
      const start = starts[Math.floor(index * starts.length / Math.min(3, starts.length))];
      robot.position.copy(start.point);
      this.add(robot);
      this.walkers.push({ robot, head, legs, arms, node: start, target: start.neighbors[0], previous: null, progress: 0, distance: index, turn: index });
    });
  }

  update(elapsed) {
    const delta = this.previousTime === null ? 0 : Math.max(0, Math.min(elapsed - this.previousTime, 0.05));
    this.previousTime = elapsed;
    for (const walker of this.walkers) {
      const length = walker.node.point.distanceTo(walker.target.point);
      const travel = delta * 1.5;
      walker.progress += travel / length;
      walker.distance += travel;
      if (walker.progress >= 1) {
        walker.previous = walker.node;
        walker.node = walker.target;
        const choices = walker.node.neighbors.filter(node => node !== walker.previous);
        walker.target = choices.length ? choices[walker.turn++ % choices.length] : walker.previous;
        walker.progress = 0;
      }
      walker.robot.position.lerpVectors(walker.node.point, walker.target.point, walker.progress);
      const stride = Math.sin(walker.distance * 5);
      walker.robot.position.y += 0.12 + Math.abs(stride) * 0.05;
      const heading = Math.atan2(walker.target.point.x - walker.node.point.x, walker.target.point.z - walker.node.point.z);
      const difference = Math.atan2(Math.sin(heading - walker.robot.rotation.y), Math.cos(heading - walker.robot.rotation.y));
      walker.robot.rotation.y += difference * Math.min(1, delta * 9);
      walker.legs[0].rotation.x = stride * 0.4;
      walker.legs[1].rotation.x = -stride * 0.4;
      walker.arms[0].rotation.x = -stride * 0.3;
      walker.arms[1].rotation.x = stride * 0.3;
      walker.head.rotation.z = Math.sin(walker.distance * 2.5) * 0.045;
    }
  }
}
