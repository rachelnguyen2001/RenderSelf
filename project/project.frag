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
uniform int lip;
uniform int skin;
uniform int eye;
uniform int lip_size;
out vec4 fragColor;

float EPSILON = 0.1;
float TAU = 6.28318530718;
int RGB = 255;

float inverse_lerp(float a, float b, float p) {
    return (p-a)/(b-a);
}

float linear_remap(float p, float a, float b, float c, float d) {
    return mix(c, d, inverse_lerp(a,b,p));
}

vec3 rgb_to_frag(vec3 c) {
    c.x /= RGB;
    c.y /= RGB;
    c.z /= RGB;
    return c;
}

vec3 get_backGround_Color(vec3 p) {
    vec3 blue = rgb_to_frag(vec3(135,206,250));
    vec3 deep_blue = rgb_to_frag(vec3(0,0,139));
    float lambda = pow(2, -8*max(0, p.y));
    return (blue + 0.5*p.y)*lambda + (1 - lambda)*deep_blue;
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

vec3 get_X_plus(vec3 p) {
    return vec3(p.x + EPSILON, p.y, p.z);
}

vec3 get_X_minus(vec3 p) {
    return vec3(p.x - EPSILON, p.y, p.z);
}

vec3 get_Y_plus(vec3 p) {
    return vec3(p.x, p.y + EPSILON, p.z);
}

vec3 get_Y_minus(vec3 p) {
    return vec3(p.x, p.y - EPSILON, p.z);
}

vec3 get_Z_plus(vec3 p) {
    return vec3(p.x, p.y, p.z + EPSILON);
}

vec3 get_Z_minus(vec3 p) {
    return vec3(p.x, p.y, p.z - EPSILON);
}

float sdSphere(vec3 p, float s) {
    return length(p) - s;
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

float sdCone(vec3 p, vec2 c, float h) {
  vec2 q = h*vec2(c.x/c.y,-1.0);
    
  vec2 w = vec2( length(p.xz), p.y );
  vec2 a = w - q*clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
  vec2 b = w - q*vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
  float k = sign( q.y );
  float d = min(dot( a, a ),dot(b, b));
  float s = max( k*(w.x*q.y-w.y*q.x),k*(w.y-q.y)  );
  return sqrt(d)*sign(s);
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
    return vec4(min(a.x,  b.x) - m, mix(a.yzw, b.yzw,(a.x<b.x)?n:1.0-n));
}

vec4 smax(vec4 a, vec4 b, float k) {
    float h = max(k-abs(a.x-b.x),0.0);
    float m = 0.25*h*h/k;
    float n = 0.50*  h/k;
    return vec4(max(a.x,  b.x) + m, mix(a.yzw, b.yzw,(a.x<b.x)?n:1.0-n));
}

// From https://www.shadertoy.com/view/NsffWj
vec3 inflate(vec3 p, float r) {
    float pl = length(p);
    vec3 n = p / pl;
    return p - n * clamp(pl, -r, r);
}

float sdNoseWingLeft(vec3 p) {
    vec3 c = vec3(-0.1, -0.1, 0.6);
    return sdSphere(p - c, 0.03);
}

float sdNoseWingRight(vec3 p) {
    vec3 c = vec3(0.1, -0.1, 0.6);
    return sdSphere(p - c, 0.03);
}

float sdNoseHoleLeft(vec3 p) {
    vec3 c = vec3(-0.07, -0.11, 0.65);
    return sdSphere(p - c, 0.01);
}

float sdNoseHoleRight(vec3 p) {
    vec3 c = vec3(0.07, -0.11, 0.65);
    return sdSphere(p - c, 0.01);
}

float sdNose(vec3 p) {
    vec3 c = vec3(0.0,0.1,0.2);
    float angle = RAD(20);
    vec3 q = inflate(p, 0.8);
    float d = sdCone(q - c, vec2(sin(angle), cos(angle)), 0.1);
    float d_wing_left = sdNoseWingLeft(p);
    d = opSmoothUnion(d, d_wing_left, 0.5);
    float d_wing_right = sdNoseWingRight(p);
    d = opSmoothUnion(d, d_wing_right, 0.5);
    float d_hole_left = sdNoseHoleLeft(p);
    d = opSmoothSubtraction(d_hole_left, d, 0.5);
    float d_hole_right = sdNoseHoleRight(p);
    d = opSmoothSubtraction(d_hole_right, d, 0.5);
    return d;
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
    vec3 eyeBall_c = vec3(0.35, 0.6, 0.5);
    vec3 eyeBall_r = vec3(0.01, 0.01, 0.05);
    return sdEllipsoid(q - eyeBall_c, eyeBall_r);
}

float sdEyeBallSpace(vec3 p) {
    vec3 q = vec3(sqrt(p.x*p.x + 0.0005), p.y, p.z);
    vec3 eyeBall_c = vec3(0.35, 0.6, 0.6);
    vec3 eyeBall_r = vec3(0.01, 0.01, 0.04);
    return sdEllipsoid(q - eyeBall_c, eyeBall_r);
}

float sdRightEye(vec3 p) {
    vec3 c = vec3(0.35, 0.55, 0.6);
    float r = 0.18;
    return sdSphere(p - c, r);
}

float sdLeftEye(vec3 p) {
    vec3 c = vec3(-0.35, 0.55, 0.6);
    float r = 0.18;
    return sdSphere(p - c, r);
}

float sdRightEyeBound(vec3 p) {
    vec3 c = vec3(0.33, 0.53, 0.85);
    float r = 0.12;
    return sdSphere(p - c, r);
}

float sdRightEyeBoundTwo(vec3 p) {
    vec3 c = vec3(0.33, 0.529, 0.87);
    float r = 0.11;
    return sdSphere(p - c, r);
}

float sdRightEyeBoundThree(vec3 p) {
    vec3 c = vec3(0.33, 0.528, 1);
    float r = 0.05;
    return sdSphere(p - c, r);
}

float sdLeftEyeBound(vec3 p) {
    vec3 c = vec3(-0.33, 0.53, 0.85);
    float r = 0.12;
    return sdSphere(p - c, r);
}

float sdLeftEyeBoundTwo(vec3 p) {
    vec3 c = vec3(-0.33, 0.529, 0.87);
    float r = 0.11;
    return sdSphere(p - c, r);
}

float sdLeftEyeBoundThree(vec3 p) {
    vec3 c = vec3(-0.33, 0.528, 1);
    float r = 0.05;
    return sdSphere(p - c, r);
}

float sdFace(vec3 p) {
    vec3 top_head_c = vec3(0.0, 0.75, 0.0);
    float top_head_r = 0.8;
    float d_top_head = sdSphere(p - top_head_c, top_head_r);

    vec3 low_head_c = vec3(0.0, -0.5, 0.0);
    vec3 low_head_r = vec3(1.0, 0.75, 1.05);
    float d_low_head = sdLowerHead(p - low_head_c, low_head_r);

    return opSmoothUnion(d_top_head, d_low_head, 0.25);
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
    float r = linear_remap(lip_size, 0, 10, 0.08, 0.18);
    return opRevolutionForBeizer(p - center, r, vec2(0.0, 0.0), vec2(0.5, 0.25), vec2(-0.5, 0.25));
}

float sdModel(vec3 p) {
    float d_face = sdFace(p);
    float d_neck = sdNeck(p);
    float d = opSmoothUnion(d_face, d_neck, 0.02);

    float d_shoulder = sdShoulder(p);
    d = opSmoothUnion(d, d_shoulder, 0.1);

    float d_eyeBall = sdEyeBall(p);
    d = opSmoothSubtraction(d_eyeBall, d, 0.5);

    float d_eyeBallSpace = sdEyeBallSpace(p);
    d = opSmoothSubtraction(d_eyeBallSpace, d, 0.5);

    float d_Nose = sdNose(p);
    d = opSmoothUnion(d, d_Nose, 0.1);

    return d;
}

vec4 march(vec3 o, vec3 d) {
    const int   march_max_steps     = 100;
    const float march_hit_tolerance = 0.001;
    const float march_max_distance  = 100.0;
    float t = 0.0;
    int step = 0;
    int hit_lip = 0;
    float x_prime = 0.0;
    float y_prime = 0.0;
    float z_prime = 0.0;
    vec3 n = vec3(0.0, 0.0, 0.0);
    vec3 lip_colors[5] = vec3[5](vec3(249,135,135), vec3(231,106,106), vec3(214,91,91), vec3(193,75,75), vec3(184,63,63));
    vec3 skin_colors[5] = vec3[5](vec3(255,219,172), vec3(241,194,125), vec3(224,172,105), vec3(198,134,66), vec3(141,85,36));
    vec3 eye_colors[5] = vec3[5](vec3(161, 202, 241), vec3(13, 152, 186), vec3(13, 81, 118), vec3(141, 155, 135), vec3(69, 69, 69));

    for (int i = 0; i < 5; ++i) {
        lip_colors[i] = rgb_to_frag(lip_colors[i]);
        skin_colors[i] = rgb_to_frag(skin_colors[i]);
        eye_colors[i] = rgb_to_frag(eye_colors[i]);
    }

    while ((step++ < march_max_steps) && (t < march_max_distance)) {
        vec3 p = o + t * d;
        float f = march_max_distance; {

            if (true) {
                float d_model = sdModel(p);
                f = min(f, d_model);
                float x_model = sdModel(get_X_plus(p)) - sdModel(get_X_minus(p));
                float y_model = sdModel(get_Y_plus(p)) - sdModel(get_Y_minus(p));
                float z_model = sdModel(get_Z_plus(p)) - sdModel(get_Z_minus(p));

                if (f < march_hit_tolerance) {
                    n = normalize(vec3(x_model, y_model, z_model));
                    return getColor(p, n, o, skin_colors[skin]);
                }

                float d_RightEye = sdRightEye(p);
                float x_r_eye = sdRightEye(get_X_plus(p)) - sdRightEye(get_X_minus(p));
                float y_r_eye = sdRightEye(get_Y_plus(p)) - sdRightEye(get_Y_minus(p));
                float z_r_eye = sdRightEye(get_Z_plus(p)) - sdRightEye(get_Z_minus(p));
                vec4 dis = smin(vec4(d_model, x_model, y_model, z_model), vec4(d_RightEye, x_r_eye, y_r_eye, z_r_eye), 0.001);
                f = min(f, dis.x);

                if (f < march_hit_tolerance) {
                    n = normalize(dis.yzw);
                    return getColor(p, n, o, vec3(1.0, 1.0, 1.0));                
                }

                float d_LeftEye = sdLeftEye(p);
                float x_l_eye = sdLeftEye(get_X_plus(p)) - sdLeftEye(get_X_minus(p));
                float y_l_eye = sdLeftEye(get_Y_plus(p)) - sdLeftEye(get_Y_minus(p));
                float z_l_eye = sdLeftEye(get_Z_plus(p)) - sdLeftEye(get_Z_minus(p));
                dis = smin(dis, vec4(d_LeftEye, x_l_eye, y_l_eye, z_l_eye), 0.001);
                f = min(f, dis.x);

                if (f < march_hit_tolerance) {
                    n = normalize(dis.yzw);
                    return getColor(p, n, o, vec3(1.0, 1.0, 1.0));                
                }

                float d_RightEyeBound = sdRightEyeBound(p);
                float x_r_bound = sdRightEyeBound(get_X_plus(p)) - sdRightEyeBound(get_X_minus(p));
                float y_r_bound = sdRightEyeBound(get_Y_plus(p)) - sdRightEyeBound(get_Y_minus(p));
                float z_r_bound = sdRightEyeBound(get_Z_plus(p)) - sdRightEyeBound(get_Z_minus(p));
                //dis = smin(dis, vec4(d_RigthEyeBound, x_r_bound, y_r_bound, z_r_bound), 0.2);
                f = min(f, d_RightEyeBound);
                
                if (f < march_hit_tolerance) {
                    n = normalize(vec3(x_r_bound, y_r_bound, z_r_bound));
                    return getColor(p, n, o, vec3(0.0, 0.0, 0.0));                
                }

                float d_RightEyeBoundTwo = sdRightEyeBoundTwo(p);
                float x_r_bound_t = sdRightEyeBoundTwo(get_X_plus(p)) - sdRightEyeBoundTwo(get_X_minus(p));
                float y_r_bound_t = sdRightEyeBoundTwo(get_Y_plus(p)) - sdRightEyeBoundTwo(get_Y_minus(p));
                float z_r_bound_t = sdRightEyeBoundTwo(get_Z_plus(p)) - sdRightEyeBoundTwo(get_Z_minus(p));
                //dis = smin(dis, vec4(d_RightEyeBoundTwo, x_r_bound_t, y_r_bound_t, z_r_bound_t), 0.1);
                f = min(f, d_RightEyeBoundTwo);

                if (f < march_hit_tolerance) {
                    n = normalize(vec3(x_r_bound_t, y_r_bound_t, z_r_bound_t));

                    return getColor(p, n, o, eye_colors[eye] + 0.09*length(p));
                }

                float d_RightEyeBoundThree = sdRightEyeBoundThree(p);
                float x_r_bound_th = sdRightEyeBoundThree(get_X_plus(p)) - sdRightEyeBoundThree(get_X_minus(p));
                float y_r_bound_th = sdRightEyeBoundThree(get_Y_plus(p)) - sdRightEyeBoundThree(get_Y_minus(p));
                float z_r_bound_th = sdRightEyeBoundThree(get_Z_plus(p)) - sdRightEyeBoundThree(get_Z_minus(p));
                f = min(f, d_RightEyeBoundThree);

                if (f < march_hit_tolerance) {
                    n = normalize(vec3(x_r_bound_th, y_r_bound_th, z_r_bound_th));
                    return getColor(p, n, o, vec3(0, 0, 0));
                }

                float d_LeftEyeBound = sdLeftEyeBound(p);
                float x_l_bound = sdLeftEyeBound(get_X_plus(p)) - sdLeftEyeBound(get_X_minus(p));
                float y_l_bound = sdLeftEyeBound(get_Y_plus(p)) - sdLeftEyeBound(get_Y_minus(p));
                float z_l_bound = sdLeftEyeBound(get_Z_plus(p)) - sdLeftEyeBound(get_Z_minus(p));
                f = min(f, d_LeftEyeBound);
                
                if (f < march_hit_tolerance) {
                    n = normalize(vec3(x_l_bound, y_l_bound, z_l_bound));
                    return getColor(p, n, o, vec3(0.0, 0.0, 0.0));                
                }

                float d_LeftEyeBoundTwo = sdLeftEyeBoundTwo(p);
                float x_l_bound_t = sdLeftEyeBoundTwo(get_X_plus(p)) - sdLeftEyeBoundTwo(get_X_minus(p));
                float y_l_bound_t = sdLeftEyeBoundTwo(get_Y_plus(p)) - sdLeftEyeBoundTwo(get_Y_minus(p));
                float z_l_bound_t = sdLeftEyeBoundTwo(get_Z_plus(p)) - sdLeftEyeBoundTwo(get_Z_minus(p));
                f = min(f, d_LeftEyeBoundTwo);

                if (f < march_hit_tolerance) {
                    n = normalize(vec3(x_l_bound_t, y_l_bound_t, z_l_bound_t));
                    return getColor(p, n, o, eye_colors[eye] + 0.09*length(p));
                }

                float d_LeftEyeBoundThree = sdLeftEyeBoundThree(p);
                float x_l_bound_th = sdLeftEyeBoundThree(get_X_plus(p)) - sdLeftEyeBoundThree(get_X_minus(p));
                float y_l_bound_th = sdLeftEyeBoundThree(get_Y_plus(p)) - sdLeftEyeBoundThree(get_Y_minus(p));
                float z_l_bound_th = sdLeftEyeBoundThree(get_Z_plus(p)) - sdLeftEyeBoundThree(get_Z_minus(p));
                f = min(f, d_LeftEyeBoundThree);

                if (f < march_hit_tolerance) {
                    n = normalize(vec3(x_l_bound_th, y_l_bound_th, z_l_bound_th));
                    return getColor(p, n, o, vec3(0, 0, 0));
                }

                float d_lip = sdUpperLip(p);
                f = min(f, d_lip);

                if (f < march_hit_tolerance) {
                    x_prime = sdUpperLip(get_X_plus(p)) - sdUpperLip(get_X_minus(p));
                    y_prime = sdUpperLip(get_Y_plus(p)) - sdUpperLip(get_Y_minus(p));
                    z_prime = sdUpperLip(get_Z_plus(p)) - sdUpperLip(get_Z_minus(p));
                    n = normalize(vec3(x_prime, y_prime, z_prime));
                    return getColor(p, n, o, lip_colors[lip]);
                }
            }
        }

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
