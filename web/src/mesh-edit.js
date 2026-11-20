const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
const cross=(a,b)=>[
  a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],
  a[0]*b[1]-a[1]*b[0]
];
const norm=value=>{
  const length=Math.hypot(...value);
  return length>1e-12?value.map(component=>component/length):[0,0,0];
};

function worldVertexTransform(object){
  const [rx,ry,rz]=object.rotation;
  const cr=Math.cos(rz),sr=Math.sin(rz);
  const cy=Math.cos(ry),sy=Math.sin(ry);
  const cx=Math.cos(rx),sx=Math.sin(rx);
  const scale=object.scale,position=object.position,positions=object.mesh.positions;
  return index=>{
    const offset=index*3;
    const x=positions[offset]*scale[0];
    const y=positions[offset+1]*scale[1];
    const z=positions[offset+2]*scale[2];
    const xz=cr*x-sr*y,yz=sr*x+cr*y;
    const xy=cy*xz+sy*z,zy=-sy*xz+cy*z;
    return [
      xy+position[0],
      cx*yz-sx*zy+position[1],
      sx*yz+cx*zy+position[2]
    ];
  };
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
  const vertexCount=Math.min(object.mesh.positions.length/3,300000);
  const getWorldVertex=worldVertexTransform(object);
  let best=null,bestDistance=radius*radius,bestDepth=Infinity;
  for(let index=0;index<vertexCount;index++){
    const world=getWorldVertex(index);
    const relative=world.map((value,axis)=>value-eye[axis]);
    const depth=dot(relative,forward);
    if(depth<=0)continue;
    const screenX=rect.width/2+(dot(relative,right)/(depth*tangent*aspect))*(rect.width/2);
    const screenY=rect.height/2-(dot(relative,up)/(depth*tangent))*(rect.height/2);
    const dx=screenX-pointerX,dy=screenY-pointerY,distance=dx*dx+dy*dy;
    if(distance<bestDistance||(distance===bestDistance&&depth<bestDepth)){
      best=index;
      bestDistance=distance;
      bestDepth=depth;
    }
  }
  return best;
}

export function recomputeNormals(mesh){
  const positions=mesh.positions,indices=mesh.indices;
  const normals=new Array(positions.length).fill(0);
  for(let i=0;i<indices.length;i+=3){
    const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3;
    const abx=positions[ib]-positions[ia];
    const aby=positions[ib+1]-positions[ia+1];
    const abz=positions[ib+2]-positions[ia+2];
    const acx=positions[ic]-positions[ia];
    const acy=positions[ic+1]-positions[ia+1];
    const acz=positions[ic+2]-positions[ia+2];
    const nx=aby*acz-abz*acy;
    const ny=abz*acx-abx*acz;
    const nz=abx*acy-aby*acx;
    for(const offset of [ia,ib,ic]){
      normals[offset]+=nx;
      normals[offset+1]+=ny;
      normals[offset+2]+=nz;
    }
  }
  for(let i=0;i<normals.length;i+=3){
    const length=Math.hypot(normals[i],normals[i+1],normals[i+2]);
    if(length>1e-12){
      normals[i]/=length;
      normals[i+1]/=length;
      normals[i+2]/=length;
    }else{
      normals[i]=0;
      normals[i+1]=1;
      normals[i+2]=0;
    }
  }
  mesh.normals=normals;
  return mesh;
}

export function translateSelectedVertices(object,indices,delta){
  if(!object?.mesh?.positions)throw new Error("Select a mesh before moving vertices.");
  if(!Array.isArray(indices)||indices.length===0)throw new Error("Select at least one vertex.");
  if(!Array.isArray(delta)||delta.length!==3||!delta.every(Number.isFinite)){
    throw new Error("Vertex movement requires three finite values.");
  }
  const count=Math.min(object.mesh.positions.length/3,300000);
  const unique=[...new Set(indices)];
  if(unique.some(index=>!Number.isInteger(index)||index<0||index>=count)){
    throw new Error("Vertex selection contains an invalid or unsupported index (editing is currently limited to the first 300,000 vertices).");
  }
  for(const index of unique){
    for(let axis=0;axis<3;axis++){
      if(!Number.isFinite(object.mesh.positions[index*3+axis]+delta[axis])){
        throw new Error("Vertex movement would produce a non-finite position.");
      }
    }
  }
  for(const index of unique){
    for(let axis=0;axis<3;axis++)object.mesh.positions[index*3+axis]+=delta[axis];
  }
  recomputeNormals(object.mesh);
  return unique.length;
}
