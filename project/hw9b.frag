#version 330 core

uniform float iTime;
uniform vec2 iResolution;
uniform mat4 C;
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
uniform float p_x;
uniform float p_y;
uniform float p_z;
uniform float p_r;
out vec4 fragColor;

float EPSILON = 0.1;
float TAU = 6.28318530718;
int RGB = 255;

vec3 rgb_to_frag(vec3 c) {
    c.x /= RGB;
    c.y /= RGB;
    c.z /= RGB;
    return c;
}

vec4 getColor(vec3 p, vec3 n, vec3 o, vec3 c) {
    vec3 color = vec3(ambientStrength);

    for (int i = 0; i < num_lights; ++i) {
        float distance = length(light_positions_world[i] - p);
        float attenuation = 1.0 / (constant + linear * distance + quadratic * distance * distance);

        vec3 ambient = ambientStrength * light_colors[i];
        ambient *= attenuation;

        vec3 lightDir = normalize(light_positions_world[i] - p);
        float diff = max(dot(n, lightDir), 0.0);
        vec3 diffuse = diffuseStrength * diff * light_colors[i];
        diffuse *= attenuation;

        vec3 viewDir = normalize(o - p);
        vec3 reflectDir = reflect(-lightDir, n);
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
        vec3 specular = specularStrength * spec * light_colors[i];
        specular *= attenuation;

        color += (ambient + diffuse + specular);
    }

    color *= c;
    fragColor = vec4(color, 1);
    return fragColor;
}

float RAD(float deg) {
    return deg / 360.0 * TAU;
}

float sat(float x) {
    return min(1.0, max(x, 0.0));   
}

float sdSphere(vec3 p, float s) {
    float d = length(p) - s;
    //float x_prime = length(vec3(p.x + EPSILON, p.y, p.z)) - length(vec3(p.x - EPSILON, p.y, p.z));
    //float y_prime = length(vec3(p.x, p.y + EPSILON, p.z)) - length(vec3(p.x, p.y - EPSILON, p.z));
    //float z_prime = length(vec3(p.x, p.y, p.z + EPSILON)) - length(vec3(p.x, p.y, p.z - EPSILON));
    //return vec4(d, x_prime, y_prime, z_prime);
    return d;
}

float sdSegment(vec3 p, vec3 a, vec3 b, float r) {
    float x = dot(p - a, b - a) / dot(b - a, b - a);
    float h = sat(x);
    return length(p - a - (b - a)*h) - r;
}

float opSmoothSubtraction(float d1, float d2, float k) {
    //eturn min(d2, -d1);
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

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p/r);
  float k1 = length(p/(r*r));
  return k0*(k0-1.0)/k1;
}

float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {    
    vec2 a = B - A;
    vec2 b = A - 2.0*B + C;
    vec2 c = a * 2.0;
    vec2 d = A - pos;
    float kk = 1.0/dot(b,b);
    float kx = kk * dot(a,b);
    float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
    float kz = kk * dot(d,a);      
    float res = 0.0;
    float p = ky - kx*kx;
    float p3 = p*p*p;
    float q = kx*(2.0*kx*kx-3.0*ky) + kz;
    float h = q*q + 4.0*p3;
    if( h >= 0.0) 
    { 
        h = sqrt(h);
        vec2 x = (vec2(h,-h)-q)/2.0;
        vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
        float t = clamp( uv.x+uv.y-kx, 0.0, 1.0 );
        res = dot(d + (c + b*t)*t, d + (c + b*t)*t);
    }
    else
    {
        float z = sqrt(-p);
        float v = acos( q/(p*z*2.0) ) / 3.0;
        float m = cos(v);
        float n = sin(v)*1.732050808;
        vec3  t = clamp(vec3(m+m,-n-m,n-m)*z-kx,0.0,1.0);
        res = min( dot(d+(c+b*t.x)*t.x, d+(c+b*t.x)*t.x),
                   dot(d+(c+b*t.y)*t.y, d+(c+b*t.y)*t.y) );
        // the third root cannot be the closest
        // res = min(res,dot(d+(c+b*t.z)*t.z, d + (c + b*t)*t));
    }
    return sqrt( res );
}

float opRevolutionForBeizer(vec3 p, float o, vec2 A, vec2 B, vec2 C) {
    vec2 q = vec2(length(p.xz) - o, p.y);
    return sdBezier(q, A, B, C);
}

// From https://iquilezles.org/articles/smin/
vec4 smin(vec4 a, vec4 b, float k) {
    float h = max(k-abs(a.x-b.x),0.0);
    float m = 0.25*h*h/k;
    float n = 0.50*  h/k;
    return vec4(min(a.x,  b.x) - m, mix(a.yzw,b.yzw,(a.x<b.x)?n:1.0-n));
}

float sdLowerHead(vec3 p, vec3 r) {
    vec3 r1 = vec3(0.5, 0.5, 0.5);
    vec3 r2 = r1 + p.y * r;
    float k0 = length(p/r2);
    float k1 = length(p/(r2*r2));
    return k0*(k0-1.0)/k1;
}

float sdEyeBall(vec3 p) {
    vec3 q = vec3(sqrt(p.x*p.x + 0.0005), p.y, p.z);
    vec3 eyeBall_c = vec3(0.35, 0.6, 0.7);
    vec3 eyeBall_r = vec3(0.1, 0.1, 0.4);
    return sdEllipsoid(q - eyeBall_c, eyeBall_r);
}

float sdEyeBallSpace(vec3 p) {
    vec3 q = vec3(sqrt(p.x*p.x + 0.0005), p.y, p.z);
    vec3 eyeBall_c = vec3(0.35, 0.6, 0.6);
    vec3 eyeBall_r = vec3(0.08, 0.1, 0.3);
    return sdEllipsoid(q - eyeBall_c, eyeBall_r);
}

float sdRightEye(vec3 p) {
    vec3 eye_c = vec3(0.35, 0.6, 0.8);
    float eye_r = 0.15;
    return sdSphere(p - eye_c, eye_r);
}

float sdLeftEye(vec3 p) {
    vec3 eye_c = vec3(-0.35, 0.6, 0.8);
    float eye_r = 0.15;
    return sdSphere(p - eye_c, eye_r);
}

float sdFace(vec3 p) {
    vec3 top_head_c = vec3(0.0, 0.75, 0.0);
    float top_head_r = 0.8;
    float d_top_head = sdSphere(p - top_head_c, top_head_r);
    //float x_top_head = sdSphere(vec3(p.x + EPSILON, p.y, p.z) - top_head_c, top_head_r) - sdSphere(vec3(p.x - EPSILON, p.y, p.z) - top_head_c, top_head_r);
    //float y_top_head = sdSphere(vec3(p.x, p.y + EPSILON, p.z) - top_head_c, top_head_r) - sdSphere(vec3(p.x, p.y - EPSILON, p.z) - top_head_c, top_head_r);
    //float z_top_head = sdSphere(vec3(p.x, p.y, p.z + EPSILON) - top_head_c, top_head_r) - sdSphere(vec3(p.x, p.y, p.z - EPSILON) - top_head_c, top_head_r);
    //vec4 a = vec4(d_top_head, x_top_head, y_top_head, z_top_head);

    vec3 low_head_c = vec3(0.0, -0.5, 0.0);
    vec3 low_head_r = vec3(1.0, 0.75, 1.05);
    float d_low_head = sdLowerHead(p - low_head_c, low_head_r);
    //float x_low_head = sdLowerHead(vec3(p.x, p.y, p.z) - low_head_c, low_head_r) - sdLowerHead(vec3(p.x - EPSILON, p.y, p.z) - low_head_c, low_head_r);
    //float y_low_head = sdLowerHead(vec3(p.x + EPSILON, p.y, p.z) - low_head_c, low_head_r) - sdLowerHead(vec3(p.x - EPSILON, p.y, p.z) - low_head_c, low_head_r);
    //float z_low_head = sdLowerHead(vec3(p.x + EPSILON, p.y, p.z) - low_head_c, low_head_r) - sdLowerHead(vec3(p.x - EPSILON, p.y, p.z) - low_head_c, low_head_r);

    float dis_face = opSmoothUnion(d_top_head, d_low_head, 0.25);
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

float sdUpperLip(vec3 p) {
    vec3 center = vec3(0.01, -0.4, 0.5);
    return opRevolutionForBeizer(p - center, 0.12, vec2(0.0, 0.0), vec2(0.5, 0.25), vec2(-0.5, 0.25));
}

float sdModel(vec3 p) {
    float dis_face = sdFace(p);
    float dis_neck = sdNeck(p);
    float dis = opSmoothUnion(dis_face, dis_neck, 0.02);
    
    float dis_shoulder = sdShoulder(p);
    dis = opSmoothUnion(dis, dis_shoulder, 0.1);

    float dis_eyeBall = sdEyeBall(p);
    dis = opSmoothSubtraction(dis_eyeBall, dis, 0.5);

    float dis_eyeBallSpace = sdEyeBallSpace(p);
    dis = opSmoothSubtraction(dis_eyeBallSpace, dis, 0.5);

    float dis_RightEye = sdRightEye(p);
    dis = opSmoothUnion(dis, dis_RightEye, 0.1);
    //dis = min(dis, dis_RightEye);

    float dis_LeftEye = sdLeftEye(p);
    dis = opSmoothUnion(dis, dis_LeftEye, 0.1);
    //dis = min(dis, dis_LeftEye);

    //float dis_UpperLip = sdUpperLip(p);
    //dis = opSmoothUnion(dis, dis_UpperLip, 0.5);

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
    const float march_hit_tolerance = 0.001;
    const float march_max_distance  = 100.0;
    // o -- camera origin               
    // t -- distance marched along ray  
    // d -- camera direction            
    // p -- current position along ray  
    // f -- distance to implicit surface
    float t = 0.0;
    int step = 0;
    int hit_lip = 0;
    float x_prime = 0.0;
    float y_prime = 0.0;
    float z_prime = 0.0;
    vec3 n = vec3(0.0, 0.0, 0.0);

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

            if (true) {
            }

            if (true) {
                float dis_model = sdModel(p);
                f = min(f, dis_model);

                if (f < march_hit_tolerance) {
                    x_prime = sdUpperLip(vec3(p.x + EPSILON, p.y, p.z)) - sdUpperLip(vec3(p.x - EPSILON, p.y, p.z));
                    y_prime = sdUpperLip(vec3(p.x, p.y + EPSILON, p.z)) - sdUpperLip(vec3(p.x, p.y - EPSILON, p.z));
                    z_prime = sdUpperLip(vec3(p.x, p.y, p.z + EPSILON)) - sdUpperLip(vec3(p.x, p.y - EPSILON, p.z - EPSILON));
                    n = normalize(vec3(x_prime, y_prime, z_prime));
                    //vec3 skin_color = vec3(241, 194, 125);
                    //vec3 skin_color = vec3(92, 64, 51);
                    //vec3 skin_color = vec3(0.5, 0.5, 0.5);
                    //vec3 skin_color = vec3(209, 163, 164);
                    vec3 skin_color = vec3(238,193,173);
                    return getColor(p, n, o, vec3(0.225,0.15,0.12));
                    //return getColor(p, n, o, vec3(0.95, 0.76, 0.65));
                    //return rgb_to_frag(skin_color);
                }

            }

            {
                //float dis_eye = sdEye(p);
                //if (dis_eye < f) {
                    //f = dis_eye;
                    //hit_eye = 1;
                //} else {
                    //hit_eye = 0;
                //}
                float dis_lip = sdUpperLip(p);
                f = min(f, dis_lip);

                if (f < march_hit_tolerance) {
                    x_prime = sdUpperLip(vec3(p.x + EPSILON, p.y, p.z)) - sdUpperLip(vec3(p.x - EPSILON, p.y, p.z));
                    y_prime = sdUpperLip(vec3(p.x, p.y + EPSILON, p.z)) - sdUpperLip(vec3(p.x, p.y - EPSILON, p.z));
                    z_prime = sdUpperLip(vec3(p.x, p.y, p.z + EPSILON)) - sdUpperLip(vec3(p.x, p.y - EPSILON, p.z - EPSILON));
                    n = normalize(vec3(x_prime, y_prime, z_prime));
                    //vec3 lip_color = vec3(0.25, 0, 0);
                    vec3 lip_color = vec3(214,91,91);
                    return getColor(p, n, o, rgb_to_frag(lip_color));
                    //vec3 lip_color = vec3(255 / 255, 0, 0);   
                    //return rgb_to_frag(lip_color);
                }

            }
            if (false) {
                float dis_eye = sdEyeBall(p);
                f = min(f, dis_eye);

                if (f < march_hit_tolerance) {
                    return vec4(1.0, 0.0, 0.0, 1.0);
                }

            }

            {
                float dis_sphere = sdSphere(p - vec3(p_x, p_y, p_z), p_r);
                f = min(f, dis_sphere);

                if (f < march_hit_tolerance) {
                    return vec4(1.0, 1.0, 1.0, 1.0);
                }
            }
        }
        //if (f < march_hit_tolerance) { // hit!
            // return vec4(0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, -0.33) - vec3(0.3 * p.z))), 1.0);
            //vec3 eye_color = vec3(255, 255, 255);

            //if (hit_lip == 1) {
                //return rgb_to_frag(eye_color); 
            //}

            //return rgb_to_frag(skin_color);
        //}
        t += f; //clamp(f, 0.005, 0.1); // make the number smaller if you're getting weird artifacts
    }
    return vec4(0.0);
}

void main() {
    vec3 o = C[3].xyz;
    vec3 d; {
        float theta_over_two = RAD(30.0);
        vec2 d_xy_camera = (gl_FragCoord.xy - (0.5 * iResolution.xy)) * (tan(theta_over_two) / (0.5 * iResolution.y));
        vec3 d_camera = normalize(vec3(d_xy_camera, -1.0));
        d = mat3(C) * d_camera;
    }
    fragColor = march(o, d);
}
