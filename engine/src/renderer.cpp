#include "astra/renderer.hpp"
#include <algorithm>
#include <cmath>
#include <vector>
namespace astra {
namespace {
struct SV{float x,y,z;Vec3 color,normal;};
float edge(float ax,float ay,float bx,float by,float px,float py){return (px-ax)*(by-ay)-(py-ay)*(bx-ax);}
void line(Framebuffer& fb,const SV&a,const SV&b){
 int x0=static_cast<int>(a.x),y0=static_cast<int>(a.y),x1=static_cast<int>(b.x),y1=static_cast<int>(b.y);
 int dx=std::abs(x1-x0),sx=x0<x1?1:-1,dy=-std::abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;int steps=std::max(dx,-dy),i=0;
 while(true){float t=steps?static_cast<float>(i)/steps:0;fb.setPixel(x0,y0,{.2f,.78f,1},std::clamp(a.z*(1-t)+b.z*t,0.0f,1.0f));if(x0==x1&&y0==y1)break;int e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}++i;}
}
}
void Renderer::render(const Scene&s,Framebuffer&fb,const RenderSettings&cfg)const{
 fb.clear(cfg.clearColor,1);const Mat4 view=s.camera.view(),proj=s.camera.projection(static_cast<float>(fb.width())/fb.height());
 for(const auto&o:s.objects){
  Mat4 model=o.transform.matrix(),mvp=proj*view*model;std::vector<SV> v;v.reserve(o.mesh.vertices.size());
  for(const auto&vert:o.mesh.vertices){Vec4 clip=mvp*Vec4{vert.position.x,vert.position.y,vert.position.z,1};if(clip.w<=kEpsilon){v.push_back({-1e6f,-1e6f,2,vert.color,vert.normal});continue;}
   float nx=clip.x/clip.w,ny=clip.y/clip.w,nz=clip.z/clip.w;v.push_back({(nx*.5f+.5f)*(fb.width()-1),(1-(ny*.5f+.5f))*(fb.height()-1),nz*.5f+.5f,vert.color,transformVector(model,vert.normal).normalized()});}
  for(std::size_t i=0;i+2<o.mesh.indices.size();i+=3){auto ia=o.mesh.indices[i],ib=o.mesh.indices[i+1],ic=o.mesh.indices[i+2];if(ia>=v.size()||ib>=v.size()||ic>=v.size())continue;const SV&a=v[ia],&b=v[ib],&c=v[ic];
   if(cfg.mode==DrawMode::Wireframe){line(fb,a,b);line(fb,b,c);line(fb,c,a);continue;}
   float area=edge(a.x,a.y,b.x,b.y,c.x,c.y);if(std::abs(area)<kEpsilon)continue;if(cfg.backfaceCulling&&area<=0)continue;
   int minx=std::max(0,static_cast<int>(std::floor(std::min({a.x,b.x,c.x})))),maxx=std::min(fb.width()-1,static_cast<int>(std::ceil(std::max({a.x,b.x,c.x}))));
   int miny=std::max(0,static_cast<int>(std::floor(std::min({a.y,b.y,c.y})))),maxy=std::min(fb.height()-1,static_cast<int>(std::ceil(std::max({a.y,b.y,c.y}))));
   Vec3 normal=(a.normal+b.normal+c.normal).normalized();float diffuse=std::max(0.0f,normal.dot(-s.lightDirection.normalized()));Vec3 illumination=cfg.lighting?clamp(s.ambient+s.lightColor*diffuse,0,1):Vec3{1,1,1};Vec3 color=hadamard((a.color+b.color+c.color)/3,illumination);
   for(int y=miny;y<=maxy;++y)for(int x=minx;x<=maxx;++x){float px=x+.5f,py=y+.5f;float w0=edge(b.x,b.y,c.x,c.y,px,py)/area,w1=edge(c.x,c.y,a.x,a.y,px,py)/area,w2=1-w0-w1;if(w0>=0&&w1>=0&&w2>=0){float z=w0*a.z+w1*b.z+w2*c.z;fb.setPixel(x,y,color,z);}}
  }
 }
}
}
