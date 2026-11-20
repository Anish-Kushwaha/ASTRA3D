#pragma once
#include "astra/math.hpp"
#include <cstdint>
#include <string>
#include <vector>
namespace astra {
struct Vertex{Vec3 position{},normal{0,0,1},color{.72f,.82f,.96f};};
struct Mesh{
 std::string name;std::vector<Vertex> vertices;std::vector<std::uint32_t> indices;
 static Mesh cube(float size=1);static Mesh uvSphere(float radius=1,int rings=16,int sectors=24);static Mesh plane(float size=2);
};
struct Transform{Vec3 position{},rotation{},scale{1,1,1};Mat4 matrix()const;};
struct Camera{
 Vec3 position{3,2.4f,4},target{},up{0,1,0};float fovY{60*kPi/180},nearPlane{.1f},farPlane{100};
 Mat4 view()const{return Mat4::lookAt(position,target,up);}
 Mat4 projection(float aspect)const{return Mat4::perspective(fovY,aspect,nearPlane,farPlane);}
};
struct Object{std::string name;Mesh mesh;Transform transform;};
struct Scene{
 Camera camera;Vec3 ambient{.16f,.18f,.22f},lightDirection{-.5f,-1,-.35f},lightColor{1,.94f,.84f};
 std::vector<Object> objects;static Scene demo();
};
}
