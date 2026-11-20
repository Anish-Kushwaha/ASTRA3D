#include "astra/kernel.hpp"
#include "astra/renderer.hpp"

#include <cmath>
#include <iostream>
#include <stdexcept>
#include <string>

#define CHECK(condition)                                                        \
    do {                                                                        \
        if (!(condition)) {                                                     \
            throw std::runtime_error("Test failed: " #condition);               \
        }                                                                       \
    } while (false)

int main() {
    try {
        using namespace astra;

        const Vec3 a{1, 2, 3};
        const Vec3 b{4, 5, 6};
        CHECK(a.dot(b) == 32);

        const Vec3 cross = a.cross(b);
        CHECK(cross.x == -3 && cross.y == 6 && cross.z == -3);
        CHECK(std::abs(Vec3{0, 3, 4}.normalized().length() - 1) < 1e-5f);

        const Vec4 identityPoint = Mat4::identity() * Vec4{1, 2, 3, 1};
        CHECK(identityPoint.x == 1 && identityPoint.w == 1);

        const Vec3 translated = transformPoint(
            Mat4::translation({2, 0, -1}), {1, 2, 3});
        CHECK(translated.x == 3 && translated.y == 2 && translated.z == 2);

        using namespace astra::kernel;

        SceneDatabase database;
        const EntityId root = database.create("Root");
        const EntityId child = database.create("Child", root);
        const EntityId leaf = database.create("Leaf", child);

        CHECK(root != kInvalidEntity);
        CHECK(child != kInvalidEntity);
        CHECK(leaf != kInvalidEntity);
        CHECK(database.size() == 3);
        CHECK(database.find(root)->children().size() == 1);
        CHECK(database.find(child)->parent() == root);
        CHECK(database.create("Missing parent", 999999) == kInvalidEntity);
        CHECK(!database.reparent(root, leaf));
        CHECK(!database.reparent(leaf, 999999));

        database.find(root)->transform().position = {2, 0, 0};
        database.find(child)->transform().position = {0, 3, 0};
        const auto childWorld = database.worldMatrix(child);
        CHECK(childWorld.has_value());
        const Vec3 childOrigin = transformPoint(*childWorld, {});
        CHECK(std::abs(childOrigin.x - 2) < 1e-5f);
        CHECK(std::abs(childOrigin.y - 3) < 1e-5f);

        CHECK(database.reparent(leaf, root));
        CHECK(database.find(leaf)->parent() == root);
        CHECK(database.find(root)->children().size() == 2);
        CHECK(database.destroy(child));
        CHECK(database.size() == 2);
        CHECK(database.find(child) == nullptr);
        CHECK(!database.destroy(child));
        CHECK(!database.worldMatrix(child).has_value());

        // A clear operation must not make a previously issued ID valid again.
        SceneDatabase monotonicIds;
        const EntityId oldId = monotonicIds.create("Before clear");
        monotonicIds.clear();
        const EntityId newId = monotonicIds.create("After clear");
        CHECK(newId > oldId);
        CHECK(monotonicIds.find(oldId) == nullptr);
        CHECK(monotonicIds.find(newId) != nullptr);

        // Exercise deep hierarchy deletion without recursive C++ calls.
        SceneDatabase deepHierarchy;
        const EntityId deepRoot = deepHierarchy.create("Root");
        EntityId parent = deepRoot;
        for (int i = 0; i < 20000; ++i) {
            parent = deepHierarchy.create("Nested", parent);
            CHECK(parent != kInvalidEntity);
        }
        CHECK(deepHierarchy.size() == 20001);
        CHECK(deepHierarchy.destroy(deepRoot));
        CHECK(deepHierarchy.size() == 0);

        ResourcePool<std::string> resources;
        const ResourceHandle staleHandle = resources.emplace("mesh");
        CHECK(resources.get(staleHandle) != nullptr);
        CHECK(*resources.get(staleHandle) == "mesh");
        CHECK(resources.erase(staleHandle));
        CHECK(resources.get(staleHandle) == nullptr);
        CHECK(!resources.erase(staleHandle));

        const ResourceHandle replacementHandle = resources.emplace("material");
        CHECK(replacementHandle.index == staleHandle.index);
        CHECK(replacementHandle.generation != staleHandle.generation);
        CHECK(resources.get(staleHandle) == nullptr);
        CHECK(*resources.get(replacementHandle) == "material");

        EventBus events;
        int receivedId = 0;
        int lateListenerCalls = 0;
        bool lateListenerInstalled = false;

        const std::uint64_t listenerToken = events.subscribe<EntityCreated>(
            [&](const EntityCreated& event) {
                receivedId = static_cast<int>(event.id);
                if (!lateListenerInstalled) {
                    events.subscribe<EntityCreated>(
                        [&](const EntityCreated&) { ++lateListenerCalls; });
                    lateListenerInstalled = true;
                }
            });

        events.publish(EntityCreated{42});
        CHECK(receivedId == 42);
        CHECK(lateListenerCalls == 0); // Added listeners start on next publish.

        events.publish(EntityCreated{43});
        CHECK(receivedId == 43);
        CHECK(lateListenerCalls == 1);

        events.unsubscribe<EntityCreated>(listenerToken);
        events.publish(EntityCreated{7});
        CHECK(receivedId == 43);
        CHECK(lateListenerCalls == 2);

        Framebuffer framebuffer(96, 72);
        CHECK(framebuffer.testAndSetDepth(5, 5, 0.5f));
        CHECK(!framebuffer.testAndSetDepth(5, 5, 0.6f));

        Scene scene = Scene::demo();
        Renderer{}.render(
            scene, framebuffer, RenderSettings{.backfaceCulling = false});

        std::size_t nonZeroPixels = 0;
        for (const auto value : framebuffer.colorBuffer()) {
            if (value > 0) ++nonZeroPixels;
        }
        CHECK(nonZeroPixels > 100);

        std::cout << "ASTRA3D test suite passed\n";
        return 0;
    } catch (const std::exception& exception) {
        std::cerr << exception.what() << "\n";
        return 1;
    }
}
