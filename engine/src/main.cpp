#include "astra/renderer.hpp"
#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string>
int main(int argc,char**argv){try{
 std::string output="render.ppm",sceneName="demo",mode="solid";int w=960,h=640;
 for(int i=1;i<argc;++i){std::string a=argv[i];auto val=[&](){if(i+1>=argc)throw std::runtime_error("Missing option value: "+a);return std::string(argv[++i]);};
  if(a=="--output")output=val();else if(a=="--width")w=std::stoi(val());else if(a=="--height")h=std::stoi(val());else if(a=="--scene")sceneName=val();else if(a=="--mode")mode=val();else if(a=="--help"){std::cout<<"ASTRA3D CPU renderer\n--output FILE --width N --height N --scene demo|cube|sphere --mode solid|wireframe\n";return 0;}else throw std::runtime_error("Unknown option: "+a);}
 if(w<16||h<16||w>8192||h>8192)throw std::runtime_error("Resolution must be 16..8192");
 astra::Scene scene=astra::Scene::demo();if(sceneName=="cube"){scene.objects.clear();astra::Object o;o.name="Cube";o.mesh=astra::Mesh::cube(1.8f);o.transform.rotation={.35f,.55f,.1f};scene.objects.push_back(o);}else if(sceneName=="sphere"){scene.objects.clear();astra::Object o;o.name="Sphere";o.mesh=astra::Mesh::uvSphere(1.2f,48,64);scene.objects.push_back(o);}else if(sceneName!="demo")throw std::runtime_error("Unknown scene: "+sceneName);
 astra::RenderSettings cfg;if(mode=="wireframe")cfg.mode=astra::DrawMode::Wireframe;else if(mode!="solid")throw std::runtime_error("Unknown mode: "+mode);
 astra::Framebuffer fb(w,h);astra::Renderer{}.render(scene,fb,cfg);fb.savePpm(output);
 std::cout<<"ASTRA3D 0.2.0 render complete\n"<<w<<" x "<<h<<"\nScene: "<<sceneName<<" | Mode: "<<mode<<"\nOutput: "<<output<<"\n";return EXIT_SUCCESS;
 }catch(const std::exception&e){std::cerr<<"ASTRA3D: "<<e.what()<<"\n";return EXIT_FAILURE;}}
