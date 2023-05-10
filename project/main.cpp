// #define COW_PATCH_FRAMERATE
// #define COW_PATCH_FRAMERATE_SLEEP
#include "include.cpp"

vec3 getRGB(vec3 p) {
    p.x /= 255;
    p.y /= 255;
    p.z /= 255;
    return p;
}

void platform() {
    char *fragment_shader_source = _load_file_into_char_array("project.frag");
    char *vertex_shader_source = R""(
        #version 330 core
        layout (location = 0) in vec3 vertex_position;
        void main() {
            gl_Position = vec4(vertex_position, 1.0);
        }
    )"";

    Shader shader = shader_create(vertex_shader_source, 1, fragment_shader_source);

    #define MAX_NUM_LIGHTS 6
    int num_lights = 6;
    vec3 light_positions_world[MAX_NUM_LIGHTS] = {};
    vec3 sun_color = V3(244, 233, 155);
    sun_color = getRGB(sun_color);

    vec3 light_colors[MAX_NUM_LIGHTS] = { sun_color, sun_color, sun_color, sun_color, sun_color, sun_color };

    {
        int k = 0;
        light_positions_world[k++] = {  0.0,  0.0,  3.0 };
        light_positions_world[k++] = {  0.0,  0.0, -3.0 };
        light_positions_world[k++] = {  0.0,  3.0,  0.0 };
        light_positions_world[k++] = {  0.0, -3.0,  0.0 };
        light_positions_world[k++] = {  3.0,  0.0,  0.0 };
        light_positions_world[k++] = { -3.0,  0.0,  0.0 };
    }


    IndexedTriangleMesh3D mesh = library.meshes.square;
    Camera3D camera = { 5.0 };
    real iTime = 0.0;

    real ambientStrength = 0.1;
    real diffuseStrength = 0.6;
    real specularStrength = 0.0;
    real shininess = 12.0;
    real constant = 1.0;
    real linear = 0.09;
    real quadratic = 0.032;
    real p_x = 0.0;
    real p_y = 0.0;
    real p_z = 0.0;
    real p_r = 0.0;

    while (cow_begin_frame()) {
        //camera_move(&camera);
        gui_slider("Number of lights", &num_lights, 0, MAX_NUM_LIGHTS, 'j', 'k');
        gui_printf("");
        gui_slider("Ambient Strength", &ambientStrength, 0.0, 2.0);
        gui_slider("Diffuse Strength", &diffuseStrength, 0.0, 2.0);
        gui_slider("Specular Strength", &specularStrength, 0.0, 2.0);
        gui_slider("Shininess", &shininess, 0.0, 256.0);

        gui_slider("p_x", &p_x, -1.0, 1.0);
        gui_slider("p_y", &p_y, -1.0, 1.0);
        gui_slider("p_z", &p_z, -1.0, 1.0);
        gui_slider("p_r", &p_r, 0.0, 1.0);

        shader_set_uniform(&shader, "iTime", iTime);
        shader_set_uniform(&shader, "iResolution", window_get_size());
        shader_set_uniform(&shader, "C", camera_get_C(&camera));

        shader_set_uniform(&shader, "num_lights", num_lights);
        shader_set_uniform(&shader, "light_positions_world", num_lights, light_positions_world);
        shader_set_uniform(&shader, "light_colors", num_lights, light_colors);
        shader_set_uniform(&shader, "ambientStrength", ambientStrength);
        shader_set_uniform(&shader, "diffuseStrength", diffuseStrength);
        shader_set_uniform(&shader, "specularStrength", specularStrength);
        shader_set_uniform(&shader, "shininess", shininess);
        shader_set_uniform(&shader, "constant", constant);
        shader_set_uniform(&shader, "linear", linear);
        shader_set_uniform(&shader, "quadratic", quadratic);
        shader_set_uniform(&shader, "p_x", p_x);
        shader_set_uniform(&shader, "p_y", p_y);
        shader_set_uniform(&shader, "p_z", p_z);
        shader_set_uniform(&shader, "p_r", p_r);

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





