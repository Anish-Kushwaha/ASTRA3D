const V=`#version 300 es
in vec3 aPosition;in vec3 aNormal;uniform mat4 uMVP;uniform mat4 uModel;uniform float uPointSize;out vec3 vNormal;out vec3 vWorld;
void main(){vec4 w=uModel*vec4(aPosition,1.);vWorld=w.xyz;vNormal=mat3(uModel)*aNormal;gl_Position=uMVP*vec4(aPosition,1.);gl_PointSize=uPointSize;}`;
const F=`#version 300 es
precision highp float;in vec3 vNormal;in vec3 vWorld;uniform vec3 uColor;uniform vec3 uLight;uniform vec3 uCamera;uniform int uUnlit;uniform int uPointMode;out vec4 outColor;
void main(){if(uPointMode==1&&length(gl_PointCoord-vec2(.5))>.5)discard;vec3 n=normalize(vNormal),l=normalize(-uLight),v=normalize(uCamera-vWorld),h=normalize(l+v);float d=max(dot(n,l),0.);float s=pow(max(dot(n,h),0.),48.)*.2;vec3 c=uColor*(.18+.82*d)+vec3(s);if(uUnlit==1)c=uColor;outColor=vec4(c,1.);}`;
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)};
const M={
 mul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;},
 perspective(f,a,n,z){let q=1/Math.tan(f/2),k=1/(n-z),o=new Float32Array(16);o[0]=q/a;o[5]=q;o[10]=(z+n)*k;o[11]=-1;o[14]=2*z*n*k;return o;},
 view(e,t,u){let z=norm(sub(e,t)),x=norm(cross(u,z)),y=cross(z,x),o=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,e),-dot(y,e),-dot(z,e),1]);return o;},
 model(p,r,s){let [x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);let rx=new Float32Array([1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1]),ry=new Float32Array([cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1]),rz=new Float32Array([cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1]),sc=new Float32Array([s[0],0,0,0,0,s[1],0,0,0,0,s[2],0,p[0],p[1],p[2],1]);let out=this.mul(this.mul(this.mul(rx,ry),rz),sc);out[12]=p[0];out[13]=p[1];out[14]=p[2];return out;}
};
function cube(){let p=[],n=[],ix=[],faces=[[[0,0,1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,0,-1],[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]],[[1,0,0],[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]],[[-1,0,0],[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]],[[0,1,0],[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]],[[0,-1,0],[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]];for(let f of faces){let b=p.length/3;for(let j=1;j<5;j++){p.push(...f[j]);n.push(...f[0]);}ix.push(b,b+1,b+2,b,b+2,b+3);}return{positions:p,normals:n,indices:ix};}
function sphere(rings=24,sectors=32){let p=[],n=[],ix=[];for(let y=0;y<=rings;y++)for(let x=0;x<=sectors;x++){let a=y/rings*Math.PI,b=x/sectors*2*Math.PI,v=[Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b)];p.push(...v);n.push(...v);}for(let y=0;y<rings;y++)for(let x=0;x<sectors;x++){let a=y*(sectors+1)+x,b=a+sectors+1;ix.push(a,b,a+1,a+1,b,b+1);}return{positions:p,normals:n,indices:ix};}
function plane(){return{positions:[-5,0,-5,5,0,-5,5,0,5,-5,0,5],normals:[0,1,0,0,1,0,0,1,0,0,1,0],indices:[0,2,1,0,3,2]};}
function cylinder(segs=32){let p=[],n=[],ix=[];for(let y=0;y<=1;y++)for(let i=0;i<=segs;i++){let a=i/segs*2*Math.PI,x=Math.cos(a),z=Math.sin(a);p.push(x,y-.5,z);n.push(x,0,z);}for(let i=0;i<segs;i++){let a=i,b=a+segs+1;ix.push(a,b,a+1,a+1,b,b+1);}return{positions:p,normals:n,indices:ix};}
function torus(R=1,r=.3,rs=32,ts=16){let p=[],n=[],ix=[];for(let i=0;i<=rs;i++)for(let j=0;j<=ts;j++){let u=i/rs*2*Math.PI,v=j/ts*2*Math.PI,nx=Math.cos(u)*Math.cos(v),ny=Math.sin(v),nz=Math.sin(u)*Math.cos(v);p.push((R+r*Math.cos(v))*Math.cos(u),r*Math.sin(v),(R+r*Math.cos(v))*Math.sin(u));n.push(nx,ny,nz);}for(let i=0;i<rs;i++)for(let j=0;j<ts;j++){let a=i*(ts+1)+j,b=a+ts+1;ix.push(a,b,a+1,a+1,b,b+1);}return{positions:p,normals:n,indices:ix};}
export const MeshFactory={cube,sphere,plane,cylinder,torus};
const MAX_OBJ_CHARS=32*1024*1024;
const MAX_OBJ_VERTICES=300_000;
const MAX_OBJ_TRIANGLES=1_000_000;
const MAX_OBJ_LINES=2_000_000;
const MAX_OBJ_LINE_CHARS=1_000_000;

export function parseOBJ(src){
  if(typeof src!=="string")throw new Error("OBJ data must be text.");
  if(src.length>MAX_OBJ_CHARS)throw new Error("OBJ file is too large (32 MB maximum).");

  const positions=[],indices=[];
  let lineNumber=0,offset=0;
  while(offset<src.length){
    const newline=src.indexOf("\n",offset);
    const end=newline<0?src.length:newline;
    let rawLine=src.slice(offset,end);
    offset=newline<0?src.length:newline+1;
    if(rawLine.endsWith("\r"))rawLine=rawLine.slice(0,-1);
    lineNumber++;
    if(lineNumber>MAX_OBJ_LINES)throw new Error("OBJ exceeds the 2,000,000-line import limit.");
    if(rawLine.length>MAX_OBJ_LINE_CHARS)throw new Error(`OBJ line ${lineNumber} is too long to parse safely.`);
    const comment=rawLine.indexOf("#");
    const line=rawLine.slice(0,comment<0?undefined:comment).trim();
    if(!line)continue;
    const fields=line.split(/\s+/);
    if(fields[0]==="v"){
      if(fields.length<4)throw new Error(`OBJ line ${lineNumber}: vertex requires three coordinates.`);
      if(positions.length/3>=MAX_OBJ_VERTICES)throw new Error("OBJ exceeds the 300,000-vertex import limit.");
      const point=fields.slice(1,4).map(Number);
      if(!point.every(Number.isFinite))throw new Error(`OBJ line ${lineNumber}: vertex coordinates must be finite numbers.`);
      positions.push(...point);
      continue;
    }
    if(fields[0]!=="f")continue;
    const references=fields.slice(1);
    if(references.length<3)throw new Error(`OBJ line ${lineNumber}: face requires at least three vertices.`);
    if(references.length>10000)throw new Error(`OBJ line ${lineNumber}: face has too many vertices.`);
    const vertexCount=positions.length/3;
    const faceIndices=references.map(reference=>{
      const token=reference.split("/")[0];
      if(!/^[+-]?\d+$/.test(token))throw new Error(`OBJ line ${lineNumber}: invalid face vertex index "${reference}".`);
      const value=Number(token);
      if(!Number.isSafeInteger(value)||value===0)throw new Error(`OBJ line ${lineNumber}: vertex indices cannot be zero.`);
      const index=value>0?value-1:vertexCount+value;
      if(index<0||index>=vertexCount)throw new Error(`OBJ line ${lineNumber}: face references a vertex that does not exist.`);
      return index;
    });
    const triangles=faceIndices.length-2;
    if(indices.length/3+triangles>MAX_OBJ_TRIANGLES)throw new Error("OBJ exceeds the 1,000,000-triangle import limit.");
    for(let index=1;index<faceIndices.length-1;index++){
      indices.push(faceIndices[0],faceIndices[index],faceIndices[index+1]);
    }
  }

  if(!positions.length||!indices.length)throw new Error("OBJ contains no valid vertices and faces.");
  const normals=new Array(positions.length).fill(0);
  for(let index=0;index<indices.length;index+=3){
    const a=indices[index]*3,b=indices[index+1]*3,c=indices[index+2]*3;
    const ab=[positions[b]-positions[a],positions[b+1]-positions[a+1],positions[b+2]-positions[a+2]];
    const ac=[positions[c]-positions[a],positions[c+1]-positions[a+1],positions[c+2]-positions[a+2]];
    const normal=cross(ab,ac);
    for(const offset of [a,b,c]){
      normals[offset]+=normal[0];normals[offset+1]+=normal[1];normals[offset+2]+=normal[2];
    }
  }
  for(let index=0;index<normals.length;index+=3){
    const length=Math.hypot(normals[index],normals[index+1],normals[index+2]);
    if(length>1e-12){
      normals[index]/=length;normals[index+1]/=length;normals[index+2]/=length;
    }else{
      normals[index]=0;normals[index+1]=1;normals[index+2]=0;
    }
  }
  return {positions,normals,indices};
}
export class AstraRenderer{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true});if(!this.gl)throw Error('WebGL 2 is unavailable. Use a browser with WebGL 2 support.');let g=this.gl,sh=(t,s)=>{let x=g.createShader(t);g.shaderSource(x,s);g.compileShader(x);if(!g.getShaderParameter(x,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(x));return x;};this.program=g.createProgram();g.attachShader(this.program,sh(g.VERTEX_SHADER,V));g.attachShader(this.program,sh(g.FRAGMENT_SHADER,F));g.linkProgram(this.program);if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error(g.getProgramInfoLog(this.program));g.useProgram(this.program);this.loc={p:g.getAttribLocation(this.program,'aPosition'),n:g.getAttribLocation(this.program,'aNormal'),mvp:g.getUniformLocation(this.program,'uMVP'),model:g.getUniformLocation(this.program,'uModel'),color:g.getUniformLocation(this.program,'uColor'),light:g.getUniformLocation(this.program,'uLight'),camera:g.getUniformLocation(this.program,'uCamera'),unlit:g.getUniformLocation(this.program,'uUnlit'),pointSize:g.getUniformLocation(this.program,'uPointSize'),pointMode:g.getUniformLocation(this.program,'uPointMode')};this.cache=new Map();this.selectionVao=g.createVertexArray();this.selectionBuffer=g.createBuffer();g.bindVertexArray(this.selectionVao);g.bindBuffer(g.ARRAY_BUFFER,this.selectionBuffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array(0),g.DYNAMIC_DRAW);g.enableVertexAttribArray(this.loc.p);g.vertexAttribPointer(this.loc.p,3,g.FLOAT,false,0,0);g.bindVertexArray(null);this.grid=this.upload(this.makeGrid(),g.LINES);g.enable(g.DEPTH_TEST);g.enable(g.CULL_FACE);g.clearColor(.025,.04,.07,1);}
 makeGrid(){let p=[],n=[],ix=[];for(let i=-10;i<=10;i++){p.push(-10,.001,i,10,.001,i,i,.001,-10,i,.001,10);n.push(0,1,0,0,1,0,0,1,0,0,1,0);let k=p.length/3;ix.push(k-4,k-3,k-2,k-1);}return{positions:p,normals:n,indices:ix};}
 upload(m,mode){let g=this.gl,o={vao:g.createVertexArray(),pointVao:g.createVertexArray(),count:m.indices.length,vertexCount:m.positions.length/3,mode:mode||g.TRIANGLES,buffers:[]};g.bindVertexArray(o.vao);let positionBuffer=null;for(let [loc,data] of [[this.loc.p,m.positions],[this.loc.n,m.normals]]){let b=g.createBuffer();o.buffers.push(b);if(loc===this.loc.p)positionBuffer=b;g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array(data),g.STATIC_DRAW);g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,3,g.FLOAT,false,0,0);}let ib=g.createBuffer();o.buffers.push(ib);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,ib);g.bufferData(g.ELEMENT_ARRAY_BUFFER,new Uint32Array(m.indices),g.STATIC_DRAW);g.bindVertexArray(o.pointVao);g.bindBuffer(g.ARRAY_BUFFER,positionBuffer);g.enableVertexAttribArray(this.loc.p);g.vertexAttribPointer(this.loc.p,3,g.FLOAT,false,0,0);g.bindVertexArray(null);return o;}
 get(m){let o=this.cache.get(m);if(!o){o=this.upload(m);this.cache.set(m,o);}return o;}
 release(mesh){const old=this.cache.get(mesh);if(!old)return;const g=this.gl;g.deleteVertexArray(old.vao);g.deleteVertexArray(old.pointVao);for(const buffer of old.buffers)g.deleteBuffer(buffer);this.cache.delete(mesh);}
 invalidate(mesh){this.release(mesh);}
 prune(objects){
  const active=new Set(objects.map(object=>object.mesh));
  for(const mesh of this.cache.keys())if(!active.has(mesh))this.release(mesh);
 }
 resize(){let d=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.floor(this.canvas.clientWidth*d)),h=Math.max(1,Math.floor(this.canvas.clientHeight*d));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}
 render(objects,camera,selected,grid=true,wire=false,editState=null){let g=this.gl;if(g.isContextLost())return;this.resize();g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(this.program);g.uniform1f(this.loc.pointSize,1);g.uniform1i(this.loc.pointMode,0);let eye=[camera.target[0]+Math.sin(camera.yaw)*Math.cos(camera.pitch)*camera.distance,camera.target[1]+Math.sin(camera.pitch)*camera.distance,camera.target[2]+Math.cos(camera.yaw)*Math.cos(camera.pitch)*camera.distance],view=M.view(eye,camera.target,[0,1,0]),proj=M.perspective(camera.fov*Math.PI/180,this.canvas.width/this.canvas.height,.05,1000);g.uniform3fv(this.loc.light,new Float32Array([-.5,-1,-.4]));g.uniform3fv(this.loc.camera,new Float32Array(eye));if(grid){g.disable(g.CULL_FACE);g.uniform1i(this.loc.unlit,1);g.uniform3fv(this.loc.color,new Float32Array([.14,.2,.28]));let id=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);g.uniformMatrix4fv(this.loc.model,false,id);g.uniformMatrix4fv(this.loc.mvp,false,M.mul(proj,M.mul(view,id)));g.bindVertexArray(this.grid.vao);g.drawElements(g.LINES,this.grid.count,g.UNSIGNED_INT,0);g.enable(g.CULL_FACE);}for(let o of objects){let model=M.model(o.position,o.rotation,o.scale),mvp=M.mul(proj,M.mul(view,model)),gpu=this.get(o.mesh);g.uniformMatrix4fv(this.loc.model,false,model);g.uniformMatrix4fv(this.loc.mvp,false,mvp);g.uniform3fv(this.loc.color,new Float32Array(o.color));g.uniform1i(this.loc.unlit,0);g.bindVertexArray(gpu.vao);if(wire){g.polygonMode?.(g.FRONT_AND_BACK,g.LINE);}g.drawElements(gpu.mode,gpu.count,g.UNSIGNED_INT,0);if(wire)g.polygonMode?.(g.FRONT_AND_BACK,g.FILL);if(o.id===selected){g.disable(g.CULL_FACE);g.uniform1i(this.loc.unlit,1);g.uniform3fv(this.loc.color,new Float32Array([.15,.75,1]));g.lineWidth(2);g.enable(g.POLYGON_OFFSET_LINE);g.polygonOffset(-1,-1);g.drawElements(g.LINES,0,g.UNSIGNED_INT,0);g.disable(g.POLYGON_OFFSET_LINE);g.enable(g.CULL_FACE);}}if(['vertex','edge','face'].includes(editState?.mode)){
  const object=objects.find(item=>item.id===editState.objectId);
  if(object){
    g.depthFunc(g.LEQUAL);
    const model=M.model(object.position,object.rotation,object.scale);
    const mvp=M.mul(proj,M.mul(view,model));
    const gpu=this.get(object.mesh);
    g.uniformMatrix4fv(this.loc.model,false,model);
    g.uniformMatrix4fv(this.loc.mvp,false,mvp);
    g.uniform1i(this.loc.unlit,1);
    const drawLines=(segments,color,width=1)=>{
      if(!segments.length)return;
      const points=[];
      for(const segment of segments){
        points.push(...object.mesh.positions.slice(segment[0]*3,segment[0]*3+3));
        points.push(...object.mesh.positions.slice(segment[1]*3,segment[1]*3+3));
      }
      g.uniform1i(this.loc.pointMode,0);
      g.uniform1f(this.loc.pointSize,1);
      g.uniform3fv(this.loc.color,new Float32Array(color));
      g.lineWidth(width);
      g.bindVertexArray(this.selectionVao);
      g.bindBuffer(g.ARRAY_BUFFER,this.selectionBuffer);
      g.bufferData(g.ARRAY_BUFFER,new Float32Array(points),g.DYNAMIC_DRAW);
      g.drawArrays(g.LINES,0,points.length/3);
    };
    if(editState.mode==='vertex'){
      g.uniform1i(this.loc.pointMode,1);
      g.uniform1f(this.loc.pointSize,8);
      g.uniform3fv(this.loc.color,new Float32Array([.86,.88,.9]));
      g.bindVertexArray(gpu.pointVao);
      g.drawArrays(g.POINTS,0,gpu.vertexCount);
      const selectedIndices=[...new Set(editState.selectedVertices||[])].filter(index=>Number.isInteger(index)&&index>=0&&index<gpu.vertexCount);
      if(selectedIndices.length){
        const points=[];
        for(const index of selectedIndices)points.push(...object.mesh.positions.slice(index*3,index*3+3));
        g.bindVertexArray(this.selectionVao);
        g.bindBuffer(g.ARRAY_BUFFER,this.selectionBuffer);
        g.bufferData(g.ARRAY_BUFFER,new Float32Array(points),g.DYNAMIC_DRAW);
        g.uniform3fv(this.loc.color,new Float32Array([1,.46,.12]));
        g.uniform1f(this.loc.pointSize,12);
        g.drawArrays(g.POINTS,0,selectedIndices.length);
      }
    }else{
      const topology=editState.topology;
      if(topology){
        drawLines(topology.edges.map(edge=>[edge.a,edge.b]),[.42,.48,.56],1);
        if(editState.mode==='edge'){
          const selected=new Set(editState.selectedEdges||[]);
          drawLines(topology.edges.filter(edge=>selected.has(edge.id)).map(edge=>[edge.a,edge.b]),[1,.46,.12],3);
        }
        if(editState.mode==='face'){
          const selected=new Set(editState.selectedFaces||[]);
          const outlines=[];
          for(const face of topology.faces){
            if(!selected.has(face.id))continue;
            for(const edge of face.boundary)outlines.push([edge.a,edge.b]);
          }
          drawLines(outlines,[1,.46,.12],3);
        }
      }
    }
  }
}
g.depthFunc(g.LESS);g.uniform1i(this.loc.pointMode,0);g.uniform1f(this.loc.pointSize,1);g.bindVertexArray(null);}
}

export function pickObject(objects, camera, canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = 1 - ((clientY - rect.top) / rect.height) * 2;
  const eye = [
    camera.target[0] + Math.sin(camera.yaw) * Math.cos(camera.pitch) * camera.distance,
    camera.target[1] + Math.sin(camera.pitch) * camera.distance,
    camera.target[2] + Math.cos(camera.yaw) * Math.cos(camera.pitch) * camera.distance
  ];
  const forward = norm(sub(camera.target, eye));
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tangent = Math.tan(camera.fov * Math.PI / 360);
  const aspect = rect.width / rect.height;
  const direction = norm([
    forward[0] + right[0] * x * tangent * aspect + up[0] * y * tangent,
    forward[1] + right[1] * x * tangent * aspect + up[1] * y * tangent,
    forward[2] + right[2] * x * tangent * aspect + up[2] * y * tangent
  ]);
  let closest = Infinity;
  let selected = null;
  let tested = 0;
  const maxTriangles = 300000;
  for (const object of objects) {
    const mesh = object.mesh;
    if (!mesh?.positions || !mesh?.indices) continue;
    const model = M.model(object.position, object.rotation, object.scale);
    const worldVertex = index => {
      const offset = index * 3;
      const vx = mesh.positions[offset], vy = mesh.positions[offset + 1], vz = mesh.positions[offset + 2];
      return [
        model[0] * vx + model[4] * vy + model[8] * vz + model[12],
        model[1] * vx + model[5] * vy + model[9] * vz + model[13],
        model[2] * vx + model[6] * vy + model[10] * vz + model[14]
      ];
    };
    const indices = mesh.indices;
    for (let i = 0; i + 2 < indices.length && tested < maxTriangles; i += 3, tested++) {
      const a = worldVertex(indices[i]), b = worldVertex(indices[i + 1]), c = worldVertex(indices[i + 2]);
      const edge1 = sub(b, a), edge2 = sub(c, a);
      const h = cross(direction, edge2), determinant = dot(edge1, h);
      if (Math.abs(determinant) < 1e-8) continue;
      const inverse = 1 / determinant, offset = sub(eye, a);
      const u = inverse * dot(offset, h);
      if (u < 0 || u > 1) continue;
      const q = cross(offset, edge1), v = inverse * dot(direction, q);
      if (v < 0 || u + v > 1) continue;
      const distance = inverse * dot(edge2, q);
      if (distance > 0 && distance < closest) {
        closest = distance;
        selected = object.id;
      }
    }
    if (tested >= maxTriangles) break;
  }
  return selected;
}
