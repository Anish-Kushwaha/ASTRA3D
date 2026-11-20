#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>

namespace astra {
constexpr float kEpsilon=1.0e-6f;
constexpr float kPi=3.14159265358979323846f;
struct Vec2{float x{},y{};};
struct Vec3{
 float x{},y{},z{};
 constexpr Vec3()=default; constexpr Vec3(float a,float b,float c):x(a),y(b),z(c){}
 constexpr Vec3 operator+(Vec3 b)const{return{x+b.x,y+b.y,z+b.z};}
 constexpr Vec3 operator-(Vec3 b)const{return{x-b.x,y-b.y,z-b.z};}
 constexpr Vec3 operator-()const{return{-x,-y,-z};}
 constexpr Vec3 operator*(float s)const{return{x*s,y*s,z*s};}
 constexpr Vec3 operator/(float s)const{return{x/s,y/s,z/s};}
 constexpr float dot(Vec3 b)const{return x*b.x+y*b.y+z*b.z;}
 constexpr Vec3 cross(Vec3 b)const{return{y*b.z-z*b.y,z*b.x-x*b.z,x*b.y-y*b.x};}
 float length()const{return std::sqrt(dot(*this));}
 Vec3 normalized()const{float n=length();return n>kEpsilon?*this/n:Vec3{};}
};
inline constexpr Vec3 operator*(float s,Vec3 v){return v*s;}
inline Vec3 hadamard(Vec3 a,Vec3 b){return{a.x*b.x,a.y*b.y,a.z*b.z};}
inline Vec3 clamp(Vec3 v,float lo,float hi){return{std::clamp(v.x,lo,hi),std::clamp(v.y,lo,hi),std::clamp(v.z,lo,hi)};}
struct Vec4{float x{},y{},z{},w{};};
struct Mat4{
 std::array<float,16> m{}; // column-major
 constexpr float& at(int r,int c){return m[static_cast<std::size_t>(c*4+r)];}
 constexpr float at(int r,int c)const{return m[static_cast<std::size_t>(c*4+r)];}
 static Mat4 identity(){Mat4 r{};for(int i=0;i<4;++i)r.at(i,i)=1;return r;}
 static Mat4 translation(Vec3 t){Mat4 r=identity();r.at(0,3)=t.x;r.at(1,3)=t.y;r.at(2,3)=t.z;return r;}
 static Mat4 scale(Vec3 s){Mat4 r{};r.at(0,0)=s.x;r.at(1,1)=s.y;r.at(2,2)=s.z;r.at(3,3)=1;return r;}
 static Mat4 rotationX(float a){Mat4 r=identity();float c=std::cos(a),s=std::sin(a);r.at(1,1)=c;r.at(1,2)=-s;r.at(2,1)=s;r.at(2,2)=c;return r;}
 static Mat4 rotationY(float a){Mat4 r=identity();float c=std::cos(a),s=std::sin(a);r.at(0,0)=c;r.at(0,2)=s;r.at(2,0)=-s;r.at(2,2)=c;return r;}
 static Mat4 rotationZ(float a){Mat4 r=identity();float c=std::cos(a),s=std::sin(a);r.at(0,0)=c;r.at(0,1)=-s;r.at(1,0)=s;r.at(1,1)=c;return r;}
 static Mat4 perspective(float fov,float aspect,float nearP,float farP){
  Mat4 r{};float f=1/std::tan(fov*.5f);r.at(0,0)=f/aspect;r.at(1,1)=f;
  r.at(2,2)=(farP+nearP)/(nearP-farP);r.at(2,3)=2*farP*nearP/(nearP-farP);r.at(3,2)=-1;return r;
 }
 static Mat4 lookAt(Vec3 eye,Vec3 target,Vec3 up){
  Vec3 f=(target-eye).normalized(),s=f.cross(up).normalized(),u=s.cross(f);Mat4 r=identity();
  r.at(0,0)=s.x;r.at(0,1)=s.y;r.at(0,2)=s.z;r.at(0,3)=-s.dot(eye);
  r.at(1,0)=u.x;r.at(1,1)=u.y;r.at(1,2)=u.z;r.at(1,3)=-u.dot(eye);
  r.at(2,0)=-f.x;r.at(2,1)=-f.y;r.at(2,2)=-f.z;r.at(2,3)=f.dot(eye);return r;
 }
};
inline Mat4 operator*(const Mat4&a,const Mat4&b){Mat4 r{};for(int i=0;i<4;++i)for(int j=0;j<4;++j)for(int k=0;k<4;++k)r.at(i,j)+=a.at(i,k)*b.at(k,j);return r;}
inline Vec4 operator*(const Mat4&a,Vec4 v){return{
 a.at(0,0)*v.x+a.at(0,1)*v.y+a.at(0,2)*v.z+a.at(0,3)*v.w,
 a.at(1,0)*v.x+a.at(1,1)*v.y+a.at(1,2)*v.z+a.at(1,3)*v.w,
 a.at(2,0)*v.x+a.at(2,1)*v.y+a.at(2,2)*v.z+a.at(2,3)*v.w,
 a.at(3,0)*v.x+a.at(3,1)*v.y+a.at(3,2)*v.z+a.at(3,3)*v.w};}
inline Vec3 transformPoint(const Mat4&m,Vec3 p){Vec4 q=m*Vec4{p.x,p.y,p.z,1};return std::abs(q.w)>kEpsilon?Vec3{q.x/q.w,q.y/q.w,q.z/q.w}:Vec3{q.x,q.y,q.z};}
inline Vec3 transformVector(const Mat4&m,Vec3 v){Vec4 q=m*Vec4{v.x,v.y,v.z,0};return{q.x,q.y,q.z};}
} // namespace astra
