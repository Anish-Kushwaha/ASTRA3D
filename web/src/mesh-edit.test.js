import test from "node:test";
import assert from "node:assert/strict";
import {pickVertex,recomputeNormals,translateSelectedVertices} from "./mesh-edit.js";

const camera={target:[0,0,0],yaw:0,pitch:0,distance:5,fov:52};
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})};
const object={
  id:"triangle",position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],
  mesh:{positions:[-1,-1,0,1,-1,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2]}
};

test("vertex picker selects the closest projected vertex within the hit radius",()=>{
  assert.equal(pickVertex(object,camera,canvas,200,118),2);
  assert.equal(pickVertex(object,camera,canvas,0,0),null);
});
test("vertex picker respects object transforms",()=>{
  const moved={...object,position:[1,0,0]};
  assert.equal(pickVertex(moved,camera,canvas,364,282),1);
});
test("vertex translation changes only selected local vertices and recalculates normals",()=>{
  const copy=structuredClone(object);
  const changed=translateSelectedVertices(copy,[2],[0,0,1]);
  assert.equal(changed,1);
  assert.deepEqual(copy.mesh.positions.slice(6,9),[0,1,1]);
  assert.equal(copy.mesh.normals.length,copy.mesh.positions.length);
  assert.ok(copy.mesh.normals.every(Number.isFinite));
  assert.deepEqual(object.mesh.positions.slice(6,9),[0,1,0]);
});
test("vertex movement rejects empty, invalid and non-finite edits",()=>{
  assert.throws(()=>translateSelectedVertices(object,[],[1,0,0]),/at least one/);
  assert.throws(()=>translateSelectedVertices(object,[99],[1,0,0]),/invalid.*index/);
  assert.throws(()=>translateSelectedVertices(object,[0],[Infinity,0,0]),/finite/);
});
test("normal calculation handles degenerate faces without NaN values",()=>{
  const mesh={positions:[0,0,0,1,0,0,2,0,0],normals:[],indices:[0,1,2]};
  recomputeNormals(mesh);
  assert.deepEqual(mesh.normals,[0,1,0,0,1,0,0,1,0]);
});
