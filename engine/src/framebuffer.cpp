#include "astra/framebuffer.hpp"
#include <fstream>
#include <stdexcept>
namespace astra {
Framebuffer::Framebuffer(int w,int h){resize(w,h);}
void Framebuffer::resize(int w,int h){if(w<=0||h<=0)throw std::invalid_argument("Framebuffer dimensions must be positive");width_=w;height_=h;auto n=static_cast<std::size_t>(w)*static_cast<std::size_t>(h);color_.assign(n*3,0);depth_.assign(n,1);}
void Framebuffer::clear(Vec3 c,float d){c=clamp(c,0,1);for(std::size_t i=0;i<depth_.size();++i){color_[i*3]=static_cast<std::uint8_t>(c.x*255);color_[i*3+1]=static_cast<std::uint8_t>(c.y*255);color_[i*3+2]=static_cast<std::uint8_t>(c.z*255);depth_[i]=d;}}
bool Framebuffer::testAndSetDepth(int x,int y,float d){if(x<0||x>=width_||y<0||y>=height_||d<0||d>1)return false;auto i=static_cast<std::size_t>(y)*static_cast<std::size_t>(width_)+static_cast<std::size_t>(x);if(d>=depth_[i])return false;depth_[i]=d;return true;}
void Framebuffer::setPixel(int x,int y,Vec3 c,float d){if(!testAndSetDepth(x,y,d))return;auto i=(static_cast<std::size_t>(y)*static_cast<std::size_t>(width_)+static_cast<std::size_t>(x))*3;c=clamp(c,0,1);color_[i]=static_cast<std::uint8_t>(c.x*255);color_[i+1]=static_cast<std::uint8_t>(c.y*255);color_[i+2]=static_cast<std::uint8_t>(c.z*255);}
void Framebuffer::savePpm(const std::string&p)const{std::ofstream f(p,std::ios::binary);if(!f)throw std::runtime_error("Cannot open output: "+p);f<<"P6\n"<<width_<<" "<<height_<<"\n255\n";f.write(reinterpret_cast<const char*>(color_.data()),static_cast<std::streamsize>(color_.size()));if(!f)throw std::runtime_error("Framebuffer write failed");}
}
