#pragma once
#include "astra/framebuffer.hpp"
#include "astra/scene.hpp"
namespace astra {
enum class DrawMode{Solid,Wireframe};
struct RenderSettings{DrawMode mode{DrawMode::Solid};bool lighting{true};bool backfaceCulling{true};Vec3 clearColor{.025f,.04f,.075f};};
class Renderer{
public:void render(const Scene& scene,Framebuffer& target,const RenderSettings& settings={})const;
};
}
