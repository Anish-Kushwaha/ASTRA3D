const FORMAT = "ASTRA3D Scene";
const CURRENT_VERSION = 2;
const MAX_DOCUMENT_BYTES = 64 * 1024 * 1024;
const MAX_OBJECTS = 10000;
const MAX_VERTICES = 2_000_000;

export function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function finiteVector(value, length, label, { positive = false, color = false } = {}) {
  if (!Array.isArray(value) || value.length !== length ||
      !value.every(Number.isFinite)) {
    throw new Error(`Invalid ${label}: expected ${length} finite numbers.`);
  }
  if (positive && value.some(number => number <= 0)) {
    throw new Error(`Invalid ${label}: scale values must be greater than zero.`);
  }
  if (color && value.some(number => number < 0 || number > 1)) {
    throw new Error("Invalid object color: components must be between 0 and 1.");
  }
  return value.slice();
}

function validateMesh(mesh, index) {
  if (!mesh || typeof mesh !== "object") throw new Error(`Object ${index + 1} has no mesh data.`);
  const { positions, normals, indices } = mesh;
  if (!Array.isArray(positions) || positions.length < 9 || positions.length % 3 !== 0 ||
      positions.length / 3 > MAX_VERTICES || !positions.every(Number.isFinite)) {
    throw new Error(`Object ${index + 1} has invalid or oversized vertex positions.`);
  }
  if (!Array.isArray(normals) || normals.length !== positions.length || !normals.every(Number.isFinite)) {
    throw new Error(`Object ${index + 1} has invalid vertex normals.`);
  }
  if (!Array.isArray(indices) || indices.length < 3 || indices.length % 3 !== 0 ||
      !indices.every(value => Number.isInteger(value) && value >= 0 && value < positions.length / 3)) {
    throw new Error(`Object ${index + 1} has invalid triangle indices.`);
  }
  return {
    positions: positions.slice(),
    normals: normals.slice(),
    indices: indices.slice()
  };
}

export function parseSceneDocument(source) {
  let document;
  if (typeof source === "string") {
    if (source.length > MAX_DOCUMENT_BYTES) throw new Error("Scene file is too large (64 MB maximum).");
    try { document = JSON.parse(source); }
    catch { throw new Error("Scene file is not valid JSON."); }
  } else {
    document = source;
  }
  if (!document || document.format !== FORMAT || ![1, CURRENT_VERSION].includes(document.version) ||
      !Array.isArray(document.objects)) {
    throw new Error("Unsupported ASTRA3D scene format or version.");
  }
  if (document.objects.length > MAX_OBJECTS) {
    throw new Error(`Scene contains too many objects (maximum ${MAX_OBJECTS}).`);
  }
  let totalVertices = 0;
  const objects = document.objects.map((object, index) => {
    if (!object || typeof object !== "object") throw new Error(`Invalid object at position ${index + 1}.`);
    const name = typeof object.name === "string" ? object.name.slice(0, 160) : `Object ${index + 1}`;
    if (!name.trim()) throw new Error(`Object ${index + 1} has an empty name.`);
    const mesh = validateMesh(object.mesh, index);
    totalVertices += mesh.positions.length / 3;
    if (totalVertices > MAX_VERTICES) throw new Error("Scene exceeds the total vertex limit.");
    return {
      id: typeof object.id === "string" ? object.id.slice(0, 80) : `imported-${index + 1}`,
      name,
      type: typeof object.type === "string" ? object.type.slice(0, 40) : "Mesh",
      mesh,
      position: finiteVector(object.position ?? [0, 0, 0], 3, "position"),
      rotation: finiteVector(object.rotation ?? [0, 0, 0], 3, "rotation"),
      scale: finiteVector(object.scale ?? [1, 1, 1], 3, "scale", { positive: true }),
      color: finiteVector(object.color ?? [0.39, 0.72, 0.93], 3, "color", { color: true })
    };
  });
  return { format: FORMAT, version: CURRENT_VERSION, objects };
}

export function createSceneDocument(objects) {
  return parseSceneDocument({ format: FORMAT, version: CURRENT_VERSION, objects });
}

export class SceneHistory {
  constructor(limit = 80) {
    this.limit = Math.max(2, limit);
    this.entries = [];
    this.index = -1;
  }

  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index >= 0 && this.index < this.entries.length - 1; }

  reset(snapshot) {
    this.entries = [cloneData(snapshot)];
    this.index = 0;
  }

  push(snapshot) {
    const next = cloneData(snapshot);
    if (this.index >= 0 && JSON.stringify(this.entries[this.index]) === JSON.stringify(next)) return false;
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push(next);
    if (this.entries.length > this.limit) this.entries.shift();
    this.index = this.entries.length - 1;
    return true;
  }

  undo() {
    if (!this.canUndo) return null;
    this.index -= 1;
    return cloneData(this.entries[this.index]);
  }

  redo() {
    if (!this.canRedo) return null;
    this.index += 1;
    return cloneData(this.entries[this.index]);
  }
}

export const AUTOSAVE_KEY = "astra3d.autosave.v2";
function browserStorage() { try { return globalThis.localStorage; } catch { return null; } }

export function readAutosave(storage) {
  storage ??= browserStorage();
  try {
    const raw = storage?.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.format !== "ASTRA3D Autosave" || !parsed.scene) return null;
    return {
      savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : null,
      scene: parseSceneDocument(parsed.scene),
      keys: parsed.keys && typeof parsed.keys === "object" ? parsed.keys : {},
      selected: typeof parsed.selected === "string" ? parsed.selected : null
    };
  } catch {
    return null;
  }
}

export function writeAutosave(snapshot, storage) {
  storage ??= browserStorage();
  const payload = {
    format: "ASTRA3D Autosave",
    savedAt: Date.now(),
    scene: createSceneDocument(snapshot.objects),
    keys: snapshot.keys || {},
    selected: snapshot.selected || null
  };
  try {
    storage?.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
