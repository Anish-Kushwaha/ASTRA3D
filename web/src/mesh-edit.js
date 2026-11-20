const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const norm=value=>{const length=Math.hypot(...value);return length>1e-12?value.map(component=>component/length):[0,0,0];};

function worldVertex(object,index){
  const offset=index*3,positions=object.mesh.positions;
  let x=positions[offset]*object.scale[0];
  let y=positions[offset+1]*object.scale[1];
  let z=positions[offset+2]*object.scale[2];
  const [rx,ry,rz]=object.rotation;
  let c=Math.cos(rz),s=Math.sin(rz),nextX=c*x-s*y,nextY=s*x+c*y;
  x=nextX;y=nextY;
  c=Math.cos(ry);s=Math.sin(ry);nextX=c*x+s*z;let nextZ=-s*x+c*z;
  x=nextX;z=nextZ;
  c=Math.cos(rx);s=Math.sin(rx);nextY=c*y-s*z;nextZ=s*y+c*z;
  return [x+object.position[0],nextY+object.position[1],nextZ+object.position[2]];
}

export function pickVertex(object,camera,canvas,clientX,clientY,radius=14){
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height||!object?.mesh?.positions)return null;
  const eye=[
    camera.target[0]+Math.sin(camera.yaw)*Math.cos(camera.pitch)*camera.distance,
    camera.target[1]+Math.sin(camera.pitch)*camera.distance,
    camera.target[2]+Math.cos(camera.yaw)*Math.cos(camera.pitch)*camera.distance
  ];
  const forward=norm(camera.target.map((value,index)=>value-eye[index]));
  const right=norm(cross(forward,[0,1,0]));
  const up=cross(right,forward);
  const tangent=Math.tan(camera.fov*Math.PI/360);
  const aspect=rect.width/rect.height;
  const pointerX=clientX-rect.left,pointerY=clientY-rect.top;
  const positions=object.mesh.positions;
  const vertexCount=Math.min(positions.length/3,300000);
  let best=null,bestDistance=radius*radius,bestDepth=Infinity;
  for(let index=0;index<vertexCount;index++){
    const relative=worldVertex(object,index).map((value,axis)=>value-eye[axis]);
    const depth=dot(relative,forward);
    if(depth<=0)continue;
    const screenX=rect.width/2+(dot(relative,right)/(depth*tangent*aspect))*(rect.width/2);
    const screenY=rect.height/2-(dot(relative,up)/(depth*tangent))*(rect.height/2);
    const dx=screenX-pointerX,dy=screenY-pointerY,distance=dx*dx+dy*dy;
    if(distance<bestDistance||(distance===bestDistance&&depth<bestDepth)){
      best=index;bestDistance=distance;bestDepth=depth;
    }
  }
  return best;
}

export function recomputeNormals(mesh){
  const count=mesh.positions.length/3;
  const normals=new Array(mesh.positions.length).fill(0);
  for(let i=0;i<mesh.indices.length;i+=3){
    const ia=mesh.indices[i],ib=mesh.indices[i+1],ic=mesh.indices[i+2];
    const read=index=>mesh.positions.slice(index*3,index*3+3);
    const a=read(ia),b=read(ib),c=read(ic);
    const face=cross(b.map((value,axis)=>value-a[axis]),c.map((value,axis)=>value-a[axis]));
    for(const index of [ia,ib,ic])for(let axis=0;axis<3;axis++)normals[index*3+axis]+=face[axis];
  }
  for(let index=0;index<count;index++){
    const unit=norm(normals.slice(index*3,index*3+3));
    const safe=unit.every(Number.isFinite)&&Math.hypot(...unit)>0?unit:[0,1,0];
    normals.splice(index*3,3,...safe);
  }
  mesh.normals=normals;
  return mesh;
}

export function translateSelectedVertices(object,indices,delta){
  if(!object?.mesh?.positions)throw new Error("Select a mesh before moving vertices.");
  if(!Array.isArray(indices)||indices.length===0)throw new Error("Select at least one vertex.");
  if(!Array.isArray(delta)||delta.length!==3||!delta.every(Number.isFinite))throw new Error("Vertex movement requires three finite values.");
  const count=object.mesh.positions.length/3;
  const unique=[...new Set(indices)];
  if(unique.some(index=>!Number.isInteger(index)||index<0||index>=count))throw new Error("Vertex selection contains an invalid index.");
  for(const index of unique)for(let axis=0;axis<3;axis++)object.mesh.positions[index*3+axis]+=delta[axis];
  recomputeNormals(object.mesh);
  return unique.length;
}
