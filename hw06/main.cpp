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
                    float to_subtract = log(log(sqrt(x*x + y*y)) / log(2)) / log(2);
                    float smooth_iteration = float(iteration) - to_subtract;
                    float t = smooth_iteration / max_iteration;
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
    Shader shader_toon;
    Shader shader; {
        char *vertex_shader_source = R""(
            #version 330 core
            layout (location = 0) in vec3 _p_model;
            layout (location = 1) in vec3 _n_model;
            uniform mat4 P, V, M;
            uniform float time;

            vec3 axis = vec3(0, 1, 0);
            float angle = time * min(_p_model.y, 0.9);
            float s = sin(angle);
            float c = cos(angle);
            mat4 R = mat4(c, 0, s, 0, 
                        0, 1, 0, 0,
                        -s, 0, c, 0,
                        0, 0, 0, 1);
            out vec3 p_world;
            out vec3 _n_world;

            void main() {
                p_world = (M * R * vec4(_p_model, 1.0)).xyz;
                _n_world = mat3(transpose(inverse(M * R))) * _n_model;
                gl_Position = P * V * vec4(p_world, 1.0);
            }
        )"";

        char *fragment_shader_source = R""(
            #version 330 core

            uniform vec3 o_camera_world; // camera position
            uniform int  num_lights;
            uniform vec3 light_positions_world[16];
            uniform vec3 light_colors[16];
            uniform float ambientStrength;
            uniform float diffuseStrength;
            uniform float specularStrength;
            uniform float shininess;
            uniform float constant;
            uniform float linear;
            uniform float quadratic; 

            in vec3 p_world; // fragment position
            in vec3 _n_world;

            out vec4 fragColor;

            void main() {
                vec3 n_world = normalize(_n_world); // fragment normal

                vec3 color = vec3(ambientStrength);

                for (int i = 0; i < num_lights; ++i) {
                    float distance = length(light_positions_world[i] - p_world);
                    float attenuation = 1.0 / (constant + linear * distance + quadratic * distance * distance);

                    vec3 ambient = ambientStrength * light_colors[i];
                    ambient *= attenuation;

                    vec3 lightDir = normalize(light_positions_world[i] - p_world);
                    float diff = max(dot(n_world, lightDir), 0.0);
                    vec3 diffuse = diffuseStrength * diff * light_colors[i];
                    diffuse *= attenuation;

                    vec3 viewDir = normalize(o_camera_world - p_world);
                    vec3 reflectDir = reflect(-lightDir, n_world);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
                    vec3 specular = specularStrength * spec * light_colors[i];
                    specular *= attenuation;

                    color += (ambient + diffuse + specular);
                }

                fragColor = vec4(color, 1);
            }
        )"";

        char *fragment_shader_source_toon = R""(
            #version 330 core

            uniform vec3 o_camera_world; // camera position
            uniform int  num_lights;
            uniform vec3 light_positions_world[16];
            uniform vec3 light_colors[16];
            uniform float ambientStrength;
            uniform float diffuseStrength;
            uniform float specularStrength;
            uniform float shininess; 
            uniform float constant;
            uniform float linear;
            uniform float quadratic; 

            in vec3 p_world; // fragment position
            in vec3 _n_world;

            out vec4 fragColor;

            void main() {
                vec3 n_world = normalize(_n_world); // fragment normal

                vec3 color = vec3(ambientStrength);

                for (int i = 0; i < num_lights; ++i) {
                    float distance = length(light_positions_world[i] - p_world);
                    float attenuation = 1.0 / (constant + linear * distance + quadratic * distance * distance);

                    vec3 ambient = ambientStrength * light_colors[i];
                    ambient *= attenuation;

                    vec3 lightDir = normalize(light_positions_world[i] - p_world);
                    float diff = max(dot(n_world, lightDir), 0.0);
                    vec3 diffuse = diffuseStrength * diff * light_colors[i];
                    diffuse *= attenuation;

                    vec3 viewDir = normalize(o_camera_world - p_world);
                    vec3 reflectDir = reflect(-lightDir, n_world);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
                    vec3 specular = specularStrength * spec * light_colors[i];
                    specular *= attenuation;

                    color += (ambient + diffuse + specular);
                }
                color = (10*color) / 9;
                fragColor = vec4(floor(color), 1);
            }
        )"";


        shader = shader_create(vertex_shader_source, 2, fragment_shader_source);
        shader_toon = shader_create(vertex_shader_source, 2, fragment_shader_source_toon);
    }

    #define MAX_NUM_LIGHTS 6
    int num_lights = 1;
    vec3 light_positions_world[MAX_NUM_LIGHTS] = {};
    vec3 light_colors[MAX_NUM_LIGHTS] = { monokai.red, monokai.orange, monokai.yellow, monokai.green, monokai.blue, monokai.purple };
    {
        int k = 0;
        light_positions_world[k++] = {  0.0,  0.0,  3.0 };
        light_positions_world[k++] = {  0.0,  0.0, -3.0 };
        light_positions_world[k++] = {  0.0,  3.0,  0.0 };
        light_positions_world[k++] = {  0.0, -3.0,  0.0 };
        light_positions_world[k++] = {  3.0,  0.0,  0.0 };
        light_positions_world[k++] = { -3.0,  0.0,  0.0 };
    }

    IndexedTriangleMesh3D mesh = library.meshes.bunny;

    real ambientStrength = 0.1;
    real diffuseStrength = 0.6;
    real specularStrength = 1.0;
    real shininess = 12.0;
    bool toon = false;
    real time = 0.0;
    real constant = 1.0;
    real linear = 0.09;
    real quadratic = 0.032;

    Camera3D camera = { 10.0, RAD(45) };
    while (cow_begin_frame()) {
        camera_move(&camera);
        mat4 P = camera_get_P(&camera);
        mat4 V = camera_get_V(&camera);
        mat4 M = globals.Identity;
        mat4 PV = P * V;

        if (time > 10.0) {
            time *= -1;
        }

        gui_slider("num_lights", &num_lights, 0, MAX_NUM_LIGHTS, 'j', 'k');
        soup_draw(PV, SOUP_POINTS, num_lights, light_positions_world, light_colors);
        _widget_translate_3D(P * V, num_lights, light_positions_world, light_colors);

        gui_printf("");
        gui_slider("ambientStrength", &ambientStrength, 0.0, 2.0);
        gui_slider("diffuseStrength", &diffuseStrength, 0.0, 2.0);
        gui_slider("specularStrength", &specularStrength, 0.0, 2.0);
        gui_slider("shininess", &shininess, 0.0, 256.0);
        gui_checkbox("toon shading", &toon);

        if (toon) {
            shader_set_uniform(&shader_toon, "P", P);
            shader_set_uniform(&shader_toon, "V", V);
            shader_set_uniform(&shader_toon, "M", M);
            shader_set_uniform(&shader_toon, "o_camera_world", camera_get_origin(&camera));
            shader_set_uniform(&shader_toon, "num_lights", num_lights);
            shader_set_uniform(&shader_toon, "light_positions_world", num_lights, light_positions_world);
            shader_set_uniform(&shader_toon, "light_colors", num_lights, light_colors);
            shader_set_uniform(&shader_toon, "ambientStrength", ambientStrength);
            shader_set_uniform(&shader_toon, "diffuseStrength", diffuseStrength);
            shader_set_uniform(&shader_toon, "specularStrength", specularStrength);
            shader_set_uniform(&shader_toon, "shininess", shininess);
            shader_set_uniform(&shader_toon, "time", time);
            shader_set_uniform(&shader_toon, "constant", constant);
            shader_set_uniform(&shader_toon, "linear", linear);
            shader_set_uniform(&shader_toon, "quadratic", quadratic);
            shader_pass_vertex_attribute(&shader_toon, mesh.num_vertices, mesh.vertex_positions);
            shader_pass_vertex_attribute(&shader_toon, mesh.num_vertices, mesh.vertex_normals);
            shader_draw(&shader_toon, mesh.num_triangles, mesh.triangle_indices);
        } else {
            shader_set_uniform(&shader, "P", P);
            shader_set_uniform(&shader, "V", V);
            shader_set_uniform(&shader, "M", M);
            shader_set_uniform(&shader, "o_camera_world", camera_get_origin(&camera));
            shader_set_uniform(&shader, "num_lights", num_lights);
            shader_set_uniform(&shader, "light_positions_world", num_lights, light_positions_world);
            shader_set_uniform(&shader, "light_colors", num_lights, light_colors);
            shader_set_uniform(&shader, "ambientStrength", ambientStrength);
            shader_set_uniform(&shader, "diffuseStrength", diffuseStrength);
            shader_set_uniform(&shader, "specularStrength", specularStrength);
            shader_set_uniform(&shader, "shininess", shininess);
            shader_set_uniform(&shader, "time", time);
            shader_set_uniform(&shader, "constant", constant);
            shader_set_uniform(&shader, "linear", linear);
            shader_set_uniform(&shader, "quadratic", quadratic);
            shader_pass_vertex_attribute(&shader, mesh.num_vertices, mesh.vertex_positions);
            shader_pass_vertex_attribute(&shader, mesh.num_vertices, mesh.vertex_normals);
            shader_draw(&shader, mesh.num_triangles, mesh.triangle_indices);
        }

        time += 0.0167;
    }
}



int main() {
    APPS {
        APP(hw6a);
        APP(hw6b);
        APP(hw6c);
    }
    return 0;
}

