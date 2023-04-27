#version 330 core

uniform float iTime;
uniform vec2 iResolution;
uniform mat4 C;

out vec4 fragColor;

float TAU = 6.28318530718;
float RAD(float deg) {
    return deg / 360.0 * TAU;
}

float sat(float x) {
    return min(1.0, max(x, 0.0));   
}

float sdSphere(vec3 p, float s) {
    return length(p)-s;
}

float sdSegment(vec3 p, vec3 a, vec3 b, float r) {
    float x = dot(p - a, b - a) / dot(b - a, b - a);
    float h = sat(x);
    return length(p - a - (b - a)*h) - r;
}

float opSmoothSubtraction(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5*(d2+d1)/k, 0.0, 1.0);
    return mix(d2, -d1, h) + k*h*(1.0-h); 
}

float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h); 
}

float opSmoothIntersection(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) + k*h*(1.0-h); 
}

vec4 rgb_to_frag(vec3 c) {
    vec4 color = vec4(c, 1.0);
    color.x /= 255;
    color.y /= 255;
    color.z /= 255;
    return color;
}

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0-1.0)/k1;
}

float sdLowerHead(vec3 p, vec3 r) {
    vec3 r1 = vec3(0.5, 0.5, 0.5);
    vec3 r2 = r1 + p.y * r;
    float k0 = length(p/r2);
    float k1 = length(p/(r2*r2));
    return k0*(k0-1.0)/k1;
}

float sdEye(vec3 p) {
    vec3 q = vec3(abs(p.x), p.y, p.z);
    vec3 eye_c = vec3(0.25, 0.6, 0.0);
    vec3 eye_r = vec3(0.1, 0.1, 0.4);
    return sdEllipsoid(q - eye_c, eye_r);
}

float sdFace(vec3 p) {
    vec3 top_head_c = vec3(0.0, 0.75, 0.0);
    float top_head_r = 0.8;
    float dis_top_head = sdSphere(p - top_head_c, top_head_r);

    vec3 low_head_c = vec3(0.0, -0.5, 0.0);
    vec3 low_head_r = vec3(1.0, 0.75, 1.05);
    float dis_low_head = sdLowerHead(p - low_head_c, low_head_r);

    float dis_face = opSmoothUnion(dis_top_head, dis_low_head, 0.25);

    //vec3 eye_c = vec3(-0.05, -0.05, 0.02);
    //vec3 eye_r = vec3(0.02, 0.014, 0.01);
    //float dis_eye = sdEllipsoid(p - eye_c, eye_r);
    //dis_face = opIntersection(dis_face, dis_eye) + opSmoothUnion(dis_face, dis_eye, 0.15);

    return dis_face;
}

float sdNeck(vec3 p) {
    vec3 a = vec3(0.0, -1.5, 0.0);
    vec3 b = vec3(0.0, -0.5, 0.0);
    return sdSegment(p, a, b, 0.25);
}

float sdShoulder(vec3 p) {
    vec3 q = vec3(abs(p.x), p.y, p.z);
    vec3 a = vec3(-1.0, -1.3, -0.1);
    vec3 b = vec3(1.0, -1.3, 0.5);
    return sdSegment(q, a, b, 0.35);
}

float sdModel(vec3 p) {
    float dis_face = sdFace(p);
    float dis_neck = sdNeck(p);
    float dis = opSmoothUnion(dis_face, dis_neck, 0.5);
    
    float dis_shoulder = sdShoulder(p);
    dis = opSmoothUnion(dis, dis_shoulder, 0.5);

    float dis_eye = sdEye(p);
    return opSmoothSubtraction(dis_eye, dis, 0.85);
    
    //return dis;
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
    int hit_eye = 0;

    while ((step++ < march_max_steps) && (t < march_max_distance)) {
        vec3 p = o + t * d;
        float f = march_max_distance; {

            { // face and neck
                //float dis_face_and_neck = sdFaceAndNeck(p);
                //f = min(f, dis_face_and_neck);
            }

            { // shoulders
                // sfloat dis_neck = sdNeck(p);
                // f = min(f, dis_neck);
                // float dis_shoulder = sdShoulder(p);
                // f = min(f, dis_shoulder);
            }

            {
                float dis_model = sdModel(p);
                f = min(f, dis_model);
            }

            {
                //float dis_eye = sdEye(p);
                //if (dis_eye < f) {
                    //f = dis_eye;
                    //hit_eye = 1;
                //} else {
                    //hit_eye = 0;
                //}
            }
        }
        if (f < march_hit_tolerance) { // hit!
            // return vec4(0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, -0.33) - vec3(0.3 * p.z))), 1.0);
            vec3 skin_color = vec3(241, 194, 125);
            vec3 eye_color = vec3(255, 255, 255);

            if (hit_eye == 1) {
                return rgb_to_frag(eye_color); 
            }

            return rgb_to_frag(skin_color);
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
