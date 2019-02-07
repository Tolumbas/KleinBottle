attribute vec4 position;
attribute vec4 normal;
// uniform mat4 rotation;

uniform float rotation[25],viewMatrix4d[25],prespMatrix4d[25];

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

varying vec4 fnormal;
varying vec4 flight;




void mult(float matrix[25],inout float vector[5]){
    float o[5];
    o[0] = matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2] + matrix[3] * vector[3] + matrix[4] * vector[4];
    o[1] = matrix[5] * vector[0] + matrix[6] * vector[1] + matrix[7] * vector[2] + matrix[8] * vector[3] + matrix[9] * vector[4];
    o[2] = matrix[10] * vector[0] + matrix[11] * vector[1] + matrix[12] * vector[2] + matrix[13] * vector[3] + matrix[14] * vector[4];
    o[3] = matrix[15] * vector[0] + matrix[16] * vector[1] + matrix[17] * vector[2] + matrix[18] * vector[3] + matrix[19] * vector[4];
    o[4] = matrix[20] * vector[0] + matrix[21] * vector[1] + matrix[22] * vector[2] + matrix[23] * vector[3] + matrix[24] * vector[4];

    vector[0] = o[0];
    vector[1] = o[1];
    vector[2] = o[2];
    vector[3] = o[3];
    vector[4] = o[4];
}

void main(){
    fnormal = normal;

    float extended[5];
    extended[0] = position.x;
    extended[1] = position.y;
    extended[2] = position.z;
    extended[3] = position.w;
    extended[4] = 1.0;

    float light[5];
    light[0] = 1.0;
    light[1] = 0.0;
    light[2] = 0.0;
    light[3] = 1.0;
    light[4] = 1.0;

    mult(rotation,extended);
    mult(viewMatrix4d,extended);
    mult(prespMatrix4d,extended);

    mult(rotation,light);
    mult(viewMatrix4d,light);
    mult(prespMatrix4d,light);

    vec4 li = vec4(light[0],light[1],light[2],1.0);
    flight = projectionMatrix*viewMatrix*li;

    vec4 ortho = vec4(extended[0],extended[1],extended[2],1.0);
    gl_Position = projectionMatrix*viewMatrix*ortho;
    gl_PointSize = 4.0;
}
