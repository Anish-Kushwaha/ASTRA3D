#include "astra/renderer.hpp"
#include <cmath>
#include <iostream>
#include <stdexcept>
#define CHECK(x) do{if(!(x))throw std::runtime_error("Test failed: " #x);}while(false)
int main(){try{using namespace astra;Vec3 a{1,2,3},b{4,5,6};CHECK(a.dot(b)==32);Vec3 c=a.cross(b);CHECK(c.x==-3&&c.y==6&&c.z==-3);CHECK(std::abs(Vec3{0,3,4}.normalized().length()-1)<1e-5f);Vec4 q=Mat4::identity()*Vec4{1,2,3,1};CHECK(q.x==1&&q.w==1);Vec3 p=transformPoint(Mat4::translation({2,0,-1}),{1,2,3});CHECK(p.x==3&&p.y==2&&p.z==2);Framebuffer fb(96,72);CHECK(fb.testAndSetDepth(5,5,.5f));CHECK(!fb.testAndSetDepth(5,5,.6f));Scene s=Scene::demo();Renderer{}.render(s,fb,RenderSettings{.backfaceCulling=false});std::size_t count=0;for(auto v:fb.colorBuffer())if(v>0)++count;CHECK(count>100);std::cout<<"ASTRA3D test suite passed\n";return 0;}catch(const std::exception&e){std::cerr<<e.what()<<"\n";return 1;}}
