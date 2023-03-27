// #define COW_PATCH_FRAMERATE
// #define COW_PATCH_FRAMERATE_SLEEP
#include "include.cpp"



void hw6a() {
    Shader shader = {}; {
        char *vertex_shader_source = R""(
            #version 330 core
            uniform mat4 P;
            uniform mat4 V;
            uniform mat4 M;
            layout (location = 0) in vec3 p_model;
            out vec2 uv;
            void main() {
                uv = p_model.xy;
                gl_Position = P * V * M * vec4(p_model, 1.0);
            }
        )"";

        char *fragment_shader_source = R""(
            #version 330 core
            uniform float time;
            in vec2 uv;
            out vec4 fragColor;
            void main() {
                float TAU = 6.283185307179586;
                fragColor = vec4(sin(-10.0 * time + uv.x * 10.0 * TAU), sin(uv.y * 10.0 * TAU), 0.2, 1.0);
            }
        )"";

        shader = shader_create(vertex_shader_source, 1, fragment_shader_source);
    }

    IndexedTriangleMesh3D mesh = {}; {
        mesh.num_triangles = 2;
        mesh.triangle_indices = (int3 *) malloc(mesh.num_triangles * sizeof(int3)); {
            int k = 0;
            mesh.triangle_indices[k++] = { 0, 1, 2 };
            mesh.triangle_indices[k++] = { 0, 2, 3 }; 
        }
        mesh.num_vertices = 4;
        mesh.vertex_positions = (vec3 *) malloc(mesh.num_vertices * sizeof(vec3)); {
            int k = 0;
            mesh.vertex_positions[k++] = { 0.0, 0.0, 0.0 };
            mesh.vertex_positions[k++] = { 1.0, 0.0, 0.0 };
            mesh.vertex_positions[k++] = { 1.0, 1.0, 0.0 };
            mesh.vertex_positions[k++] = { 0.0, 1.0, 0.0 };
        } 
    }

    Camera3D camera = { 3.0 };
    real time = 0.0;

    while (cow_begin_frame()) {
        time += 0.0167;
        camera_move(&camera);
        mat4 P = camera_get_P(&camera);
        mat4 V = camera_get_V(&camera);
        mat4 M = globals.Identity;

        shader_set_uniform(&shader, "P", P);
        shader_set_uniform(&shader, "V", V);
        shader_set_uniform(&shader, "M", M);
        shader_set_uniform(&shader, "time", time);
        shader_pass_vertex_attribute(&shader, mesh.num_vertices, mesh.vertex_positions);
        shader_draw(&shader, mesh.num_triangles, mesh.triangle_indices);
    }
}



void hw6b() {
    Shader shader = {}; {
        char *vertex_shader_source = R""(
            #version 330 core
            uniform mat4 P;
            uniform mat4 V;
            uniform mat4 M;
            layout (location = 0) in vec3 p_model;
            out vec2 uv;
            void main() {
                uv = p_model.xy;
                gl_Position = P * V * M * vec4(p_model, 1.0);
            }
        )"";

        char *fragment_shader_source = R""(
            #version 330 core
            uniform float time;
            in vec2 uv;
            out vec4 fragColor;

            vec4 plasma(float t) {
                const vec3 c0 = vec3(0.05873234392399702, 0.02333670892565664, 0.5433401826748754);
                const vec3 c1 = vec3(2.176514634195958, 0.2383834171260182, 0.7539604599784036);
                const vec3 c2 = vec3(-2.689460476458034, -7.455851135738909, 3.110799939717086);
                const vec3 c3 = vec3(6.130348345893603, 42.3461881477227, -28.51885465332158);
                const vec3 c4 = vec3(-11.10743619062271, -82.66631109428045, 60.13984767418263);
                const vec3 c5 = vec3(10.02306557647065, 71.41361770095349, -54.07218655560067);
                const vec3 c6 = vec3(-3.658713842777788, -22.93153465461149, 18.19190778539828);
                vec3 color = c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));
                return vec4(color.x, color.y, color.z, 1.0);
            }

            void main() {
                float x0 = -2.00 + uv.x*(0.47 + 2.00);
                float y0 = -1.12 + uv.y*(1.12 + 1.12);
                float x = 0.00;
                float y = 0.00;
                float x2 = 0.00;
                float y2 = 0.00;
                int iteration = 0;
                int max_iteration = 512;

                while ((x2 + y2 <= 4) && (iteration < max_iteration)) {
                    y = 2*x*y + y0;
                    x = x2 - y2 + x0;
                    x2 = x * x;
                    y2 = y * y;
                    iteration += 1;
                }
                
                if (iteration == max_iteration) {
                    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
                } else {
                    float t = float(iteration) / max_iteration;
                    fragColor = plasma(t);
                }
            }
        )"";

        shader = shader_create(vertex_shader_source, 1, fragment_shader_source);
    }

    IndexedTriangleMesh3D mesh = {}; {
        mesh.num_triangles = 2;
        mesh.triangle_indices = (int3 *) malloc(mesh.num_triangles * sizeof(int3)); {
            int k = 0;
            mesh.triangle_indices[k++] = { 0, 1, 2 };
            mesh.triangle_indices[k++] = { 0, 2, 3 }; 
        }
        mesh.num_vertices = 4;
        vec2 window = window_get_size();
        mesh.vertex_positions = (vec3 *) malloc(mesh.num_vertices * sizeof(vec3)); {
            int k = 0;
            mesh.vertex_positions[k++] = { -window.x, -window.y, 0.0 };
            mesh.vertex_positions[k++] = { window.x, -window.y, 0.0 };
            mesh.vertex_positions[k++] = { window.x, window.y, 0.0 };
            mesh.vertex_positions[k++] = { -window.x, window.y, 0.0 };
        } 
    }

    Camera3D camera = { 3.0 };

    while (cow_begin_frame()) {
        camera_move(&camera);
        mat4 P = camera_get_P(&camera);
        mat4 V = camera_get_V(&camera);
        mat4 M = globals.Identity;

        shader_set_uniform(&shader, "P", P);
        shader_set_uniform(&shader, "V", V);
        shader_set_uniform(&shader, "M", M);
        shader_pass_vertex_attribute(&shader, mesh.num_vertices, mesh.vertex_positions);
        shader_draw(&shader, mesh.num_triangles, mesh.triangle_indices);
    }
}



void hw6c() {

}



int main() {
    APPS {
        // APP(hw6a);
        APP(hw6b);
        APP(hw6c);
    }
    return 0;
}

