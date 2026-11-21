import test from "node:test";
import assert from "node:assert/strict";
import { parseOBJ, pickObject } from "./engine.js";

const camera = {target:[0,0,0],yaw:0,pitch:0,distance:5,fov:52};
const canvas = {getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})};
const triangle = {
  id:"triangle",
  position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],
  mesh:{
    positions:[-1,-1,0, 1,-1,0, 0,1,0],
    normals:[0,0,1, 0,0,1, 0,0,1],
    indices:[0,1,2]
  }
};

test("viewport ray selects the mesh under the pointer",()=>{
  assert.equal(pickObject([triangle],camera,canvas,200,200),"triangle");
});

test("viewport ray returns null when it misses all geometry",()=>{
  assert.equal(pickObject([triangle],camera,canvas,0,0),null);
});

test("viewport ray selects the nearest overlapping object",()=>{
  const near={...triangle,id:"near",position:[0,0,1]};
  const far={...triangle,id:"far",position:[0,0,-1]};
  assert.equal(pickObject([far,near],camera,canvas,200,200),"near");
});

test("viewport picker ignores zero-sized canvases",()=>{
  assert.equal(pickObject([triangle],camera,{getBoundingClientRect:()=>({left:0,top:0,width:0,height:0})},0,0),null);
});

test("OBJ import shares vertices, triangulates polygon faces and calculates finite normals",()=>{
  const mesh=parseOBJ([
    "# quad with positive and negative face references",
    "v 0 0 0",
    "v 1 0 0",
    "v 1 1 0",
    "v 0 1 0",
    "f 1/1/1 2/2/1 3/3/1 4/4/1"
  ].join("\n"));
  assert.equal(mesh.positions.length/3,4);
  assert.deepEqual(mesh.indices,[0,1,2,0,2,3]);
  assert.equal(mesh.normals.length,mesh.positions.length);
  assert.ok(mesh.normals.every(Number.isFinite));
  assert.ok(mesh.normals.every((value,index)=>index%3!==2||value>.99));
});

test("OBJ import supports negative indices and ignores unsupported records",()=>{
  const mesh=parseOBJ([
    "o Sample",
    "v 0 0 0",
    "v 1 0 0",
    "v 0 1 0",
    "vt 0 0",
    "vn 0 0 1",
    "f -3/1/1 -2/1/1 -1/1/1"
  ].join("\n"));
  assert.deepEqual(mesh.indices,[0,1,2]);
});

test("OBJ import rejects malformed coordinates, zero and out-of-range indices",()=>{
  assert.throws(()=>parseOBJ("v 0 NaN 0\nv 1 0 0\nv 0 1 0\nf 1 2 3"),/finite numbers/);
  assert.throws(()=>parseOBJ("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 0 2 3"),/cannot be zero/);
  assert.throws(()=>parseOBJ("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 4"),/does not exist/);
  assert.throws(()=>parseOBJ("v 0 0 0\nf 1 1"),/at least three vertices/);
  assert.throws(()=>parseOBJ(null),/text/);
});

test("OBJ import produces safe fallback normals for degenerate triangles",()=>{
  const mesh=parseOBJ("v 0 0 0\nv 1 0 0\nv 2 0 0\nf 1 2 3");
  assert.deepEqual(mesh.normals,[0,1,0,0,1,0,0,1,0]);
});
