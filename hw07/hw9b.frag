#version 330 core

uniform float iTime;
uniform vec2 iResolution;
uniform mat4 C;

out vec4 fragColor;

float TAU = 6.28318530718;
float RAD(float deg) {
    return deg / 360.0 * TAU;
}
float inverse_lerp(float a, float b, float p) {
    return (p-a)/(b-a);
}
float linear_remap(float p, float a, float b, float c, float d) {
    return mix(c, d, inverse_lerp(a,b,p));
}
vec3 linear_remap_vec3(vec3 v, float a, float b, float c, float d) {
    return vec3(linear_remap(v.x, a, b, c, d), 
                linear_remap(v.y, a, b, c, d),
                linear_remap(v.z, a, b, c, d));

}

// TRANSFORMATION MATRICES 

mat3 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);

    return mat3(
        vec3(c, -s, 0),
        vec3(s, c, 0),
        vec3(0, 0, 1)
    );
}

// PRIMITIVES 

float sdSphere(vec3 p, float s)
{
  return length(p)-s;
}

float opElongateSphere(vec3 p, vec3 h, float s)
{   
    vec3 q = p - clamp(p, -h, h);
    return sdSphere(q, s);
}

float sdSolidAngle(vec3 p, vec2 c, float ra)
{
  // c is the sin/cos of the angle
  vec2 q = vec2( length(p.xz), p.y );
  float l = length(q) - ra;
  float m = length(q - c*clamp(dot(q,c),0.0,ra) );
  return max(l,m*sign(c.y*q.x-c.x*q.y));
}

float rotatedSolidAngle(vec3 p, vec2 c, float ra, float angle) {
    float t = sin(iTime);

    mat4 R_z = mat4(
        cos(angle), -sin(angle), 0, 0,
        sin(angle), cos(angle), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );

   vec3 pt = (R_z * vec4(p, 1.0)).xyz;
   return sdSolidAngle(pt, c, ra);
}

float dot2(in vec3 v ) { return dot(v,v); }
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2)
{
    // sampling independent computations (only depend on shape)
    vec3  ba = b - a;
    float l2 = dot(ba,ba);
    float rr = r1 - r2;
    float a2 = l2 - rr*rr;
    float il2 = 1.0/l2;
    
    // sampling dependant computations
    vec3 pa = p - a;
    float y = dot(pa,ba);
    float z = y - l2;
    float x2 = dot2( pa*l2 - ba*y );
    float y2 = y*y*l2;
    float z2 = z*z*l2;

    // single square root!
    float k = sign(rr)*rr*rr*x2;
    if( sign(z)*a2*z2 > k ) return  sqrt(x2 + z2)        *il2 - r2;
    if( sign(y)*a2*y2 < k ) return  sqrt(x2 + y2)        *il2 - r1;
                            return (sqrt(x2*a2*il2)+y*rr)*il2 - r1;
}

float sdCappedCylinder( vec3 p, float h, float r )
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdLongCandy(vec3 p) {
    float displacement = sin(5.0 * p.x) * sin(5.0 * p.y) * sin(5.0 * p.z) * 0.25 * sin(iTime);

    // Body
    vec3 sphere_center = vec3(-1.0, -0.5, 0.0);
    float body_radius = 0.25;
    float dist_to_sphere = opElongateSphere(p - sphere_center, vec3(0.5, 0.0, 0.0), body_radius);

    // Left side    
    vec3 left_center = vec3(-1.5, -0.5, 0.0);
    vec2 c = vec2(sin(RAD(30)), cos(RAD(30)));
    float dis_to_left = rotatedSolidAngle(p - left_center, c, 0.7, RAD(90));
                
    // Right side
    vec3 right_center = vec3(-0.5, -0.5, 0.0);
    float dis_to_right = rotatedSolidAngle(p - right_center, c, 0.7, RAD(-90));

    float f = min(dist_to_sphere, dis_to_left);
    f = min(f, dis_to_right);
    return f + displacement;
}


vec2 sdIceCream(vec3 p) {
    vec3 a = vec3(-4.0, -0.25, 0.0);
    vec3 b = vec3(-4.0, 0.75, 0.0);

    float angle = RAD(15);

    mat4 R_z = mat4(
        cos(angle), -sin(angle), 0, 0,
        sin(angle), cos(angle), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );

   /*mat4 S = mat4(
    1, 0, 0, 0,
    0, 0.5 + 0.25*abs(sin(iTime)), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
   );*/

    //vec3 pt = (S * R_z * vec4(p, 1.0)).xyz;
    vec3 pt = (R_z * vec4(p, 1.0)).xyz;
    float dist_to_ice_cream = sdRoundCone(pt, a, b, 0.1, 0.3);

    return vec2(dist_to_ice_cream, pt.y);
}

vec4 march(vec3 o, vec3 d) {
    // params
    const int   march_max_steps     = 80;
    const float march_hit_tolerance = 0.001;
    const float march_max_distance  = 100.0;
    // o -- camera origin               
    // t -- distance marched along ray  
    // d -- camera direction            
    // p -- current position along ray  
    // f -- distance to implicit surface
    float t = 0.0;
    int step = 0;
    int cream = 0;
    int hit_ice_cream = 0;

    while ((step++ < march_max_steps) && (t < march_max_distance)) {
        vec3 p = o + t * d;
        float f = march_max_distance; {
            // TODO: make the scene of your dreams :)
            //  MELTING SWEETS 
            float displacement = sin(5.0 * p.x) * sin(5.0 * p.y) * sin(5.0 * p.z) * 0.25 * sin(iTime);
            { // long candy 
                f = sdLongCandy(p+vec3(0.5,0.0,0.0));
                if (f < march_hit_tolerance) {
                    return vec4(0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, -0.33) - vec3(0.3 * p.z))), 1.0);
                }   
            }
            {   // ice cream 
                vec2 dis_to_ice_cream = sdIceCream(p);
                f = min(f, dis_to_ice_cream.x + displacement);
                if (f < march_hit_tolerance) {
                    if (dis_to_ice_cream.y > 0.75) {
                        // color cream portion
                        return vec4(1.000, 0.833, 0.224, 1.0);
                    } else {
                         return vec4(0.5, 0.35, 0.05, 1.0); 
                    }
                } 
            }
            { // dango 
                float dango_r = 0.2;
                vec3 dango_bot_pos = vec3(1.0, -0.5, 0.0); 
                vec3 dango_mid_pos = dango_bot_pos + vec3(0.0, 2*dango_r, 0.0);
                vec3 dango_top_pos = dango_mid_pos + vec3(0.0, 2*dango_r, 0.0);

                float angle = RAD(20);

                mat4 R_z = mat4(
                    cos(angle), -sin(angle), 0, 0,
                    sin(angle), cos(angle), 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                );

                vec4 dango_bot_pos_t = R_z * vec4(dango_bot_pos, 1.0); 
                vec4 dango_mid_pos_t = R_z * vec4(dango_mid_pos, 1.0); 
                vec4 dango_top_pos_t = R_z * vec4(dango_top_pos, 1.0); 

                float dango_bot_d = sdSphere(p - dango_bot_pos_t.xyz, dango_r);
                float dango_mid_d = sdSphere(p - dango_mid_pos_t.xyz, dango_r);
                float dango_top_d = sdSphere(p - dango_top_pos_t.xyz, dango_r);
                f = min(f, dango_bot_d + displacement);
                if (f < march_hit_tolerance) {
                    vec3 col = vec3(136,213,123);
                    col = linear_remap_vec3(col, 0.0, 255.0, 0.0, 1.0);
                    return vec4(col, 1.0);    
                }
                f = min(f, dango_mid_d  + displacement);
                if (f < march_hit_tolerance) {
                    vec3 col = vec3(239,239,239);
                    col = linear_remap_vec3(col, 0.0, 255.0, 0.0, 1.0);
                    return vec4(col, 1.0);       
                }
                f = min(f, dango_top_d + displacement);
                if (f < march_hit_tolerance) {
                    vec3 col = vec3	(234,156,214);
                    col = linear_remap_vec3(col, 0.0, 255.0, 0.0, 1.0);
                    return vec4(col, 1.0); 
                }
                vec3 dango_stick_pos = vec3(0.8, -0.7, 0.0);
                float dango_stick_h = dango_r * 2 * 2.5;
                float dango_stick_r = 0.02; 
                float dango_stick_d = sdCappedCylinder(inverse(rotateZ(RAD(20))) * (p-dango_stick_pos), dango_stick_h, dango_stick_r);
                f = min(f, dango_stick_d + displacement);
                if (f < march_hit_tolerance) {
                    vec3 col = vec3(196, 164, 132);
                    col = linear_remap_vec3(col, 0.0, 255.0, 0.0, 1.0);
                    return vec4(col, 1.0); 
                }
            }
            { // lollipop 
                float lollipop_r = 0.4;
                vec3 lollipop_pos = vec3(3.0, 0.0, 0.0); 
                float lollipop_d = sdSphere(p - lollipop_pos, lollipop_r);
                f = min(f, lollipop_d  + displacement);

                if (f < march_hit_tolerance) {
                    return vec4(0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.66, -0.66) - vec3(0.6 * p.z))), 1.0);
                }

                vec3 lol_ring_pos = lollipop_pos;
                float lol_ring_r = lollipop_r + 0.02;
                float lol_ring_h = 0.02;
                //float lol_ring_d = sdRoundedCylinder(p - lol_ring_pos, lol_ring_r, lol_ring_r, lol_ring_h);
                float lol_ring_d = sdCappedCylinder(p - lol_ring_pos, lol_ring_h, lol_ring_r);
                f = min(f, lol_ring_d  + displacement);

                if (f < march_hit_tolerance) {
                    vec3 col = vec3	(93, 63, 211);
                    col = linear_remap_vec3(col, 0.0, 255.0, 0.0, 1.0);
                    return vec4(col, 1.0); 
                }

                vec3 lol_stick_pos = lollipop_pos - vec3(0.0, 0.8, 0.0);
                float lol_stick_h = lollipop_r * 2;
                float lol_stick_r = 0.02; 
                float lol_stick_d = sdCappedCylinder(p-lol_stick_pos, lol_stick_h, lol_stick_r);
                f = min(f, lol_stick_d + displacement);
                if (f < march_hit_tolerance) {
                    return vec4(1.0, 1.0, 1.0, 1.0); 
                }
            }

        }
        
        t += min(f, .5); // make the number smaller if you're getting weird artifacts
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
