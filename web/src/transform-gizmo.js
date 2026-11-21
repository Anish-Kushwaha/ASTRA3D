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
const add=(a,b)=>a.map((value,index)=>value+b[index]);
const sub=(a,b)=>a.map((value,index)=>value-b[index]);

export function objectBasis(rotation){
  const [rx,ry,rz]=rotation;
  const cx=Math.cos(rx),sx=Math.sin(rx);
  const cy=Math.cos(ry),sy=Math.sin(ry);
  const cz=Math.cos(rz),sz=Math.sin(rz);
  const rotate=([x,y,z])=>{
    const xz=cz*x-sz*y,yz=sz*x+cz*y;
    const xy=cy*xz+sy*z,zy=-sy*xz+cy*z;
    return [xy,cx*yz-sx*zy,sx*yz+cx*zy];
  };
  return [rotate([1,0,0]),rotate([0,1,0]),rotate([0,0,1])];
}

export function transformLocalPoint(object,point){
  const scaled=point.map((value,axis)=>value*object.scale[axis]);
  const basis=objectBasis(object.rotation);
  return object.position.map((value,axis)=>
    value+basis.reduce((sum,direction,index)=>sum+direction[axis]*scaled[index],0)
  );
}

function cameraContext(camera,rect){
  if(!rect?.width||!rect?.height)return null;
  const eye=[
    camera.target[0]+Math.sin(camera.yaw)*Math.cos(camera.pitch)*camera.distance,
    camera.target[1]+Math.sin(camera.pitch)*camera.distance,
    camera.target[2]+Math.cos(camera.yaw)*Math.cos(camera.pitch)*camera.distance
  ];
  const forward=norm(sub(camera.target,eye));
  const right=norm(cross(forward,[0,1,0]));
  const up=cross(right,forward);
  return {eye,forward,right,up,rect,tangent:Math.tan(camera.fov*Math.PI/360),aspect:rect.width/rect.height};
}

function project(point,context){
  const relative=sub(point,context.eye),depth=dot(relative,context.forward);
  if(depth<=1e-6)return null;
  return {
    x:context.rect.width*.5+(dot(relative,context.right)/(depth*context.tangent*context.aspect))*(context.rect.width*.5),
    y:context.rect.height*.5-(dot(relative,context.up)/(depth*context.tangent))*(context.rect.height*.5),
    depth
  };
}

export function buildTransformGizmo(object,camera,rect,tool="move",pivotLocal=[0,0,0]){
  if(!object||!["move","rotate","scale"].includes(tool))return null;
  const context=cameraContext(camera,rect);
  if(!context)return null;
  const origin=transformLocalPoint(object,pivotLocal);
  const center=project(origin,context);
  if(!center)return null;
  const basis=objectBasis(object.rotation);
  const worldLength=Math.max(.2,Math.min(3,camera.distance*.17));
  const axes=basis.map((direction,axis)=>{
    const end=project(add(origin,direction.map(value=>value*worldLength)),context);
    return {axis,direction,start:center,end,worldLength};
  });
  if(axes.some(axis=>!axis.end))return null;
  const rings=[];
  if(tool==="rotate"){
    const radius=worldLength*.78,segments=64;
    for(let axis=0;axis<3;axis++){
      const first=basis[(axis+1)%3],second=basis[(axis+2)%3],points=[];
      for(let step=0;step<=segments;step++){
        const angle=step/segments*Math.PI*2;
        const offset=first.map((value,index)=>
          value*Math.cos(angle)*radius+second[index]*Math.sin(angle)*radius
        );
        const point=project(add(origin,offset),context);
        if(point)points.push(point);
      }
      rings.push({axis,points,direction:basis[axis]});
    }
  }
  return {
    tool,center,axes,rings,
    cameraDirection:norm(sub(context.eye,origin)),
    worldLength
  };
}

function segmentDistance(point,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,lengthSquared=dx*dx+dy*dy;
  const t=lengthSquared?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/lengthSquared)):0;
  return Math.hypot(point.x-(a.x+t*dx),point.y-(a.y+t*dy));
}

export function hitTestTransformGizmo(gizmo,x,y,radius=13){
  if(!gizmo)return null;
  const point={x,y};
  if(gizmo.tool==="rotate"){
    let best=null,bestDistance=radius;
    for(const ring of gizmo.rings){
      for(let index=1;index<ring.points.length;index++){
        const distance=segmentDistance(point,ring.points[index-1],ring.points[index]);
        if(distance<bestDistance){best=ring.axis;bestDistance=distance;}
      }
    }
    return best===null?null:{axis:best,tool:"rotate"};
  }
  let best=null,bestDistance=radius;
  for(const axis of gizmo.axes){
    const distance=segmentDistance(point,axis.start,axis.end);
    if(distance<bestDistance){best=axis.axis;bestDistance=distance;}
  }
  return best===null?null:{axis:best,tool:gizmo.tool};
}

export function axisDragPixels(gizmo,axis,deltaX,deltaY){
  const handle=gizmo?.axes?.[axis];
  if(!handle?.end)return 0;
  const dx=handle.end.x-handle.start.x,dy=handle.end.y-handle.start.y;
  const length=Math.hypot(dx,dy);
  if(length<1e-6)return 0;
  return (deltaX*dx+deltaY*dy)/length;
}

export function axisDragAmount(gizmo,axis,deltaX,deltaY){
  const pixels=axisDragPixels(gizmo,axis,deltaX,deltaY);
  const handle=gizmo?.axes?.[axis];
  if(!handle?.end)return 0;
  const pixelsPerWorldUnit=Math.hypot(handle.end.x-handle.start.x,handle.end.y-handle.start.y)/handle.worldLength;
  return pixelsPerWorldUnit>1e-6?pixels/pixelsPerWorldUnit:0;
}

export function rotationDragAngle(gizmo,axis,startX,startY,currentX,currentY){
  if(!gizmo?.center||!gizmo.axes?.[axis])return 0;
  const center=gizmo.center;
  const start=[startX-center.x,center.y-startY];
  const current=[currentX-center.x,center.y-currentY];
  if(Math.hypot(...start)<2||Math.hypot(...current)<2)return 0;
  const angle=Math.atan2(start[0]*current[1]-start[1]*current[0],dot(start,current));
  const facing=dot(gizmo.axes[axis].direction,gizmo.cameraDirection);
  return angle*(facing>=0?1:-1);
}

export function applyObjectAxisTransform(object,tool,axis,amount,initial){
  if(!object||!initial||!Number.isInteger(axis)||axis<0||axis>2||!Number.isFinite(amount)){
    throw new Error("A valid object, transform axis and finite drag amount are required.");
  }
  if(tool==="move"){
    const direction=objectBasis(initial.rotation)[axis];
    object.position=initial.position.map((value,index)=>value+direction[index]*amount);
  }else if(tool==="rotate"){
    object.rotation=initial.rotation.map((value,index)=>index===axis?value+amount:value);
  }else if(tool==="scale"){
    if(amount<=0)throw new Error("Scale factor must remain positive.");
    object.scale=initial.scale.map((value,index)=>index===axis?Math.max(.001,Math.min(1000,value*amount)):value);
  }else{
    throw new Error("Unsupported transform tool.");
  }
  return object;
}
