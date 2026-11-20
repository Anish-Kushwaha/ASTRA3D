# ASTRA3D Architecture
Native pipeline: object-space mesh → model matrix → view matrix → projection → perspective divide → viewport mapping → triangle edge functions → depth test → RGB framebuffer → PPM.

Conventions: right-handed world, +Y up, camera looks along -Z, column-major matrices with column vectors, OpenGL-style NDC depth [-1,1], framebuffer depth [0,1] with smaller values closer.

Known limitations in this milestone:
- Homogeneous frustum clipping is not implemented; a primitive crossing the near plane can be distorted.
- Attributes and depth use screen-linear interpolation; perspective-correct interpolation is still required.
- Current lighting is approximate vertex-normal/face-average Lambert shading, not a physically based BRDF.
- Normal transforms need inverse-transpose correction for non-uniform scale.
- No textures, transparency, shadows, motion blur, denoising, acceleration structures, parallel rasterization or GPU backend yet.

Roadmap: homogeneous Sutherland-Hodgman clipping, perspective-correct varyings, inverse-transpose normal matrices, per-pixel shading, OBJ/glTF import, texture/material system, job system/SIMD, OpenGL/Vulkan backend.
