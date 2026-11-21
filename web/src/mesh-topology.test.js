import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMeshTopology,bevelEdge,extrudeFace,insetFace,loopCutFromEdge,pickEdge,pickFace
} from "./mesh-topology.js";

function cubeMesh(){
  const faces=[
    [[0,0,1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    [[0,0,-1],[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],
    [[1,0,0],[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],
    [[-1,0,0],[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],
    [[0,1,0],[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],
    [[0,-1,0],[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]
  ];
  const positions=[],normals=[],indices=[];
  for(const face of faces){
    const base=positions.length/3;
    for(let i=1;i<=4;i++){positions.push(...face[i]);normals.push(...face[0]);}
    indices.push(base,base+1,base+2,base,base+2,base+3);
  }
  return {positions,normals,indices};
}
const camera={target:[0,0,0],yaw:0,pitch:0,distance:5,fov:52};
const canvas={getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})};

test("topology joins coplanar triangle pairs into quad faces and removes triangulation diagonals",()=>{
  const topology=buildMeshTopology(cubeMesh());
  assert.equal(topology.faces.length,6);
  assert.equal(topology.edges.length,12);
  assert.ok(topology.faces.every(face=>face.boundary.length===4&&face.triangles.length===2));
});

test("edge and face picking resolve the front face in the viewport",()=>{
  const mesh=cubeMesh(),topology=buildMeshTopology(mesh);
  const object={mesh,position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]};
  assert.equal(pickFace(object,topology,camera,canvas,200,200),0);
  const edgeId=pickEdge(object,topology,camera,canvas,200,140,15);
  assert.ok(Number.isInteger(edgeId));
});

test("face extrusion adds a cap and side walls without removing the original base",()=>{
  const mesh=cubeMesh(),beforeIndices=mesh.indices.length;
  const result=extrudeFace(mesh,0,.5);
  assert.equal(result.verticesAdded,4);
  assert.equal(mesh.positions.length/3,28);
  assert.equal(mesh.indices.length,beforeIndices+30);
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.ok(mesh.normals.every(Number.isFinite));
  assert.equal(buildMeshTopology(mesh).faces.length,11);
});

test("inset replaces one quad with a ring and inner face",()=>{
  const mesh=cubeMesh(),beforeIndices=mesh.indices.length;
  const result=insetFace(mesh,0,.2);
  assert.equal(result.verticesAdded,4);
  assert.equal(mesh.positions.length/3,28);
  assert.equal(mesh.indices.length,beforeIndices+24);
  const topology=buildMeshTopology(mesh);
  assert.equal(topology.faces.length,10);
  assert.ok(topology.faces.every(face=>face.boundary.length>=3));
});

test("loop cut propagates through connected quad faces and splits them",()=>{
  const mesh=cubeMesh(),topology=buildMeshTopology(mesh);
  const edge=topology.edges.find(item=>item.faces.length===2);
  assert.ok(edge);
  const result=loopCutFromEdge(mesh,edge.id,topology,.5);
  assert.ok(result.facesCut>=1);
  assert.equal(result.quadsCreated,result.facesCut*2);
  assert.ok(result.verticesAdded>=2);
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.ok(mesh.normals.every(Number.isFinite));
  assert.ok(buildMeshTopology(mesh).edges.length>topology.edges.length);
});

test("face editing rejects bad selection and unsafe parameters without mutating geometry",()=>{
  const mesh=cubeMesh(),before={positions:mesh.positions.slice(),normals:mesh.normals.slice(),indices:mesh.indices.slice()};
  assert.throws(()=>extrudeFace(mesh,999,.5),/valid face/);
  assert.throws(()=>extrudeFace(mesh,0,0),/non-zero/);
  assert.throws(()=>insetFace(mesh,0,.5),/less than 0.5/);
  assert.deepEqual({positions:mesh.positions,normals:mesh.normals,indices:mesh.indices},before);
});

test("loop cut rejects non-quad faces and invalid edge ids",()=>{
  const mesh={positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],indices:[0,1,2]};
  const topology=buildMeshTopology(mesh);
  assert.throws(()=>loopCutFromEdge(mesh,999,topology),/valid edge/);
  assert.throws(()=>loopCutFromEdge(mesh,0,topology),/quad-face loops/);
});

test("edge bevel trims both adjacent faces and adds a separate bevel strip",()=>{
  const mesh=cubeMesh();
  const topology=buildMeshTopology(mesh);
  const edge=topology.edges.find(item=>item.faces.length===2&&item.useCount===2);
  assert.ok(edge);
  const beforeVertices=mesh.positions.length/3;
  const beforeIndices=mesh.indices.length;
  const result=bevelEdge(mesh,edge.id,.1,topology);
  assert.equal(result.verticesAdded,4);
  assert.equal(result.facesRebuilt,2);
  assert.equal(result.bevelFacesAdded,1);
  assert.equal(mesh.positions.length/3,beforeVertices+4);
  assert.equal(mesh.indices.length,beforeIndices+6);
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.ok(mesh.normals.every(Number.isFinite));
  const rebuilt=buildMeshTopology(mesh);
  assert.equal(rebuilt.faces.length,7);
  assert.ok(rebuilt.faces.some(face=>face.boundary.length===4));
});

test("edge bevel rejects boundary edges and unsafe widths without mutating the mesh",()=>{
  const openMesh={
    positions:[0,0,0,1,0,0,0,1,0],
    normals:[0,0,1,0,0,1,0,0,1],
    indices:[0,1,2]
  };
  const openTopology=buildMeshTopology(openMesh);
  assert.throws(()=>bevelEdge(openMesh,0,.1,openTopology),/exactly two faces/);

  const mesh=cubeMesh(),topology=buildMeshTopology(mesh);
  const edge=topology.edges.find(item=>item.faces.length===2&&item.useCount===2);
  const before={
    positions:mesh.positions.slice(),
    normals:mesh.normals.slice(),
    indices:mesh.indices.slice(),
    faceGroups:mesh.faceGroups.slice()
  };
  assert.throws(()=>bevelEdge(mesh,edge.id,10,topology),/half of each adjoining edge/);
  assert.throws(()=>bevelEdge(mesh,999,.1,topology),/valid edge/);
  assert.deepEqual({
    positions:mesh.positions,
    normals:mesh.normals,
    indices:mesh.indices,
    faceGroups:mesh.faceGroups
  },before);
});

