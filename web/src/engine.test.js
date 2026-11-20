import test from "node:test";
import assert from "node:assert/strict";
import { pickObject } from "./engine.js";

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
