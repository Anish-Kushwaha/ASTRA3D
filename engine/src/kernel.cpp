#include "astra/kernel.hpp"
#include <algorithm>
#include <unordered_set>

namespace astra::kernel {
Mat4 TransformComponent::localMatrix() const {
    return Mat4::translation(position)*Mat4::rotationZ(rotation.z)*
           Mat4::rotationY(rotation.y)*Mat4::rotationX(rotation.x)*Mat4::scale(scale);
}

EntityId SceneDatabase::create(std::string name, EntityId parent) {
    if(parent!=kInvalidEntity && !find(parent)) return kInvalidEntity;
    const EntityId id=nextId_++;
    Entity entity; entity.id=id; entity.name=std::move(name); entity.parent=parent;
    entities_.emplace(id,std::move(entity));
    if(parent!=kInvalidEntity) entities_.at(parent).children.push_back(id);
    return id;
}

bool SceneDatabase::destroy(EntityId id) {
    auto it=entities_.find(id); if(it==entities_.end()) return false;
    const auto children=it->second.children;
    for(EntityId child:children) destroy(child);
    if(it->second.parent!=kInvalidEntity) {
        if(auto* parent=find(it->second.parent)) {
            auto& list=parent->children;
            list.erase(std::remove(list.begin(),list.end(),id),list.end());
        }
    }
    entities_.erase(id); return true;
}

bool SceneDatabase::reparent(EntityId id, EntityId newParent) {
    auto* entity=find(id);
    if(!entity || id==newParent || (newParent!=kInvalidEntity && !find(newParent))) return false;
    for(EntityId cursor=newParent;cursor!=kInvalidEntity;) {
        if(cursor==id) return false;
        const auto* ancestor=find(cursor); if(!ancestor) break;
        cursor=ancestor->parent;
    }
    const EntityId oldParent=entity->parent;
    if(oldParent==newParent) return true;
    if(oldParent!=kInvalidEntity) {
        if(auto* old=find(oldParent)) {
            auto& children=old->children;
            children.erase(std::remove(children.begin(),children.end(),id),children.end());
        }
    }
    entity=find(id); entity->parent=newParent;
    if(newParent!=kInvalidEntity) find(newParent)->children.push_back(id);
    return true;
}

Entity* SceneDatabase::find(EntityId id) {
    auto it=entities_.find(id); return it==entities_.end()?nullptr:&it->second;
}
const Entity* SceneDatabase::find(EntityId id) const {
    auto it=entities_.find(id); return it==entities_.end()?nullptr:&it->second;
}
std::vector<EntityId> SceneDatabase::roots() const {
    std::vector<EntityId> result;
    for(const auto& [id,entity]:entities_) if(entity.parent==kInvalidEntity) result.push_back(id);
    std::sort(result.begin(),result.end()); return result;
}
void SceneDatabase::clear() noexcept { entities_.clear(); nextId_=1; }
} // namespace astra::kernel
