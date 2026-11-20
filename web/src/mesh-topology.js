import {recomputeNormals} from "./mesh-edit.js";

const EPSILON=1e-6;
const MAX_EDIT_VERTICES=300000;
const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const sub=(a,b)=>a.map((value,index)=>value-b[index]);
const norm=value=>{
  const length=Math.hypot(...value);
  return length>1e-12?value.map(component=>component/length):[0,0,0];
};
const positionAt=(mesh,index)=>mesh.positions.slice(index*3,index*3+3);
const pointKey=point=>point.map(value=>Math.round(value/EPSILON)).join(",");
const vertexKey=(mesh,index)=>pointKey(positionAt(mesh,index));
const edgeKey=(a,b)=>a<b?a+"|"+b:b+"|"+a;

function makeUnion(size){
  const parent=Array.from({length:size},(_,index)=>index);
  const find=value=>{
    while(parent[value]!==value){
      parent[value]=parent[parent[value]];
      value=parent[value];
    }
    return value;
  };
  return {
    find,
    join(a,b){
      const rootA=find(a),rootB=find(b);
      if(rootA!==rootB)parent[rootB]=rootA;
    }
  };
}

function projectContext(camera,canvas){
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  const eye=[
    camera.target[0]+Math.sin(camera.yaw)*Math.cos(camera.pitch)*camera.distance,
    camera.target[1]+Math.sin(camera.pitch)*camera.distance,
    camera.target[2]+Math.cos(camera.yaw)*Math.cos(camera.pitch)*camera.distance
  ];
  const forward=norm(sub(camera.target,eye));
  const right=norm(cross(forward,[0,1,0]));
  const up=cross(right,forward);
  return {rect,eye,forward,right,up,tangent:Math.tan(camera.fov*Math.PI/360),aspect:rect.width/rect.height};
}

function worldVertexTransform(object){
  const [rx,ry,rz]=object.rotation;
  const cr=Math.cos(rz),sr=Math.sin(rz),cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
  const scale=object.scale,position=object.position,positions=object.mesh.positions;
  return index=>{
    const offset=index*3;
    const x=positions[offset]*scale[0],y=positions[offset+1]*scale[1],z=positions[offset+2]*scale[2];
    const xz=cr*x-sr*y,yz=sr*x+cr*y;
    const xy=cy*xz+sy*z,zy=-sy*xz+cy*z;
    return [xy+position[0],cx*yz-sx*zy+position[1],sx*yz+cx*zy+position[2]];
  };
}

function projectPoint(point,context){
  const relative=sub(point,context.eye),depth=dot(relative,context.forward);
  if(depth<=1e-8)return null;
  return {
    x:context.rect.width/2+(dot(relative,context.right)/(depth*context.tangent*context.aspect))*(context.rect.width/2),
    y:context.rect.height/2-(dot(relative,context.up)/(depth*context.tangent))*(context.rect.height/2),
    depth
  };
}

function orderBoundary(boundary){
  if(boundary.length<3)throw new Error("The selected face has no closed boundary.");
  const byStart=new Map();
  for(const edge of boundary){
    if(byStart.has(edge.aKey))throw new Error("The selected face boundary is non-manifold.");
    byStart.set(edge.aKey,edge);
  }
  const ordered=[];
  let current=boundary[0],start=current.aKey;
  const used=new Set();
  while(current&&!used.has(current.key)){
    ordered.push(current);
    used.add(current.key);
    if(current.bKey===start)break;
    current=byStart.get(current.bKey);
  }
  if(ordered.length!==boundary.length||ordered.at(-1).bKey!==start){
    throw new Error("Only a single closed face boundary is supported by this operation.");
  }
  return ordered;
}

function facePolygon(mesh,face){
  const boundary=orderBoundary(face.boundary);
  return {boundary,vertices:boundary.map(edge=>edge.a),points:boundary.map(edge=>positionAt(mesh,edge.a))};
}

function faceNormal(mesh,face){
  const sum=[0,0,0];
  for(const triangle of face.triangles){
    const ids=mesh.indices.slice(triangle*3,triangle*3+3);
    const a=positionAt(mesh,ids[0]),b=positionAt(mesh,ids[1]),c=positionAt(mesh,ids[2]);
    const n=cross(sub(b,a),sub(c,a));
    for(let axis=0;axis<3;axis++)sum[axis]+=n[axis];
  }
  const result=norm(sum);
  if(Math.hypot(...result)<1e-10)throw new Error("The selected face has a degenerate normal.");
  return result;
}

function assertEditableMesh(mesh){
  if(!mesh||!Array.isArray(mesh.positions)||!Array.isArray(mesh.indices)||mesh.indices.length%3!==0){
    throw new Error("The selected object does not contain editable triangle geometry.");
  }
  if(mesh.positions.length/3>MAX_EDIT_VERTICES){
    throw new Error("Topology editing is currently limited to meshes with at most 300,000 vertices.");
  }
}

function assertCapacity(mesh,additionalVertices,additionalIndices,baseVertexCount=mesh.positions.length/3){
  if(baseVertexCount+additionalVertices>2_000_000)throw new Error("This edit would exceed ASTRA3D's 2,000,000-vertex scene limit.");
  if(mesh.indices.length+additionalIndices>18_000_000)throw new Error("This edit would exceed the safe mesh index limit.");
}

function appendVertex(mesh,point){
  const id=mesh.positions.length/3;
  mesh.positions.push(...point);
  return id;
}

function appendQuad(indices,a,b,c,d){
  indices.push(a,b,c,a,c,d);
}

function isConvexPolygon(points,normal){
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],c=points[(i+2)%points.length];
    if(dot(cross(sub(b,a),sub(c,b)),normal)<-1e-7)return false;
  }
  return true;
}

export function buildMeshTopology(mesh){
  assertEditableMesh(mesh);
  const positions=mesh.positions,indices=mesh.indices;
  const triangleCount=indices.length/3;
  if(triangleCount>1_000_000)throw new Error("Topology analysis is limited to 1,000,000 triangles.");
  const triangles=[],edgeUses=new Map();
  for(let triangle=0;triangle<triangleCount;triangle++){
    const ids=indices.slice(triangle*3,triangle*3+3);
    const points=ids.map(index=>positionAt(mesh,index));
    const raw=cross(sub(points[1],points[0]),sub(points[2],points[0]));
    const normal=norm(raw);
    const triangleData={ids,points,normal,plane:dot(normal,points[0]),edgeKeys:[]};
    triangles.push(triangleData);
    for(let side=0;side<3;side++){
      const a=ids[side],b=ids[(side+1)%3],aKey=pointKey(points[side]),bKey=pointKey(points[(side+1)%3]);
      const key=edgeKey(aKey,bKey);
      triangleData.edgeKeys.push(key);
      if(!edgeUses.has(key))edgeUses.set(key,[]);
      edgeUses.get(key).push({triangle,a,b,aKey,bKey,key});
    }
  }

  const grouped=new Map();
  const suppliedFaceGroups=Array.isArray(mesh.faceGroups)&&mesh.faceGroups.length===triangleCount&&
    mesh.faceGroups.every(value=>Number.isInteger(value)&&value>=0);
  if(suppliedFaceGroups){
    for(let triangle=0;triangle<triangleCount;triangle++){
      const label=mesh.faceGroups[triangle];
      if(!grouped.has(label))grouped.set(label,[]);
      grouped.get(label).push(triangle);
    }
  }else{
    const union=makeUnion(triangleCount);
    for(const uses of edgeUses.values()){
      if(uses.length<2)continue;
      for(let i=0;i<uses.length;i++)for(let j=i+1;j<uses.length;j++){
        const left=triangles[uses[i].triangle],right=triangles[uses[j].triangle];
        if(dot(left.normal,right.normal)>.99999&&Math.abs(left.plane-right.plane)<1e-5){
          union.join(uses[i].triangle,uses[j].triangle);
        }
      }
    }
    for(let triangle=0;triangle<triangleCount;triangle++){
      const root=union.find(triangle);
      if(!grouped.has(root))grouped.set(root,[]);
      grouped.get(root).push(triangle);
    }
  }

  const faces=[],triangleFaceIds=new Array(triangleCount).fill(-1);
  for(const triangleIds of grouped.values()){
    const faceId=faces.length,set=new Set(triangleIds),boundaryUses=[];
    const visitedFaceEdges=new Set();
    for(const triangleId of triangleIds){
      for(const key of triangles[triangleId].edgeKeys){
        if(visitedFaceEdges.has(key))continue;
        visitedFaceEdges.add(key);
        const inside=edgeUses.get(key).filter(use=>set.has(use.triangle));
        if(inside.length===1)boundaryUses.push(inside[0]);
      }
    }
    const boundary=boundaryUses.map(use=>({
      a:use.a,b:use.b,aKey:use.aKey,bKey:use.bKey,key:use.key
    }));
    let ordered;
    try{ordered=orderBoundary(boundary);}catch{ordered=boundary;}
    const unique=new Map();
    for(const edge of ordered){unique.set(edge.aKey,positionAt(mesh,edge.a));}
    const center=[0,0,0];
    for(const point of unique.values())for(let axis=0;axis<3;axis++)center[axis]+=point[axis]/Math.max(1,unique.size);
    const normal=norm(triangleIds.reduce((sum,id)=>{
      const n=triangles[id].normal;
      return sum.map((value,axis)=>value+n[axis]);
    },[0,0,0]));
    for(const id of triangleIds)triangleFaceIds[id]=faceId;
    faces.push({id:faceId,triangles:triangleIds,boundary:ordered,center,normal});
  }

  const edges=[],edgeByKey=new Map();
  for(const [key,uses] of edgeUses){
    const adjacent=[...new Set(uses.map(use=>triangleFaceIds[use.triangle]))];
    if(uses.length>1&&adjacent.length===1)continue;
    const use=uses[0],edge={id:edges.length,key,a:use.a,b:use.b,aKey:use.aKey,bKey:use.bKey,faces:adjacent};
    edges.push(edge);
    edgeByKey.set(key,edge);
  }
  mesh.faceGroups=triangleFaceIds.slice();
  return {edges,faces,triangleFaceIds,edgeByKey};
}

export function pickEdge(object,topology,camera,canvas,clientX,clientY,radius=10){
  const context=projectContext(camera,canvas);
  if(!context||!object?.mesh)return null;
  const world=worldVertexTransform(object),pointerX=clientX-context.rect.left,pointerY=clientY-context.rect.top;
  let best=null,bestDistance=radius*radius,bestDepth=Infinity;
  for(const edge of topology.edges){
    const a=projectPoint(world(edge.a),context),b=projectPoint(world(edge.b),context);
    if(!a||!b)continue;
    const dx=b.x-a.x,dy=b.y-a.y,lengthSquared=dx*dx+dy*dy;
    const t=lengthSquared?Math.max(0,Math.min(1,((pointerX-a.x)*dx+(pointerY-a.y)*dy)/lengthSquared)):0;
    const px=a.x+t*dx,py=a.y+t*dy;
    const distance=(px-pointerX)**2+(py-pointerY)**2;
    const depth=a.depth+(b.depth-a.depth)*t;
    if(distance<bestDistance||(distance===bestDistance&&depth<bestDepth)){
      best=edge.id;bestDistance=distance;bestDepth=depth;
    }
  }
  return best;
}

export function pickFace(object,topology,camera,canvas,clientX,clientY){
  const context=projectContext(camera,canvas);
  if(!context||!object?.mesh)return null;
  const pointerX=clientX-context.rect.left,pointerY=clientY-context.rect.top;
  const ndcX=pointerX/context.rect.width*2-1,ndcY=1-pointerY/context.rect.height*2;
  const direction=norm(context.forward.map((value,axis)=>
    value+context.right[axis]*ndcX*context.tangent*context.aspect+context.up[axis]*ndcY*context.tangent
  ));
  const world=worldVertexTransform(object),mesh=object.mesh;
  let closest=Infinity,selected=null;
  for(let triangle=0;triangle<mesh.indices.length/3;triangle++){
    const ids=mesh.indices.slice(triangle*3,triangle*3+3);
    const a=world(ids[0]),b=world(ids[1]),c=world(ids[2]);
    const edge1=sub(b,a),edge2=sub(c,a),h=cross(direction,edge2),determinant=dot(edge1,h);
    if(Math.abs(determinant)<1e-8)continue;
    const inverse=1/determinant,offset=sub(context.eye,a),u=inverse*dot(offset,h);
    if(u<0||u>1)continue;
    const q=cross(offset,edge1),v=inverse*dot(direction,q);
    if(v<0||u+v>1)continue;
    const distance=inverse*dot(edge2,q);
    if(distance>0&&distance<closest){closest=distance;selected=topology.triangleFaceIds[triangle];}
  }
  return selected;
}

export function extrudeFace(mesh,faceId,distance,topology=buildMeshTopology(mesh)){
  assertEditableMesh(mesh);
  if(!Number.isFinite(distance)||Math.abs(distance)<1e-8)throw new Error("Extrusion distance must be a non-zero finite number.");
  const face=topology.faces[faceId];
  if(!face)throw new Error("Select a valid face before extruding.");
  const polygon=facePolygon(mesh,face),normal=faceNormal(mesh,face);
  const topMap=new Map(),capIndices=[],sideIndices=[],baseVertexCount=mesh.positions.length/3;
  let nextFaceGroup=topology.triangleFaceIds.reduce((maximum,value)=>Math.max(maximum,value),-1)+1;
  for(const triangle of face.triangles){
    const ids=mesh.indices.slice(triangle*3,triangle*3+3);
    for(const id of ids){
      const key=vertexKey(mesh,id);
      if(!topMap.has(key)){
        const point=positionAt(mesh,id).map((value,axis)=>value+normal[axis]*distance);
        topMap.set(key,{id:baseVertexCount+topMap.size,point});
      }
      capIndices.push(topMap.get(key).id);
    }
  }
  for(const edge of polygon.boundary){
    const topA=topMap.get(edge.aKey).id,topB=topMap.get(edge.bKey).id;
    sideIndices.push(edge.a,edge.b,topB,edge.a,topB,topA);
  }
  assertCapacity(mesh,topMap.size,capIndices.length+sideIndices.length);
  for(const value of topMap.values())mesh.positions.push(...value.point);
  const addedFaceGroups=Array(capIndices.length/3).fill(nextFaceGroup++);
  for(let edge=0;edge<polygon.boundary.length;edge++)addedFaceGroups.push(nextFaceGroup++,nextFaceGroup++);
  mesh.indices.push(...capIndices,...sideIndices);
  mesh.faceGroups=[...topology.triangleFaceIds,...addedFaceGroups];
  recomputeNormals(mesh);
  return {verticesAdded:topMap.size,facesExtruded:1,trianglesAdded:face.triangles.length+polygon.boundary.length*2};
}

export function insetFace(mesh,faceId,amount=.15,topology=buildMeshTopology(mesh)){
  assertEditableMesh(mesh);
  if(!Number.isFinite(amount)||amount<=0||amount>=.5)throw new Error("Inset amount must be greater than 0 and less than 0.5.");
  const face=topology.faces[faceId];
  if(!face)throw new Error("Select a valid face before insetting.");
  const polygon=facePolygon(mesh,face),normal=faceNormal(mesh,face);
  if(!isConvexPolygon(polygon.points,normal))throw new Error("Inset currently supports convex faces only.");
  const center=[0,0,0];
  for(const point of polygon.points)for(let axis=0;axis<3;axis++)center[axis]+=point[axis]/polygon.points.length;
  const inner=polygon.points.map(point=>point.map((value,axis)=>center[axis]+(value-center[axis])*(1-amount)));
  const baseVertexCount=mesh.positions.length/3;
  const innerIds=inner.map((_,index)=>baseVertexCount+index);
  const faceSet=new Set(face.triangles),kept=[],keptGroups=[];
  for(let triangle=0;triangle<mesh.indices.length/3;triangle++){
    if(!faceSet.has(triangle)){kept.push(...mesh.indices.slice(triangle*3,triangle*3+3));keptGroups.push(topology.triangleFaceIds[triangle]);}
  }
  const added=[],addedGroups=[];
  let nextFaceGroup=topology.triangleFaceIds.reduce((maximum,value)=>Math.max(maximum,value),-1)+1;
  for(let i=0;i<polygon.vertices.length;i++){
    const next=(i+1)%polygon.vertices.length;
    appendQuad(added,polygon.vertices[i],polygon.vertices[next],innerIds[next],innerIds[i]);
    addedGroups.push(nextFaceGroup++,nextFaceGroup++);
  }
  const innerFaceGroup=nextFaceGroup++;
  for(let i=1;i<innerIds.length-1;i++){added.push(innerIds[0],innerIds[i],innerIds[i+1]);addedGroups.push(innerFaceGroup);}
  assertCapacity(mesh,innerIds.length,added.length);
  for(const point of inner)mesh.positions.push(...point);
  mesh.indices=[...kept,...added];
  mesh.faceGroups=[...keptGroups,...addedGroups];
  recomputeNormals(mesh);
  return {verticesAdded:innerIds.length,facesInset:1,trianglesAdded:added.length/3};
}

export function loopCutFromEdge(mesh,edgeId,topology=buildMeshTopology(mesh),ratio=.5){
  assertEditableMesh(mesh);
  if(!Number.isFinite(ratio)||ratio<=0||ratio>=1)throw new Error("Loop cut position must be between 0 and 1.");
  const startEdge=topology.edges[edgeId];
  if(!startEdge)throw new Error("Select a valid edge before adding a loop cut.");
  let currentEdge=startEdge,currentFaceId=startEdge.faces[0];
  if(currentFaceId===undefined)throw new Error("The selected edge is not attached to a face.");
  const cuts=[],visitedFaces=new Set(),visitedEdges=new Set(),edgePoints=new Map();
  const edgePoint=edge=>{
    if(edgePoints.has(edge.key))return edgePoints.get(edge.key).id;
    const canonical=edge.aKey<edge.bKey;
    const from=positionAt(mesh,canonical?edge.a:edge.b),to=positionAt(mesh,canonical?edge.b:edge.a);
    const t=canonical?ratio:1-ratio;
    const point=from.map((value,axis)=>value+(to[axis]-value)*t);
    const id=mesh.positions.length/3+edgePoints.size;
    edgePoints.set(edge.key,{id,point});
    return id;
  };
  while(currentFaceId!==undefined&&!visitedFaces.has(currentFaceId)){
    const face=topology.faces[currentFaceId];
    if(!face)break;
    const polygon=facePolygon(mesh,face);
    if(polygon.boundary.length!==4)throw new Error("Loop Cut currently follows quad-face loops only. Select an edge on a quad mesh.");
    const edgeIndex=polygon.boundary.findIndex(edge=>edge.key===currentEdge.key);
    if(edgeIndex<0)throw new Error("The edge is not part of the adjacent face boundary.");
    const opposite=polygon.boundary[(edgeIndex+2)%4];
    cuts.push({faceId:currentFaceId,polygon,currentEdge:polygon.boundary[edgeIndex],opposite});
    visitedFaces.add(currentFaceId);
    visitedEdges.add(currentEdge.key);
    if(visitedEdges.has(opposite.key))break;
    const neighbor=topology.edgeByKey.get(opposite.key);
    if(!neighbor)break;
    const nextFace=neighbor.faces.find(id=>id!==currentFaceId&&!visitedFaces.has(id));
    if(nextFace===undefined)break;
    currentEdge=neighbor;
    currentFaceId=nextFace;
  }
  if(!cuts.length)throw new Error("No quad faces were found along this edge loop.");
  const replacement=new Map();
  for(const cut of cuts){
    const i=cut.polygon.boundary.findIndex(edge=>edge.key===cut.currentEdge.key);
    const vertices=cut.polygon.vertices,next=(i+1)%4,opposite=(i+2)%4,last=(i+3)%4;
    const startPoint=edgePoint(cut.currentEdge),endPoint=edgePoint(cut.opposite);
    replacement.set(cut.faceId,[
      [vertices[next],vertices[opposite],endPoint,startPoint],
      [startPoint,endPoint,vertices[last],vertices[i]]
    ]);
  }
  const kept=[],keptGroups=[];
  for(let triangle=0;triangle<mesh.indices.length/3;triangle++){
    if(!replacement.has(topology.triangleFaceIds[triangle])){kept.push(...mesh.indices.slice(triangle*3,triangle*3+3));keptGroups.push(topology.triangleFaceIds[triangle]);}
  }
  const added=[],addedGroups=[];
  let nextFaceGroup=topology.triangleFaceIds.reduce((maximum,value)=>Math.max(maximum,value),-1)+1;
  for(const polygons of replacement.values())for(const polygon of polygons){appendQuad(added,...polygon);addedGroups.push(nextFaceGroup++,nextFaceGroup++);}
  assertCapacity(mesh,edgePoints.size,added.length);
  for(const point of edgePoints.values())mesh.positions.push(...point.point);
  mesh.indices=[...kept,...added];
  mesh.faceGroups=[...keptGroups,...addedGroups];
  recomputeNormals(mesh);
  return {facesCut:cuts.length,verticesAdded:edgePoints.size,quadsCreated:cuts.length*2};
}
