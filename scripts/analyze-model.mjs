import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const buffer = await readFile(new URL('../island+city+3d+model.glb', import.meta.url));
if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB');
const document = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8'));
const minimum = [Infinity, Infinity, Infinity];
const maximum = [-Infinity, -Infinity, -Infinity];
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(left, right) {
  return Array.from({ length: 16 }, (_, index) => {
    const row = index % 4;
    const column = Math.floor(index / 4);
    return [0, 1, 2, 3].reduce((sum, offset) => sum + left[offset * 4 + row] * right[column * 4 + offset], 0);
  });
}
function transform(node) {
  if (node.matrix) return node.matrix;
  const [rotationX, rotationY, rotationZ, rotationW] = node.rotation ?? [0, 0, 0, 1];
  const [scaleX, scaleY, scaleZ] = node.scale ?? [1, 1, 1];
  const translation = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (rotationY ** 2 + rotationZ ** 2)) * scaleX, 2 * (rotationX * rotationY + rotationZ * rotationW) * scaleX, 2 * (rotationX * rotationZ - rotationY * rotationW) * scaleX, 0,
    2 * (rotationX * rotationY - rotationZ * rotationW) * scaleY, (1 - 2 * (rotationX ** 2 + rotationZ ** 2)) * scaleY, 2 * (rotationY * rotationZ + rotationX * rotationW) * scaleY, 0,
    2 * (rotationX * rotationZ + rotationY * rotationW) * scaleZ, 2 * (rotationY * rotationZ - rotationX * rotationW) * scaleZ, (1 - 2 * (rotationX ** 2 + rotationY ** 2)) * scaleZ, 0,
    ...translation, 1
  ];
}
let meshInstances = 0;
function visit(index, parent) {
  const node = document.nodes[index];
  const world = multiply(parent, transform(node));
  if (node.mesh !== undefined) {
    meshInstances++;
    for (const primitive of document.meshes[node.mesh].primitives) {
      const accessor = document.accessors[primitive.attributes.POSITION];
      if (accessor.min && accessor.max) {
        for (let corner = 0; corner < 8; corner++) {
          const point = [0, 1, 2].map(axis => (corner & (1 << axis)) ? accessor.max[axis] : accessor.min[axis]);
          for (let axis = 0; axis < 3; axis++) {
            const coordinate = world[axis] * point[0] + world[4 + axis] * point[1] + world[8 + axis] * point[2] + world[12 + axis];
            minimum[axis] = Math.min(minimum[axis], coordinate);
            maximum[axis] = Math.max(maximum[axis], coordinate);
          }
        }
      }
    }
  }
  for (const child of node.children ?? []) visit(child, world);
}
for (const root of document.scenes[document.scene ?? 0].nodes) visit(root, identity);
const report = {
  file: 'island+city+3d+model.glb', bytes: buffer.length,
  sha256: createHash('sha256').update(buffer).digest('hex'),
  generator: document.asset.generator,
  bounds: { min: minimum, max: maximum, size: maximum.map((value, axis) => value - minimum[axis]), center: maximum.map((value, axis) => (value + minimum[axis]) / 2) },
  meshCount: document.meshes.length, meshInstances,
  nodes: document.nodes.map(node => ({ name: node.name, mesh: node.mesh })),
  materials: document.materials, images: document.images.map(image => ({ mimeType: image.mimeType, bufferView: image.bufferView })),
  primitives: document.meshes.flatMap(mesh => mesh.primitives.map(primitive => ({ vertices: document.accessors[primitive.attributes.POSITION].count, indices: primitive.indices === undefined ? null : document.accessors[primitive.indices].count }))),
  interpretation: 'Single merged Tripo mesh; no semantic building names. All campus landmarks are provisional. Runtime preserves Y-up orientation and material, centers bounds and uniformly scales longest side to 100. No original bytes modified.'
};
await writeFile(new URL('../model-analysis.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
