cmake_minimum_required(VERSION 3.20)
project(ASTRA3D VERSION 0.2.0 LANGUAGES CXX)

option(ASTRA_BUILD_TESTS "Build ASTRA3D tests" ON)
option(ASTRA_ENABLE_WARNINGS "Enable strict compiler warnings" ON)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(astra_engine
    engine/src/framebuffer.cpp
    engine/src/renderer.cpp
    engine/src/scene.cpp
    engine/src/kernel.cpp
)
target_include_directories(astra_engine PUBLIC engine/include)
target_compile_features(astra_engine PUBLIC cxx_std_20)

if(ASTRA_ENABLE_WARNINGS)
    if(MSVC)
        target_compile_options(astra_engine PRIVATE /W4 /permissive-)
    else()
        target_compile_options(astra_engine PRIVATE -Wall -Wextra -Wpedantic -Wconversion -Wshadow)
    endif()
endif()

add_executable(astra-render engine/src/main.cpp)
target_link_libraries(astra-render PRIVATE astra_engine)

if(ASTRA_BUILD_TESTS)
    enable_testing()
    add_executable(astra-tests tests/test_main.cpp)
    target_link_libraries(astra-tests PRIVATE astra_engine)
    add_test(NAME astra-tests COMMAND astra-tests)
endif()

install(TARGETS astra_engine astra-render)
install(DIRECTORY engine/include/ DESTINATION include)
