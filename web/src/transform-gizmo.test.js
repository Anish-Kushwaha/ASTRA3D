import test from "node:test";
import assert from "node:assert/strict";
import {
  objectBasis,transformLocalPoint,buildTransformGizmo,hitTestTransformGizmo,
  axisDragPixels,axisDragAmount,rotationDragAngle,applyObjectAxisTransform
} from "./transform-gizmo.js";

const camera={target:[0,0,0],yaw:0,pitch:0,distance:5,fov:52};
const rect={left:0,top:0,width:400,height:400};
function object(overrides={}){
  return {
    position:[0,0,0],
    rotation:[0,0,0],
    scale:[1,1,1],
    ...overrides
  };
}

test("local transform basis follows ASTRA3D's renderer Euler order",()=>{
  const identity=objectBasis([0,0,0]);
  assert.deepEqual(identity,[[1,0,0],[0,1,0],[0,0,1]]);
  const quarterTurn=objectBasis([0,0,Math.PI/2]);
  assert.ok(Math.abs(quarterTurn[0][0])<1e-10);
  assert.ok(Math.abs(quarterTurn[0][1]-1)<1e-10);
  assert.ok(Math.abs(quarterTurn[1][0]+1)<1e-10);
});

test("local point transformation applies scale, rotation and world position",()=>{
  const item=object({position:[2,3,4],rotation:[0,0,Math.PI/2],scale:[2,3,4]});
  const point=transformLocalPoint(item,[1,0,0]);
  assert.ok(Math.abs(point[0]-2)<1e-10);
  assert.ok(Math.abs(point[1]-5)<1e-10);
  assert.ok(Math.abs(point[2]-4)<1e-10);
});

test("move and scale gizmos project usable axis handles and hit-test them",()=>{
  const item=object();
  const gizmo=buildTransformGizmo(item,camera,rect,"move");
  assert.ok(gizmo);
  assert.ok(Math.abs(gizmo.center.x-200)<1e-8);
  assert.ok(Math.abs(gizmo.center.y-200)<1e-8);
  const x=gizmo.axes[0];
  assert.ok(x.end.x>x.start.x);
  assert.ok(Math.abs(x.end.y-x.start.y)<1e-8);
  assert.deepEqual(hitTestTransformGizmo(gizmo,(x.start.x+x.end.x)/2,x.start.y),{axis:0,tool:"move"});
  const scaleGizmo=buildTransformGizmo(item,camera,rect,"scale");
  assert.deepEqual(hitTestTransformGizmo(scaleGizmo,x.end.x,x.end.y),{axis:0,tool:"scale"});
});

test("axis drag resolves pointer motion to world units",()=>{
  const gizmo=buildTransformGizmo(object(),camera,rect,"move");
  const pixels=axisDragPixels(gizmo,0,20,0);
  const amount=axisDragAmount(gizmo,0,20,0);
  assert.ok(pixels>0);
  assert.ok(amount>0);
  assert.ok(Math.abs(amount/gizmo.axes[0].worldLength-pixels/Math.hypot(
    gizmo.axes[0].end.x-gizmo.axes[0].start.x,
    gizmo.axes[0].end.y-gizmo.axes[0].start.y
  ))<1e-10);
});

test("rotation gizmo builds rings and computes signed angular drags",()=>{
  const gizmo=buildTransformGizmo(object(),camera,rect,"rotate");
  assert.equal(gizmo.rings.length,3);
  assert.ok(gizmo.rings.every(ring=>ring.points.length>40));
  const angle=rotationDragAngle(gizmo,2,250,200,200,150);
  assert.ok(angle>0);
  assert.ok(Math.abs(angle-Math.PI/2)<.03);
  assert.deepEqual(hitTestTransformGizmo(gizmo,250,200),{axis:2,tool:"rotate"});
});

test("object axis transforms use the initial transform and preserve other axes",()=>{
  const item=object({rotation:[0,0,Math.PI/2]});
  const initial={position:[...item.position],rotation:[...item.rotation],scale:[...item.scale]};
  applyObjectAxisTransform(item,"move",0,2,initial);
  assert.ok(Math.abs(item.position[0])<1e-10);
  assert.ok(Math.abs(item.position[1]-2)<1e-10);
  applyObjectAxisTransform(item,"rotate",2,.5,initial);
  assert.equal(item.rotation[2],initial.rotation[2]+.5);
  applyObjectAxisTransform(item,"scale",1,1.5,initial);
  assert.deepEqual(item.scale,[1,1.5,1]);
  assert.throws(()=>applyObjectAxisTransform(item,"scale",0,0,initial),/positive/);
});
