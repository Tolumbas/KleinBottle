# KleinBottle
### 4D KleinBottle Rotation
This is a course project for "Computer Graphics with WebGL"  2019

The vertex postions are calucalted in the vertex shader. This means that I had to use 4D vectors and 5D matrix multiplication.

WebGLlib.js is my custom modification of the Boichev's WebGLlib, I've added:
 - dynamic download of the shaders
 - support for multiple programs
 - support for 5D matrices and 4D vectors
 - removed the assuming of program variable names and global variables (which means sadly I removed texture support)
 
