#pragma once
#include "astra/math.hpp"
#include <cstdint>
#include <string>
#include <vector>
namespace astra {
class Framebuffer{
public:
 Framebuffer(int width,int height);void resize(int width,int height);void clear(Vec3 color={0,0,0},float depth=1);
 void setPixel(int x,int y,Vec3 color,float depth);bool testAndSetDepth(int x,int y,float depth);void savePpm(const std::string& path)const;
 int width()const{return width_;}int height()const{return height_;}
 const std::vector<std::uint8_t>& colorBuffer()const{return color_;}
private:int width_{},height_{};std::vector<std::uint8_t> color_;std::vector<float> depth_;
};
}
