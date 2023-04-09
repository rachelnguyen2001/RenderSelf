// #define COW_PATCH_FRAMERATE
// #define COW_PATCH_FRAMERATE_SLEEP
#include "include.cpp"

////////////////////////////////////////////////////////////////////////////////
// software raytracer //////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

struct CastRayHit {
    real t;  // t at the hit point; recall ray equation is p(t) = o + (t * d)

    int tri; // index of triangle that was hit; -1 if no triangles were hit
    bool hit_any_triangles() { return (tri != -1); }

    vec3 p;     // position of hitpoint
    vec3 n;     // normal at hitpoint
    vec3 color; // color at hitpoint

    // barycentric coordinates of hit
    real alpha;
    real beta;
    real gamma;
};

CastRayHit cast_ray(IndexedTriangleMesh3D *mesh, vec3 o, vec3 d) {
    CastRayHit hit = {};
    hit.t = INFINITY;
    hit.tri = -1;

    for (int tri = 0; tri < mesh->num_triangles; ++tri) {
        int3 cur_tri = mesh->triangle_indices[tri];
        vec3 a = mesh->vertex_positions[cur_tri[0]];
        vec3 b = mesh->vertex_positions[cur_tri[1]];
        vec3 c = mesh->vertex_positions[cur_tri[2]];

        vec4 alpha_beta_gamma_t = inverse(hstack(V4(a, 1.0), V4(b, 1.0), V4(c, 1.0), V4(-d, 0.0))) * V4(o, 1.0);

        if (alpha_beta_gamma_t.x > -TINY_VAL && alpha_beta_gamma_t.y > -TINY_VAL && alpha_beta_gamma_t.z > -TINY_VAL && alpha_beta_gamma_t.w > TINY_VAL)
        {
            if (alpha_beta_gamma_t.w < hit.t) {
                hit.t = alpha_beta_gamma_t.w;
                hit.tri = tri;
                hit.alpha = alpha_beta_gamma_t.x;
                hit.beta = alpha_beta_gamma_t.y;
                hit.gamma = alpha_beta_gamma_t.z;
                hit.p = hit.alpha * a + hit.beta * b + hit.gamma * c;
                hit.n = hit.alpha * mesh->vertex_normals[cur_tri[0]] + hit.beta * mesh->vertex_normals[cur_tri[1]] + hit.gamma * mesh->vertex_normals[cur_tri[2]];
                hit.color = hit.alpha * mesh->vertex_colors[cur_tri[0]] + hit.beta * mesh->vertex_colors[cur_tri[1]] + hit.gamma * mesh->vertex_colors[cur_tri[2]];
            }
        }
    }

    return hit;
}

void raytrace(
        real theta_over_two, // half camera angle of view (see slides)
        mat4 C,
        IndexedTriangleMesh3D *mesh,
        Texture *color_buffer,
        vec3 light_position,
        mat4 PV_for_debug_drawing_rays,
        bool draw_ray
        ) {

    _SUPPRESS_COMPILER_WARNING_UNUSED_VARIABLE(PV_for_debug_drawing_rays);

    int side_length_in_pixels = color_buffer->width;

    // clear the color buffer
    for (int i = 0; i < side_length_in_pixels; ++i) {
        for (int j = 0; j < side_length_in_pixels; ++j) {
            texture_set_pixel(color_buffer, i, j, V3(1.0, 1.0, 1.0), 0.5);
        }
    }
    vec3 o = { C(0,3), C(1,3), C(2,3) };
    real tan_theta_over_two = tan(theta_over_two);
    
    if (draw_ray) {

        eso_begin(PV_for_debug_drawing_rays, SOUP_LINES);
        eso_color(monokai.white);
        for (int i = 0; i < side_length_in_pixels; ++i) {
            for (int j = 0; j < side_length_in_pixels; ++j) {
                vec3 d_cam = V3(LINEAR_REMAP(j, 0, side_length_in_pixels, -tan_theta_over_two, tan_theta_over_two), LINEAR_REMAP(i, 0, side_length_in_pixels, -tan_theta_over_two, tan_theta_over_two), -1);
                vec3 d = transformVector(C, d_cam);
                eso_vertex(o);
                eso_vertex(o + d);
            }
        }
        eso_end();

    }

    real ambientStrength = 0.4;
    real diffuseStrength = 0.6;
    real specularStrength = 0.1;

    // color pixels 
    for (int i = 0; i < side_length_in_pixels; ++i) {
        for (int j = 0; j < side_length_in_pixels; ++j) {
            vec3 d_cam = V3(LINEAR_REMAP(j, 0, side_length_in_pixels, -tan_theta_over_two, tan_theta_over_two), LINEAR_REMAP(i, 0, side_length_in_pixels, -tan_theta_over_two, tan_theta_over_two), -1);
            vec3 d = transformVector(C, d_cam);

            CastRayHit hit = cast_ray(mesh, o, d);

            if (hit.hit_any_triangles()) {

                // cast ray 
                CastRayHit shadow_ray = cast_ray(mesh, hit.p, light_position - hit.p);
                vec3 ambient = ambientStrength * hit.color;
                vec3 color = ambient;
                if (!shadow_ray.hit_any_triangles()) {
                    // in full light, full light model (+diffuse + specular)
                    vec3 lightDir = normalized(light_position - hit.p);
                    real diff = MAX(dot(normalized(hit.n), lightDir), 0.0);
                    vec3 diffuse = diffuseStrength * diff * hit.color;

                    vec3 viewDir = normalized(transformPoint(C, V3(0.0, 0.0, 0.0)) - hit.p);
                    vec3 reflectDir = 2 * (dot(normalized(hit.n), lightDir)) * normalized(hit.n) - lightDir;
                    real spec = pow(MAX(dot(viewDir, reflectDir), 0.0), 32);
                    vec3 specular = specularStrength * spec * hit.color;
                    color += (diffuse + specular);
                } 
                texture_set_pixel(color_buffer, i, j, color, 1.0);
            }
 


            // for (int tri = 0; tri < mesh->num_triangles; ++tri) {
            //     int3 cur_tri = mesh->triangle_indices[tri];
            //     vec3 a = mesh->vertex_positions[cur_tri[0]];
            //     vec3 b = mesh->vertex_positions[cur_tri[1]];
            //     vec3 c = mesh->vertex_positions[cur_tri[2]];

            //     vec4 alpha_beta_gamma_t = inverse(hstack(V4(a, 1.0), V4(b, 1.0), V4(c, 1.0), V4(-d, 0.0))) * V4(o, 1.0);

            //     if (alpha_beta_gamma_t.x > 0 && alpha_beta_gamma_t.y > 0 && alpha_beta_gamma_t.z > 0 && alpha_beta_gamma_t.w > 0) {
            //         if (alpha_beta_gamma_t.w < hit_t) {
            //             hit_t = alpha_beta_gamma_t.w;
            //             hit_tri = tri;
            //         }
            //     }

            // }

            // if (hit_tri != -1) {
            //     int3 cur_tri = mesh->triangle_indices[hit_tri];
            //     vec3 a = mesh->vertex_positions[cur_tri[0]];
            //     vec3 b = mesh->vertex_positions[cur_tri[1]];
            //     vec3 c = mesh->vertex_positions[cur_tri[2]];
            //     vec4 alpha_beta_gamma_t = inverse(hstack(V4(a, 1.0), V4(b, 1.0), V4(c, 1.0), V4(-d, 0.0))) * V4(o, 1.0);
            //     vec3 color = alpha_beta_gamma_t.x * mesh->vertex_colors[cur_tri[0]] 
            //     + alpha_beta_gamma_t.y * mesh->vertex_colors[cur_tri[1]] 
            //     + alpha_beta_gamma_t.z * mesh->vertex_colors[cur_tri[2]];

            //     texture_set_pixel(color_buffer, i, j, color, 1.0);
            // }

        }
    }



    // TODO: ray trace the mesh :D
    // NOTE: please assume the mesh is already in world coordinates (don't worry about M)

}

vec3 _example_vertex_positions[] = {
    { cos(RAD(000)), 0.3 + sin(RAD(000)), -1.0 },
    { cos(RAD(020)), 0.3 + sin(RAD(020)), -1.0 },
    { cos(RAD(200)), 0.3 + sin(RAD(200)),  1.0 },
    { cos(RAD(120)), 0.3 + sin(RAD(120)), -1.0 },
    { cos(RAD(140)), 0.3 + sin(RAD(140)), -1.0 },
    { cos(RAD(320)), 0.3 + sin(RAD(320)),  1.0 },
    { cos(RAD(240)), 0.3 + sin(RAD(240)), -1.0 },
    { cos(RAD(260)), 0.3 + sin(RAD(260)), -1.0 },
    { cos(RAD(100)), 0.3 + sin(RAD(100)),  1.0 },
    { -1.0, -0.2,  1.0 },
    {  1.0, -0.2,  1.0 },
    {  1.0,  0.2, -1.0 },
    { -1.0, -0.2,  1.0 },
    {  1.0,  0.2, -1.0 },
    { -1.0,  0.2, -1.0 },
};
vec3 _example_vertex_normals[] = {
    cross(_example_vertex_positions[1] - _example_vertex_positions[0], _example_vertex_positions[2] - _example_vertex_positions[0]),
    cross(_example_vertex_positions[1] - _example_vertex_positions[0], _example_vertex_positions[2] - _example_vertex_positions[0]),
    cross(_example_vertex_positions[1] - _example_vertex_positions[0], _example_vertex_positions[2] - _example_vertex_positions[0]),
    cross(_example_vertex_positions[4] - _example_vertex_positions[3], _example_vertex_positions[5] - _example_vertex_positions[3]),
    cross(_example_vertex_positions[4] - _example_vertex_positions[3], _example_vertex_positions[5] - _example_vertex_positions[3]),
    cross(_example_vertex_positions[4] - _example_vertex_positions[3], _example_vertex_positions[5] - _example_vertex_positions[3]),
    cross(_example_vertex_positions[7] - _example_vertex_positions[6], _example_vertex_positions[8] - _example_vertex_positions[6]),
    cross(_example_vertex_positions[7] - _example_vertex_positions[6], _example_vertex_positions[8] - _example_vertex_positions[6]),
    cross(_example_vertex_positions[7] - _example_vertex_positions[6], _example_vertex_positions[8] - _example_vertex_positions[6]),
    cross(_example_vertex_positions[10] - _example_vertex_positions[9], _example_vertex_positions[11] - _example_vertex_positions[9]),
    cross(_example_vertex_positions[10] - _example_vertex_positions[9], _example_vertex_positions[11] - _example_vertex_positions[9]),
    cross(_example_vertex_positions[10] - _example_vertex_positions[9], _example_vertex_positions[11] - _example_vertex_positions[9]),
    cross(_example_vertex_positions[13] - _example_vertex_positions[12], _example_vertex_positions[14] - _example_vertex_positions[12]),
    cross(_example_vertex_positions[13] - _example_vertex_positions[12], _example_vertex_positions[14] - _example_vertex_positions[12]),
    cross(_example_vertex_positions[13] - _example_vertex_positions[12], _example_vertex_positions[14] - _example_vertex_positions[12]),
};
vec3 _example_vertex_colors[] = {
    monokai.yellow,
    monokai.yellow,
    monokai.yellow,
    monokai.purple,
    monokai.purple,
    monokai.purple,
    monokai.brown,
    monokai.brown,
    monokai.brown,
    monokai.green,
    monokai.green,
    monokai.green,
    monokai.blue,
    monokai.blue,
    monokai.blue,
};
int3 _example_triangle_indices[] = {
    { 0, 1, 2 },
    { 3, 4, 5 },
    { 6, 7, 8 },
    { 9, 10, 11 },
    { 12, 13, 14 },
};

void hw9a() {
    IndexedTriangleMesh3D mesh_example = {}; {
        mesh_example.num_vertices = _COUNT_OF(_example_vertex_positions);
        mesh_example.num_triangles = _COUNT_OF(_example_triangle_indices);
        mesh_example.vertex_positions = _example_vertex_positions;
        mesh_example.vertex_normals = _example_vertex_normals;
        mesh_example.vertex_colors = _example_vertex_colors;
        mesh_example.triangle_indices = _example_triangle_indices;
    }

    int side_length_in_pixels = 64;
    Texture color_buffer = texture_create("color_buffer", side_length_in_pixels, side_length_in_pixels, 4);

    Camera3D observer = { 4.0, RAD(45), RAD(30), RAD(-15), -1.0, 0.1 };
    Camera3D renderer = { 2.5, RAD(45) };


    IndexedTriangleMesh3D teapot_scene = {}; {

        int V = library.meshes.teapot.num_vertices;
        teapot_scene.num_vertices = V + 4;

        teapot_scene.vertex_positions = (vec3 *) malloc(teapot_scene.num_vertices * sizeof(vec3));
        teapot_scene.vertex_normals = (vec3 *) malloc(teapot_scene.num_vertices * sizeof(vec3));
        teapot_scene.vertex_colors = (vec3 *) malloc(teapot_scene.num_vertices * sizeof(vec3));

        memcpy(teapot_scene.vertex_positions, library.meshes.teapot.vertex_positions, V * sizeof(vec3));
        memcpy(teapot_scene.vertex_normals, library.meshes.teapot.vertex_normals, V * sizeof(vec3));
        for (int i = 0; i < V; ++i) { teapot_scene.vertex_colors[i] = monokai.blue; }

        real y = -.485;
        teapot_scene.vertex_positions[V + 0] = {  2.0, y,  2.0 };
        teapot_scene.vertex_positions[V + 1] = { -2.0, y,  2.0 };
        teapot_scene.vertex_positions[V + 2] = { -2.0, y, -2.0 };
        teapot_scene.vertex_positions[V + 3] = {  2.0, y, -2.0 };

        teapot_scene.vertex_normals[V + 0] = { 0.0, 1.0, 0.0 };
        teapot_scene.vertex_normals[V + 1] = { 0.0, 1.0, 0.0 };
        teapot_scene.vertex_normals[V + 2] = { 0.0, 1.0, 0.0 };
        teapot_scene.vertex_normals[V + 3] = { 0.0, 1.0, 0.0 };

        teapot_scene.vertex_colors[V + 0] = monokai.white;
        teapot_scene.vertex_colors[V + 1] = monokai.white;
        teapot_scene.vertex_colors[V + 2] = monokai.white;
        teapot_scene.vertex_colors[V + 3] = monokai.white;

        int T = library.meshes.teapot.num_triangles;
        teapot_scene.num_triangles = T + 2;
        teapot_scene.triangle_indices = (int3 *) malloc(teapot_scene.num_triangles * sizeof(int3));
        memcpy(teapot_scene.triangle_indices, library.meshes.teapot.triangle_indices, T * sizeof(int3));
        teapot_scene.triangle_indices[T + 0] = { V, V + 1, V + 2 };
        teapot_scene.triangle_indices[T + 1] = { V, V + 2, V + 3 };
    }

    vec3 light_position = { 0.0, 1.0, 2.0 };


    bool draw_teapot_instead = false;
    bool hide_film_plane = false;
    bool _hide_camera_cube = false;
    bool draw_ray = false;

    while (cow_begin_frame()) {
        gui_checkbox("hide_film_plane", &hide_film_plane, 'a');
        gui_checkbox("draw_teapot_instead", &draw_teapot_instead, 'b');
        gui_checkbox("draw_ray", &draw_ray, 'r');

        IndexedTriangleMesh3D *mesh = &mesh_example;
        if (draw_teapot_instead) {
            mesh = &teapot_scene;
        }

        { // tweaks
            gui_slider("renderer.persp_distance_to_origin", &renderer.persp_distance_to_origin, 1, 10);
            gui_slider("renderer.theta", &renderer.theta, RAD(-180), RAD(180), true);
            gui_slider("renderer.phi", &renderer.phi, RAD(-90), RAD(90), true);
            gui_slider("renderer.angle_of_view", &renderer.angle_of_view, RAD(1), RAD(178), true);
        }

        mat4 P_observer = camera_get_P(&observer);
        mat4 V_observer = camera_get_V(&observer);
        mat4 PV_observer = P_observer * V_observer;
        mat4 C_renderer = camera_get_C(&renderer);

        if (!hide_film_plane) {
            raytrace(
                    renderer.angle_of_view / 2.0,
                    C_renderer,
                    mesh,
                    &color_buffer,
                    light_position,
                    PV_observer, draw_ray);
            texture_sync_to_GPU(&color_buffer);
        }

        { // observe
            static bool toggle;
            {
                bool prev = toggle;
                gui_checkbox("toggle camera", &toggle, COW_KEY_TAB);
                if (prev != toggle) {
                    _hide_camera_cube = !_hide_camera_cube;
                    static Camera3D safe;
                    if (toggle) {
                        memcpy(&safe, &observer, sizeof(Camera3D));
                        memcpy(&observer, &renderer, sizeof(Camera3D));
                    } else {
                        memcpy(&observer, &safe, sizeof(Camera3D));
                    }
                }
            }

            if (!toggle) {
                camera_move(&observer);
            }

            { // light
                _widget_translate_3D(PV_observer, 1, &light_position);
                soup_draw(PV_observer, SOUP_POINTS, 1, &light_position, NULL, V3(1.0));
            }


            mesh->draw(P_observer, V_observer, globals.Identity, V3(0, 1, 1));

            { // bespoke widget
                if (!hide_film_plane) { // film plane
                    real D = 1.0; // distance to film plane
                    real hangle = renderer.angle_of_view / 2.0;
                    eso_begin(PV_observer * C_renderer * M4_Translation(0, 0, -D) * M4_Scaling(D * tan(hangle)), SOUP_LINE_LOOP);
                    eso_color(1.0, 1.0, 1.0);
                    eso_vertex( 1.0,  1.0);
                    eso_vertex(-1.0,  1.0);
                    eso_vertex(-1.0, -1.0);
                    eso_vertex( 1.0, -1.0);
                    eso_end();
                    mesh_draw(
                            P_observer,
                            V_observer,
                            C_renderer * M4_Translation(0, 0, -D) * M4_Scaling(D * tan(hangle)),
                            library.meshes.square.num_triangles,
                            library.meshes.square.triangle_indices,
                            library.meshes.square.num_vertices,
                            library.meshes.square.vertex_positions,
                            NULL, NULL, {},
                            library.meshes.square.vertex_texture_coordinates,
                            color_buffer.name);
                }

                { // camera
                    library.soups.axes.draw(PV_observer * C_renderer * M4_Scaling(.25));
                    if (!_hide_camera_cube) {
                        library.soups.box.draw(PV_observer * C_renderer * M4_Scaling(.10), .5 * monokai.gray);
                    }
                }
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// raymarching distance shader /////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

void hw9b() {
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
    bool playing = false;
    real iTime = 0.0;
    while (cow_begin_frame()) {
        gui_checkbox("playing", &playing, 'p');
        if (playing) { iTime += .0167; }
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
        // APP(hw9a);
        APP(hw9b);
    }
    return 0;
}
