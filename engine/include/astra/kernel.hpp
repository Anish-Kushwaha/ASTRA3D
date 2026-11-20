#pragma once
#include "astra/math.hpp"
#include <cstdint>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <typeindex>
#include <unordered_map>
#include <utility>
#include <vector>

namespace astra::kernel {
using EntityId = std::uint64_t;
constexpr EntityId kInvalidEntity = 0;

struct TransformComponent {
    Vec3 position{};
    Vec3 rotation{};
    Vec3 scale{1,1,1};
    Mat4 localMatrix() const;
};

struct Entity {
    EntityId id{kInvalidEntity};
    std::string name;
    EntityId parent{kInvalidEntity};
    std::vector<EntityId> children;
    TransformComponent transform;
    bool active{true};
};

class SceneDatabase {
public:
    EntityId create(std::string name, EntityId parent = kInvalidEntity);
    bool destroy(EntityId id);
    bool reparent(EntityId id, EntityId newParent);
    Entity* find(EntityId id);
    const Entity* find(EntityId id) const;
    std::vector<EntityId> roots() const;
    std::size_t size() const noexcept { return entities_.size(); }
    void clear() noexcept;
private:
    EntityId nextId_{1};
    std::unordered_map<EntityId, Entity> entities_;
};

struct ResourceHandle {
    std::uint32_t index{0};
    std::uint32_t generation{0};
    explicit operator bool() const noexcept { return generation != 0; }
    friend bool operator==(const ResourceHandle&, const ResourceHandle&) = default;
};

template<class T>
class ResourcePool {
    struct Slot { std::uint32_t generation{1}; std::unique_ptr<T> value; };
public:
    template<class... Args> ResourceHandle emplace(Args&&... args) {
        for(std::uint32_t i=0;i<slots_.size();++i) if(!slots_[i].value) {
            slots_[i].value=std::make_unique<T>(std::forward<Args>(args)...);
            return {i,slots_[i].generation};
        }
        Slot slot; slot.value=std::make_unique<T>(std::forward<Args>(args)...);
        slots_.push_back(std::move(slot));
        return {static_cast<std::uint32_t>(slots_.size()-1),slots_.back().generation};
    }
    T* get(ResourceHandle h) noexcept {
        if(h.index>=slots_.size()) return nullptr;
        auto& s=slots_[h.index]; return s.generation==h.generation?s.value.get():nullptr;
    }
    const T* get(ResourceHandle h) const noexcept {
        if(h.index>=slots_.size()) return nullptr;
        const auto& s=slots_[h.index]; return s.generation==h.generation?s.value.get():nullptr;
    }
    bool erase(ResourceHandle h) noexcept {
        if(h.index>=slots_.size()) return false;
        auto& s=slots_[h.index]; if(s.generation!=h.generation||!s.value) return false;
        s.value.reset(); ++s.generation; if(s.generation==0) ++s.generation; return true;
    }
    std::size_t capacity() const noexcept { return slots_.size(); }
private:
    std::vector<Slot> slots_;
};

class EventBus {
    using Listener = std::function<void(const void*)>;
    struct Entry { std::uint64_t id; Listener callback; };
public:
    template<class Event, class Fn> std::uint64_t subscribe(Fn&& fn) {
        const auto id=nextListener_++;
        auto& list=listeners_[std::type_index(typeid(Event))];
        list.push_back({id,[callback=std::function<void(const Event&)>(std::forward<Fn>(fn))](const void* event){callback(*static_cast<const Event*>(event));}});
        return id;
    }
    template<class Event> void publish(const Event& event) const {
        auto it=listeners_.find(std::type_index(typeid(Event)));
        if(it==listeners_.end()) return;
        const auto snapshot=it->second;
        for(const auto& entry:snapshot) entry.callback(&event);
    }
    template<class Event> void unsubscribe(std::uint64_t id) {
        auto it=listeners_.find(std::type_index(typeid(Event)));
        if(it==listeners_.end()) return;
        auto& list=it->second;
        list.erase(std::remove_if(list.begin(),list.end(),[id](const Entry& e){return e.id==id;}),list.end());
    }
private:
    std::uint64_t nextListener_{1};
    std::unordered_map<std::type_index,std::vector<Entry>> listeners_;
};

struct EntityCreated { EntityId id; };
struct EntityDestroyed { EntityId id; };
struct EntityReparented { EntityId id; EntityId parent; };
} // namespace astra::kernel
