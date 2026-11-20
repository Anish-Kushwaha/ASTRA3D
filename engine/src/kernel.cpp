#include "astra/kernel.hpp"

#include <algorithm>
#include <limits>
#include <vector>

namespace astra::kernel {

Mat4 TransformComponent::localMatrix() const {
    return Mat4::translation(position) *
           Mat4::rotationZ(rotation.z) *
           Mat4::rotationY(rotation.y) *
           Mat4::rotationX(rotation.x) *
           Mat4::scale(scale);
}

EntityId SceneDatabase::create(std::string name, EntityId parent) {
    if (nextId_ == kInvalidEntity) return kInvalidEntity;

    Entity* parentEntity = nullptr;
    if (parent != kInvalidEntity) {
        parentEntity = find(parent);
        if (!parentEntity) return kInvalidEntity;

        // Reserve before inserting the entity so the hierarchy update cannot
        // leave an orphaned entity if vector allocation fails.
        parentEntity->children_.reserve(parentEntity->children_.size() + 1);
    }

    const EntityId id = nextId_;
    const auto [it, inserted] = entities_.try_emplace(id);
    if (!inserted) return kInvalidEntity;

    Entity& entity = it->second;
    entity.id_ = id;
    entity.name_ = std::move(name);
    entity.parent_ = parent;

    if (parentEntity) parentEntity->children_.push_back(id);

    if (nextId_ == std::numeric_limits<EntityId>::max()) {
        nextId_ = kInvalidEntity;
    } else {
        ++nextId_;
    }
    return id;
}

bool SceneDatabase::destroy(EntityId id) {
    const Entity* root = find(id);
    if (!root) return false;

    // Collect first, mutate second. This avoids recursive call-stack growth and
    // leaves the database unchanged if temporary traversal allocation fails.
    std::vector<EntityId> pending;
    std::vector<EntityId> removalOrder;
    pending.reserve(entities_.size());
    removalOrder.reserve(entities_.size());
    pending.push_back(id);

    while (!pending.empty()) {
        const EntityId currentId = pending.back();
        pending.pop_back();

        const Entity* current = find(currentId);
        if (!current) continue;

        for (const EntityId child : current->children_) {
            pending.push_back(child);
        }
        removalOrder.push_back(currentId);
    }

    const EntityId parentId = root->parent_;
    if (parentId != kInvalidEntity) {
        if (Entity* parent = find(parentId)) {
            auto& siblings = parent->children_;
            siblings.erase(
                std::remove(siblings.begin(), siblings.end(), id),
                siblings.end());
        }
    }

    for (const EntityId removeId : removalOrder) {
        entities_.erase(removeId);
    }
    return true;
}

bool SceneDatabase::reparent(EntityId id, EntityId newParent) {
    Entity* entity = find(id);
    if (!entity || id == newParent) return false;
    if (newParent != kInvalidEntity && !find(newParent)) return false;

    for (EntityId ancestorId = newParent;
         ancestorId != kInvalidEntity;) {
        if (ancestorId == id) return false;

        const Entity* ancestor = find(ancestorId);
        if (!ancestor) return false;
        ancestorId = ancestor->parent_;
    }

    const EntityId oldParentId = entity->parent_;
    if (oldParentId == newParent) return true;

    Entity* oldParent = oldParentId == kInvalidEntity ? nullptr : find(oldParentId);
    Entity* newParentEntity = newParent == kInvalidEntity ? nullptr : find(newParent);
    if (oldParentId != kInvalidEntity && !oldParent) return false;

    if (newParentEntity) {
        // Allocate before unlinking from the old parent for strong exception safety.
        newParentEntity->children_.reserve(newParentEntity->children_.size() + 1);
    }

    if (oldParent) {
        auto& oldChildren = oldParent->children_;
        oldChildren.erase(
            std::remove(oldChildren.begin(), oldChildren.end(), id),
            oldChildren.end());
    }

    entity->parent_ = newParent;
    if (newParentEntity) newParentEntity->children_.push_back(id);
    return true;
}

Entity* SceneDatabase::find(EntityId id) noexcept {
    const auto it = entities_.find(id);
    return it == entities_.end() ? nullptr : &it->second;
}

const Entity* SceneDatabase::find(EntityId id) const noexcept {
    const auto it = entities_.find(id);
    return it == entities_.end() ? nullptr : &it->second;
}

std::optional<Mat4> SceneDatabase::worldMatrix(EntityId id) const {
    const Entity* entity = find(id);
    if (!entity) return std::nullopt;

    std::vector<const Entity*> chain;
    chain.reserve(std::min<std::size_t>(entities_.size(), 32));

    while (entity) {
        // A valid hierarchy cannot contain more ancestors than there are
        // entities. This guard also turns internal corruption into a safe miss.
        if (chain.size() >= entities_.size()) return std::nullopt;
        chain.push_back(entity);

        if (entity->parent_ == kInvalidEntity) break;
        entity = find(entity->parent_);
        if (!entity) return std::nullopt;
    }

    Mat4 result = Mat4::identity();
    for (auto it = chain.rbegin(); it != chain.rend(); ++it) {
        result = result * (*it)->transform_.localMatrix();
    }
    return result;
}

std::vector<EntityId> SceneDatabase::roots() const {
    std::vector<EntityId> result;
    result.reserve(entities_.size());
    for (const auto& [id, entity] : entities_) {
        if (entity.parent_ == kInvalidEntity) result.push_back(id);
    }
    std::sort(result.begin(), result.end());
    return result;
}

void SceneDatabase::clear() noexcept {
    entities_.clear();
    // Do not reset nextId_: old EntityId values must never alias new entities.
}

} // namespace astra::kernel
