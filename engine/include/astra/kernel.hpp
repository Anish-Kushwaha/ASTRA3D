#pragma once

#include "astra/math.hpp"

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <limits>
#include <memory>
#include <optional>
#include <stdexcept>
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
    Vec3 scale{1.0f, 1.0f, 1.0f};

    Mat4 localMatrix() const;
};

// Hierarchy links are intentionally read-only to callers. SceneDatabase is the
// only type allowed to mutate parent/child relationships, preserving invariants.
class Entity {
public:
    Entity() = default;
    Entity(const Entity&) = delete;
    Entity& operator=(const Entity&) = delete;
    Entity(Entity&&) = delete;
    Entity& operator=(Entity&&) = delete;

    EntityId id() const noexcept { return id_; }
    EntityId parent() const noexcept { return parent_; }
    const std::vector<EntityId>& children() const noexcept { return children_; }

    std::string& name() noexcept { return name_; }
    const std::string& name() const noexcept { return name_; }

    TransformComponent& transform() noexcept { return transform_; }
    const TransformComponent& transform() const noexcept { return transform_; }

    bool active() const noexcept { return active_; }
    void setActive(bool value) noexcept { active_ = value; }

private:
    EntityId id_{kInvalidEntity};
    std::string name_;
    EntityId parent_{kInvalidEntity};
    std::vector<EntityId> children_;
    TransformComponent transform_;
    bool active_{true};

    friend class SceneDatabase;
};

class SceneDatabase {
public:
    // IDs are monotonically allocated for this database's lifetime. clear()
    // invalidates all current IDs but never reuses an earlier ID.
    EntityId create(std::string name, EntityId parent = kInvalidEntity);
    bool destroy(EntityId id);
    bool reparent(EntityId id, EntityId newParent);

    Entity* find(EntityId id) noexcept;
    const Entity* find(EntityId id) const noexcept;

    std::optional<Mat4> worldMatrix(EntityId id) const;
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

// CPU-side generational pool. A slot is permanently retired rather than
// allowing its generation to wrap and accidentally validate an ancient handle.
template<class T>
class ResourcePool {
    struct Slot {
        std::uint32_t generation{1};
        std::unique_ptr<T> value;
        bool retired{false};
    };

public:
    template<class... Args>
    ResourceHandle emplace(Args&&... args) {
        for (std::size_t i = 0; i < slots_.size(); ++i) {
            auto& slot = slots_[i];
            if (!slot.value && !slot.retired) {
                auto value = std::make_unique<T>(std::forward<Args>(args)...);
                slot.value = std::move(value);
                return {static_cast<std::uint32_t>(i), slot.generation};
            }
        }

        const auto maxIndex = static_cast<std::size_t>(
            std::numeric_limits<std::uint32_t>::max());
        if (slots_.size() > maxIndex) {
            throw std::overflow_error("ResourcePool exhausted its 32-bit handle index space");
        }

        auto value = std::make_unique<T>(std::forward<Args>(args)...);
        Slot slot;
        slot.value = std::move(value);
        slots_.push_back(std::move(slot));
        return {static_cast<std::uint32_t>(slots_.size() - 1), slots_.back().generation};
    }

    T* get(ResourceHandle handle) noexcept {
        if (!handle || handle.index >= slots_.size()) return nullptr;
        auto& slot = slots_[handle.index];
        return slot.generation == handle.generation ? slot.value.get() : nullptr;
    }

    const T* get(ResourceHandle handle) const noexcept {
        if (!handle || handle.index >= slots_.size()) return nullptr;
        const auto& slot = slots_[handle.index];
        return slot.generation == handle.generation ? slot.value.get() : nullptr;
    }

    bool erase(ResourceHandle handle) noexcept {
        if (!handle || handle.index >= slots_.size()) return false;

        auto& slot = slots_[handle.index];
        if (slot.generation != handle.generation || !slot.value) return false;

        slot.value.reset();
        if (slot.generation == std::numeric_limits<std::uint32_t>::max()) {
            slot.retired = true;
        } else {
            ++slot.generation;
        }
        return true;
    }

    // Number of allocated slots, including vacant and retired slots.
    std::size_t capacity() const noexcept { return slots_.size(); }

private:
    std::vector<Slot> slots_;
};

// Synchronous, single-threaded event dispatch. publish() iterates a snapshot:
// subscriptions added during dispatch begin on the next publish; removing a
// listener does not cancel a callback already present in the current snapshot.
class EventBus {
    using Listener = std::function<void(const void*)>;

    struct Entry {
        std::uint64_t id;
        Listener callback;
    };

public:
    template<class Event, class Fn>
    std::uint64_t subscribe(Fn&& fn) {
        if (nextListener_ == 0) {
            throw std::overflow_error("EventBus exhausted its listener token space");
        }

        const auto id = nextListener_;
        Listener listener = [callback = std::function<void(const Event&)>(
                                 std::forward<Fn>(fn))](const void* event) {
            callback(*static_cast<const Event*>(event));
        };

        auto& list = listeners_[std::type_index(typeid(Event))];
        list.push_back({id, std::move(listener)});

        if (nextListener_ == std::numeric_limits<std::uint64_t>::max()) {
            nextListener_ = 0;
        } else {
            ++nextListener_;
        }
        return id;
    }

    template<class Event>
    void publish(const Event& event) const {
        const auto it = listeners_.find(std::type_index(typeid(Event)));
        if (it == listeners_.end()) return;

        const auto snapshot = it->second;
        for (const auto& entry : snapshot) {
            entry.callback(&event);
        }
    }

    template<class Event>
    void unsubscribe(std::uint64_t id) {
        const auto it = listeners_.find(std::type_index(typeid(Event)));
        if (it == listeners_.end()) return;

        auto& list = it->second;
        list.erase(
            std::remove_if(list.begin(), list.end(),
                           [id](const Entry& entry) { return entry.id == id; }),
            list.end());
        if (list.empty()) listeners_.erase(it);
    }

    void clear() noexcept { listeners_.clear(); }

private:
    std::uint64_t nextListener_{1};
    std::unordered_map<std::type_index, std::vector<Entry>> listeners_;
};

struct EntityCreated {
    EntityId id;
};

struct EntityDestroyed {
    EntityId id;
};

struct EntityReparented {
    EntityId id;
    EntityId parent;
};

} // namespace astra::kernel
