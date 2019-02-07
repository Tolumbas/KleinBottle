precision mediump float;
uniform vec3 color;

varying vec4 fnormal;
varying vec4 flight;

void main(){
    // vec4 light = vec4(1.0,0.0,0.0,-1.0);
    float coef = dot(normalize(flight),normalize(fnormal));
    coef = max(coef,0.2);
    vec3 res = coef*vec3(1.0,1.0,1.0);
    // vec3 res = normalize(fnormal).xyz;
    gl_FragColor = vec4(res,1.0);
}