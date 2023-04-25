#version 330 core

uniform float iTime;
uniform vec2 iResolution;
uniform mat4 C;

out vec4 fragColor;

float TAU = 6.28318530718;
float RAD(float deg) {
    return deg / 360.0 * TAU;
}

vec3 opRepLim(vec3 p, float s, vec3 lima, vec3 limb) {
    return p - s*clamp(round(p/s), lima, limb);
}


float sdSphere(vec3 p, float s)
{
  return length(p)-s;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
}
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float opIntersection(float d1, float d2) {
    return max(d1, d2);
}

vec3 opRep(vec3 p, float s)
{
    return mod(p+0.5*s,s)-0.5*s;
}

float opExtrusion(vec3 p, float sdf, float h)
{
    vec2 w = vec2(sdf, abs(p.z) - h);
  	return min(max(w.x,w.y),0.0) + length(max(w,0.0));
}

vec2 opRevolution(vec3 p, float w)
{
    return vec2(length(p.xz) - w, p.y);
}

float opElongateSphere(vec3 p, vec3 h, float s)
{
    vec3 q = p - clamp(p, -h, h);
    return sdSphere(q, s);
}

float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); 
}

float sdRotatedTorus(vec3 p, vec3 torus_position, float major_radius, float minor_radius) {
   float angle = RAD(65);
   mat4 R_x = mat4(
    1, 0, 0, 0,
    0, cos(angle), -sin(angle), 0,
    0, sin(angle), cos(angle), 0,
    0, 0, 0, 1
   );

   float t = sin(iTime);
   mat4 R_y = mat4(
    cos(t), 0, sin(t), 0,
    0, 1, 0, 0,
    -sin(t), 0, cos(t), 0, 
    0, 0, 0, 1
   );

   vec3 pt = (vec4(p, 1) * inverse(R_x * R_y)).xyz;
   vec2 torus_radii = vec2(major_radius, minor_radius);
   return sdTorus(pt, torus_radii);
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
    mat4 R_z = mat4(
        cos(angle), -sin(angle), 0, 0,
        sin(angle), cos(angle), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );

   vec3 pt = (R_z * vec4(p, 1.0)).xyz;
   return sdSolidAngle(pt, c, ra);
}

float opSubtraction( float d1, float d2 )
{
    return max(-d1,d2);
}

float sdPear(vec3 p) {
    vec3 big_center = vec3(0.0, 0.0, 1.0);
    float big_radius = 1.0;
    float dis_to_big_sphere = opElongateSphere(p - big_center, vec3(0.0, 0.5, 0.0), big_radius);
    return dis_to_big_sphere;
}

float sdLongCandy(vec3 p) {
    // Body
    vec3 sphere_center = vec3(0.0, 0.0, 0.0);
    float body_radius = 0.25;
    float dist_to_sphere = opElongateSphere(p - sphere_center, vec3(0.5, 0.0, 0.0), body_radius);

    // Left side    
    vec3 left_center = vec3(-0.5, 0.0, 0.0);
    vec2 c = vec2(sin(RAD(30)), cos(RAD(30)));
    float dis_to_left = rotatedSolidAngle(p - left_center, c, 0.7, RAD(90));
                
    // Right side
    vec3 right_center = vec3(0.5, 0.0, 0.0);
    float dis_to_right = rotatedSolidAngle(p - right_center, c, 0.7, RAD(-90));

    float f = min(dist_to_sphere, dis_to_left);
    f = min(f, dis_to_right);
    return f;
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
    while ((step++ < march_max_steps) && (t < march_max_distance)) {
        vec3 p = o + t * d;
        float f = march_max_distance; {
            // TODO: make the scene of your dreams :)
            { // box
                //vec3 box_position = vec3(0.0, 0.0, 0.0);
                //vec3 box_position = vec3(2.0 * sin(iTime), 0.0, 0.0);
                //vec3 q = p*6.0 - vec3(5.0, 0.0, 0.0);
                //vec3 r = opRepLim(q, 1.0, vec3(2.0, 2.0, 2.0), vec3(-2.0, -2.0, -2.0));
                //vec3 box_side_lengths = vec3(1.0);
                //float dist = sdBox(r - box_position, box_side_lengths) - 0.1;
                //dist /= 6;
                //float distance_to_box = sdBox(p - box_position, box_side_lengths) - 0.1;
                //float displacement = sin(5.0 * p.x) * sin(5.0 * p.y) * sin(5.0 * p.z) * 0.25;
                //f = min(f, dist);
                //f = min(f, distance_to_box);
            }
            { // torus
                vec3 torus_position = vec3(-1.0, 0.0, 0.0);
                float torus_major_radius = 1.0;
                float torus_minor_radius = 0.3;
                //vec2 torus_radii = vec2(torus_major_radius, torus_minor_radius);
                //float distance_to_torus = sdTorus(p - torus_position, torus_radii);
                //float dis = rotatedTorus(p);
                //float distance_to_torus = sdRotatedTorus(p, torus_position, torus_major_radius, torus_minor_radius);
                //f = min(f, distance_to_torus);
            }

            { // torus top
                //vec3 torus_position = vec3(-1.0, 1.0, 0.0);
                //float torus_major_radius = 1.0;
                //float torus_minor_radius = 0.3;
                //vec2 torus_radii = vec2(torus_major_radius, torus_minor_radius);
                //float distance_to_torus = sdTorus(p - torus_position, torus_radii);
                //float displacement = sin(5.0 * p.x) * sin(5.0 * p.y) * sin(5.0 * p.z) * 0.25;
                //f = min(f, displacement + distance_to_torus);
                //vec3 q = p + vec3(0.0, -2.0, 0.0);
                //1f = min(f, opExtrusion(q, sdTorus(q - torus_position, torus_radii) + displacement, 0.005));
            }

            {
                // 
                vec3 sphere_center = vec3(0.0, 0.0, 0.0);
                float radius = 0.25;
                //float dist_to_sphere = opElongateSphere(p - sphere_center, vec3(0.5, 0.0, 0.0), radius);
                //f = min(f, dist_to_sphere);
            }

            {
                vec3 center = vec3(-0.5, 0.0, 0.0);
                vec2 c = vec2(sin(RAD(30)), cos(RAD(30)));
                //float dis = rotatedSolidAngle(p, c, 0.8);
                //f = min(f, dis);
            }

            {
                vec3 center = vec3(0.5, 0.0, 0.0);
                vec2 c = vec2(sin(RAD(30)), cos(RAD(30)));
                //float dis = r_rotatedSolidAngle(p, c, 0.8);
                //f = min(f, dis);
            }

            {
                f = sdLongCandy(p);
            }

            {   
                float dis = sdPear(p);
                f = min(f, dis);
            }

        }
        if (f < march_hit_tolerance) { // hit!
            //if (p.y > 0.1) {
                //return vec4(1.0, 1.0, 1.0, 1.0);
            //}
            //if (f < 0.0008 + 0.0001*sin(iTime)) {
                //return vec4(1.0, 1.0, 1.0, 1.0);
            //}
            return vec4(0.5 + 0.5 * cos(TAU * (vec3(0.0, 0.33, -0.33) - vec3(0.3 * p.z))), 1.0);
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
