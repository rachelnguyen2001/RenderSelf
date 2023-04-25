// #define COW_PATCH_FRAMERATE
// #define COW_PATCH_FRAMERATE_SLEEP
#include "include.cpp"


void platform() {
    char *fragment_shader_source = _load_file_into_char_array("hw9b.frag");
    char *vertex_shader_source = R""(
        #version 330 core
        layout (location = 0) in vec3 vertex_position;
        void main() {
            gl_Position = vec4(vertex_position, 1.0);
        }
    )"";

    Shader shader = shader_create(vertex_shader_source, 1, fragment_shader_source);

    IndexedTriangleMesh3D mesh = library.meshes.square;
    Camera3D camera = { 5.0 };
    // bool playing = false;
    real iTime = 0.0;
    while (cow_begin_frame()) {
        // gui_checkbox("playing", &playing, 'p');
        // if (playing) { iTime += .0167; }
        camera_move(&camera);
        shader_set_uniform(&shader, "iTime", iTime);
        shader_set_uniform(&shader, "iResolution", window_get_size());
        shader_set_uniform(&shader, "C", camera_get_C(&camera));
        shader_pass_vertex_attribute(&shader, mesh.num_vertices, mesh.vertex_positions);
        shader_draw(&shader, mesh.num_triangles, mesh.triangle_indices);
    }
}

int main() {
    APPS {
        APP(platform);
    }
    return 0;
}





