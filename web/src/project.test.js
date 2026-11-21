import test from "node:test";
import assert from "node:assert/strict";
import { AUTOSAVE_KEY, SceneHistory, createSceneDocument, parseSceneDocument, readAutosave, writeAutosave } from "./project.js";

const mesh = {
  positions: [0,0,0, 1,0,0, 0,1,0],
  normals: [0,0,1, 0,0,1, 0,0,1],
  indices: [0,1,2]
};
const object = {
  id:"mesh-1", name:"Triangle", type:"Imported OBJ", mesh,
  position:[0,0,0], rotation:[0,0,0], scale:[1,1,1], color:[.2,.4,.8]
};

test("normalizes legacy v1 documents to current v2", () => {
  const scene = parseSceneDocument({format:"ASTRA3D Scene",version:1,objects:[object]});
  assert.equal(scene.version,2);
  assert.equal(scene.objects.length,1);
  assert.deepEqual(scene.objects[0].mesh.indices,[0,1,2]);
});

test("rejects malformed geometry and non-finite transforms", () => {
  assert.throws(() => createSceneDocument([{...object,mesh:{...mesh,indices:[0,1,9]}}]), /indices/);
  assert.throws(() => createSceneDocument([{...object,position:[0,Infinity,0]}]), /finite/);
  assert.throws(() => createSceneDocument([{...object,scale:[1,0,1]}]), /greater than zero/);
});

test("rejects unsupported versions and oversized input", () => {
  assert.throws(() => parseSceneDocument({format:"ASTRA3D Scene",version:999,objects:[]}), /Unsupported/);
  assert.throws(() => parseSceneDocument(" ".repeat(64 * 1024 * 1024 + 1)), /too large/);
});

test("history supports undo, redo, branch truncation and bounded storage", () => {
  const history = new SceneHistory(3);
  history.reset({value:0});
  history.push({value:1});
  history.push({value:2});
  assert.equal(history.undo().value,1);
  assert.equal(history.redo().value,2);
  history.undo();
  history.push({value:9});
  assert.equal(history.canRedo,false);
  history.push({value:10});
  history.push({value:11});
  assert.equal(history.entries.length,3);
  assert.equal(history.undo().value,10);
});

test("autosave writes and restores a validated scene snapshot", () => {
  const store = new Map();
  const storage = {getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  const snapshot = {objects:[object],keys:{"mesh-1":[]},selected:"mesh-1"};
  assert.equal(writeAutosave(snapshot,storage),true);
  assert.ok(store.has(AUTOSAVE_KEY));
  const restored = readAutosave(storage);
  assert.equal(restored.scene.objects[0].name,"Triangle");
  assert.equal(restored.selected,"mesh-1");
  assert.deepEqual(restored.keys,{"mesh-1":[]});
});

test("autosave handles storage failures without crashing", () => {
  const broken = {getItem(){throw new Error("blocked")},setItem(){throw new Error("quota")}};
  assert.equal(writeAutosave({objects:[],keys:{},selected:null},broken),false);
  assert.equal(readAutosave(broken),null);
});

test("scene export preserves ordered animation keyframes", () => {
  const keys = {"mesh-1":[
    {time:0,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},
    {time:1,position:[1,0,0],rotation:[0,1,0],scale:[1,1,1]}
  ]};
  const scene = createSceneDocument([object],keys);
  assert.equal(scene.keys["mesh-1"].length,2);
  assert.equal(scene.keys["mesh-1"][1].position[0],1);
  assert.throws(()=>createSceneDocument([object],{"mesh-1":[
    {time:1,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]},
    {time:0,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}
  ]}),/unordered time/);
});

test("autosave validates legacy top-level animation data before restoring", () => {
  const store = new Map();
  const storage = {getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  store.set(AUTOSAVE_KEY,JSON.stringify({
    format:"ASTRA3D Autosave",
    savedAt:Date.now(),
    scene:{format:"ASTRA3D Scene",version:1,objects:[object]},
    keys:{"mesh-1":[{time:"not-a-time",position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}]}
  }));
  assert.equal(readAutosave(storage),null);
});

test("scene mesh preserves polygon face groups and rejects malformed metadata",()=>{
  const grouped={...object,mesh:{...mesh,faceGroups:[7]}};
  const scene=createSceneDocument([grouped]);
  assert.deepEqual(scene.objects[0].mesh.faceGroups,[7]);
  const restored=parseSceneDocument(JSON.stringify(scene));
  assert.deepEqual(restored.objects[0].mesh.faceGroups,[7]);
  assert.throws(()=>createSceneDocument([{...object,mesh:{...mesh,faceGroups:[]}}]),/face-group metadata/);
  assert.throws(()=>createSceneDocument([{...object,mesh:{...mesh,faceGroups:[-1]}}]),/face-group metadata/);
});

test("history drops oldest snapshots when its memory budget is reached",()=>{
  const history=new SceneHistory(10,120);
  history.reset({value:""});
  history.push({value:"A".repeat(30)});
  history.push({value:"B".repeat(30)});
  assert.equal(history.entries.length,1);
  assert.equal(history.canUndo,false);
  assert.equal(history.undo(),null);
  assert.equal(history.redo(),null);
  assert.deepEqual(history.entries[0],JSON.stringify({value:"B".repeat(30)}));
});

test("scene document rejects oversized triangle arrays before returning a scene",()=>{
  const oversized={...object,mesh:{
    positions:mesh.positions,
    normals:mesh.normals,
    indices:Array(12_000_003)
  }};
  assert.throws(()=>createSceneDocument([oversized]),/indices/);
});

