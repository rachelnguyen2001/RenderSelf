#version 330 core

uniform float iTime;
uniform vec2 iResolution;
uniform mat4 C;

out vec4 fragColor;

float TAU = 6.28318530718;
float RAD(float deg) {
    return deg / 360.0 * TAU;
}

float sdEllipsoid(vec3 p, vec3 r) {
    vec3 r1 = vec3(0.5, 0.5, 0.5);
    vec3 r2 = r1 + p.y * r;
    float k0 = length(p/r2);
    float k1 = length(p/(r2*r2));
    return k0*(k0-1.0)/k1;
}

float sdSphere(vec3 p, float s) {
    return length(p)-s;
}

float opUnion(float d1, float d2) { 
    return min(d1,d2); 
}

float opSmoothUnion(float d1, float d2, float k) {
    float nominator = max(k - abs(d1 - d2), 0);
    float denominator = 6*k*k*k;
    return (nominator*nominator*nominator) / denominator;
}

float sat(float x) {
    return min(1.0, max(x, 0.0));   
}

float sdFace(vec3 p) {
    vec3 top_head_c = vec3(0.0, 0.75, 0.0);
    float top_head_r = 0.8;
    float dis_top_head = sdSphere(p - top_head_c, top_head_r);

    vec3 low_head_c = vec3(0.0, -0.5, 0.0);
    // float low_head_r = 0.5;
    vec3 low_head_r = vec3(1.0, 0.75, 0.85);
    float dis_low_head = sdEllipsoid(p - low_head_c, low_head_r);
    // float dis_low_head = sdSphere(p - low_head_c, low_head_r);

    float dis_face = opUnion(dis_top_head, dis_low_head) - opSmoothUnion(dis_top_head, dis_low_head, 1.0);
    return dis_face;
}

float sdSegment(vec3 p, vec3 a, vec3 b, float r) {
    float x = dot(p - a, b - a) / dot(b - a, b - a);
    float h = sat(x);
    return length(p - a - (b - a)*h) - r;
}

float sdNeck(vec3 p) {
    vec3 a = vec3(0.0, -1.5, 0.3);
    vec3 b = vec3(0.0, 0.0, 0.3);
    return sdSegment(p, a, b, 0.2);
}

float sdShoulder(vec3 p) {
    vec3 q = vec3(abs(p.x), p.y, p.z);
    vec3 a = vec3(-1.0, -1.2, -0.1);
    vec3 b = vec3(1.0, -1.2, 0.5);
    return sdSegment(q, a, b, 0.35);
}

float sdModel(vec3 p) {
    float dis_face = sdFace(p);
    float dis_neck = sdNeck(p);
    float dis = opUnion(dis_face, dis_neck) - opSmoothUnion(dis_face, dis_neck, 1.75);
    float dis_shoulder = sdShoulder(p);
    dis = opUnion(dis, dis_shoulder) - opSmoothUnion(dis, dis_shoulder, 0.75);
    return dis;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
}
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

vec4 march(vec3 o, vec3 d) {
    // params
    const int   march_max_steps     = 100;
    const float march_hit_tolerance = 0.0001;
    const float march_max_distance  = 100.0;
    // o -- camera origin               
    // t -- distance marched along ray  
    // d -- camera direction            
    // p -- current position along ray  
    // f -- distance to implicit surface
    float t = 0.0;
    int step = 0;
    while ((step++ < march_max_steps) && (t < march_max_distance)) {
        vec3 p = o + t * d;
        float f = march_max_distance; {

            { // model
                float dis_model = sdModel(p);
                f = min(f, dis_model);
            }

            { // neck
                // sfloat dis_neck = sdNeck(p);
                // f = min(f, dis_neck);
            }
        }
        if (f < march_hit_tolerance) { // hit!
            return vec4(0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, -0.33) - vec3(0.3 * p.z))), 1.0);
        }
        t += clamp(f, 0.005, 0.1); // make the number smaller if you're getting weird artifacts
    }
    return vec4(0.0);
}

void main() {
    vec3 o = C[3].xyz; // glsl is pretty neato :)
    vec3 d; {
        float theta_over_two = RAD(30.0);
        vec2 d_xy_camera = (gl_FragCoord.xy - (0.5 * iResolution.xy)) * (tan(theta_over_two) / (0.5 * iResolution.y));
        vec3 d_camera = normalize(vec3(d_xy_camera, -1.0));
        d = mat3(C) * d_camera;
    }
    fragColor = march(o, d);
}
