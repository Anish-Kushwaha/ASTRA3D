#include "astra/scene.hpp"
#include <algorithm>
#include <cmath>
namespace astra {
Mat4 Transform::matrix()const{return Mat4::translation(position)*Mat4::rotationZ(rotation.z)*Mat4::rotationY(rotation.y)*Mat4::rotationX(rotation.x)*Mat4::scale(scale);}
Mesh Mesh::cube(float size){
 Mesh m;m.name="Cube";float s=size*.5f;
 Vec3 p[]={{-s,-s,-s},{s,-s,-s},{s,s,-s},{-s,s,-s},{-s,-s,s},{s,-s,s},{s,s,s},{-s,s,s}};
 std::uint32_t ix[]={0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5};
 for(auto v:p)m.vertices.push_back({v,v.normalized(),{.55f,.76f,.98f}});
 m.indices.assign(std::begin(ix),std::end(ix));return m;
}
Mesh Mesh::uvSphere(float radius,int rings,int sectors){
 Mesh m;m.name="UV Sphere";rings=std::max(3,rings);sectors=std::max(3,sectors);
 for(int r=0;r<=rings;++r){float phi=static_cast<float>(r)/rings*kPi;for(int s=0;s<=sectors;++s){float theta=static_cast<float>(s)/sectors*2*kPi;Vec3 n{std::sin(phi)*std::cos(theta),std::cos(phi),std::sin(phi)*std::sin(theta)};m.vertices.push_back({n*radius,n,{.48f,.84f,.76f}});}}
 for(int r=0;r<rings;++r)for(int s=0;s<sectors;++s){auto a=static_cast<std::uint32_t>(r*(sectors+1)+s),b=a+static_cast<std::uint32_t>(sectors+1);m.indices.insert(m.indices.end(),{a,b,a+1,a+1,b,b+1});}
 return m;
}
Mesh Mesh::plane(float size){Mesh m;m.name="Plane";float s=size*.5f;m.vertices={{{-s,0,-s},{0,1,0},{.55f,.65f,.78f}},{{s,0,-s},{0,1,0},{.55f,.65f,.78f}},{{s,0,s},{0,1,0},{.55f,.65f,.78f}},{{-s,0,s},{0,1,0},{.55f,.65f,.78f}}};m.indices={0,2,1,0,3,2};return m;}
Scene Scene::demo(){Scene s;Object c;c.name="Cube";c.mesh=Mesh::cube(1.5f);c.transform.rotation={.25f,.55f,0};s.objects.push_back(c);Object sp;sp.name="Sphere";sp.mesh=Mesh::uvSphere(.8f,20,28);sp.transform.position={2,0,0};s.objects.push_back(sp);Object pl;pl.name="Ground";pl.mesh=Mesh::plane(8);pl.transform.position={0,-1.3f,0};s.objects.push_back(pl);s.camera.position={4.6f,3,6.5f};s.camera.target={.5f,-.2f,0};return s;}
}
