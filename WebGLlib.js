
const FLOATS = Float32Array.BYTES_PER_ELEMENT;
const PI = Math.PI;
const TAU = 2*Math.PI;

const TORUS_MAJOR_SIDES = 50;
const TORUS_MINOR_SIDES = 25;


let bufferedGL = undefined;
let bufferedProg = undefined;

let currentMatrix;

//Кефя се на функционалното програмиране :3
zipWith = (f, xs, ys) => xs.map((n,i) => f(n, ys[i]))


//доста се кефя, да...
const matXvec = (mat,vec)=>vec.map((_,a)=>dot(vec,vec.map((_,b)=>mat[b*vec.length + a])));


Array.prototype.splitInto = function(n){
    //за жалост този код изисква твърде много памет :(
    //if (this.length <= n) return [this];
    //return [this.slice(0,n), ... this.slice(n).splitInto(n)];

    let data = new Array(Math.ceil(this.length/n));
    for (var a=0,size=-1;a<this.length;a++){
        if(a%n==0)data[++size] = [this[a]];
        else data[size].push(this[a]);
    }
    return data;
}

function determinant(v1,v2,v3){
    if (!v1.length || !v2.length || !v3.length || v1.length != 3 || v2.length != 3 || v3.length != 3){
        throw "vectorProduct: Error in length or in input types"
    }
    return  (v1[0] * v2[1] * v3[2]) +
            (v1[1] * v2[2] * v3[0]) +
            (v1[2] * v2[0] * v3[1]) -

            (v3[0] * v2[1] * v1[2]) - 
            (v3[1] * v2[2] * v1[0]) - 
            (v3[2] * v2[0] * v1[1]);         
}

/*
            | A1 B1 C1 right |
A x B x C = | A2 B2 C2 up    |
            | A3 B3 C3 back  |
            | A4 B4 C4 charm |

където right, up, back и charm са единичните вектори.
като се развие тази детерминанта по 4тата колона се получава сума
от адиогирани количества, които са коефициентите на единичните вектори.

А пък на мен ми трябват само коефициентите.
*/
function vectorProduct4d(v1,v2,v3){
    return [
        + determinant(
            [v1[1],v1[2],v1[3]],
            [v2[1],v2[2],v2[3]],
            [v3[1],v3[2],v3[3]],
            ),
        - determinant(
            [v1[0],v1[2],v1[3]],
            [v2[0],v2[2],v2[3]],
            [v3[0],v3[2],v3[3]],
        ),
        + determinant(
            [v1[0],v1[1],v1[3]],
            [v2[0],v2[1],v2[3]],
            [v3[0],v3[1],v3[3]],
        ),
        - determinant(
            [v1[0],v1[1],v1[2]],
            [v2[0],v2[1],v2[2]],
            [v3[0],v3[1],v3[2]],
        ),
    ];
}


function perspMatrix4d(angle)
{
	var fov = 1/Math.tan(angle/2);
	var matrix = [
		fov, 0, 0,  0, 0 ,
		0, fov, 0,  0, 0 ,
		0, 0, fov, -1, 0 ,
        0, 0,   0,  1, 0 ,
        0, 0,   0,  0, 1 
    ];
	return new Float32Array(matrix);
}

function viewMatrix4d (eye, focus, up, back) 
{
	const col3 = normalize(vectorToFrom(eye,focus));
	
	const col2 = normalize(vectorProduct4d(up,back,col3));
	
    const col1 = normalize(vectorProduct4d(back,col2,col3));
    
    const col0 = normalize(vectorProduct4d(col1,col2,col3));
	
	const matrix = [
		col0[0], col1[0],  col2[0], col3[0], 0,
		col0[1], col1[1],  col2[1], col3[1], 0,
		col0[2], col1[2],  col2[2], col3[2], 0,
		col0[3], col1[3],  col2[3], col3[3], 0,
		-dot(col0,eye), -dot(col1,eye), -dot(col2,eye),-dot(col3,eye), 1 ];
	return new Float32Array(matrix);
};

function translateMatrix4d(v){
	const matrix = [
		1   , 0   , 0   , 0   , 0,
		0   , 1   , 0   , 0   , 0,
		0   , 0   , 1   , 0   , 0,
		0   , 0   , 0   , 1   , 0,
		v[0], v[1], v[2], v[3], 1];
	return new Float32Array(matrix);
}

function rotXY(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		c, s, 0, 0, 0,
	   -s, c, 0, 0, 0,
		0, 0, 1, 0, 0,
		0, 0, 0, 1, 0,
		0, 0, 0, 0, 1];
	return new Float32Array(matrix);
}
function rotYZ(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		1,  0, 0, 0, 0,
	    0,  c, s, 0, 0,
		0, -s, c, 0, 0,
		0,  0, 0, 1, 0,
		0,  0, 0, 0, 1];
	return new Float32Array(matrix);
}
function rotXZ(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		c, 0, -s, 0, 0,
	    0, 1,  0, 0, 0,
		s, 0,  c, 0, 0,
		0, 0,  0, 1, 0,
		0, 0,  0, 0, 1];
	return new Float32Array(matrix);
}

function rotXU(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		 c, 0, 0, s, 0,
	     0, 1, 0, 0, 0,
		 0, 0, 1, 0, 0,
		-s, 0, 0, c, 0,
		 0, 0, 0, 0, 1];
	return new Float32Array(matrix);
}

function rotYU(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		1, 0, 0,  0, 0,
	    0, c, 0, -s, 0,
		0, 0, 1,  0, 0,
		0, s, 0,  c, 0,
		0, 0, 0,  0, 1];
	return new Float32Array(matrix);
}
function rotZU(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		1, 0, 0,  0, 0,
	    0, 1, 0,  0, 0,
		0, 0, c, -s, 0,
		0, 0, s,  c, 0,
		0, 0, 0,  0, 1];
	return new Float32Array(matrix);
}


const mat5xmat5 = (mat1,mat2)=>{
	let out = new Array(25);
	for (var j =0;j< 5;j++){
		for (var i=0;i<5;i++){
			for (var k =0;k< 5;k++){
				out [j*5+i] = out [j*5+i] + mat2[k*5+j]*mat1[i*5+k] || mat1[k*5+j]*mat2[i*5+k] ;
			}
		}
	}
	return out;
}


/// Край на 4д кода.
///
///
///
///
///
///
///
/// Надолу е код, който се занимава с 3Д графиката.

Float32Array.prototype = Object.create(Float32Array.prototype);
const extentions = {
    texTranslate,
	texScale,
    texRotate,
    translate: translate,
    scale: scale,
    xRotate: xRotate,
    yRotate: yRotate,
    zRotate: zRotate,
}
for(let a in extentions)
	Float32Array.prototype[a] = extentions[a];




function getContext(canvas,register = true){
	canvas.width = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
	
    if (canvas == null)
        throw "canvas is null";

	let context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	
	if (!context)
        throw("Искаме WebGL контекст, а няма!");
	
	if(register)
		registerContext(context);

	window.addEventListener("resize",e=>{
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
		context.viewport(0,0,canvas.offsetWidth,canvas.offsetHeight);
	})
	return context;
}
function registerContext(context){
    bufferedGL = context;
}

function changeProgram(prog,inGl){
	let gl = _gl();
	bufferedProg = prog;
	gl.useProgram(prog);
}

async function downloadShader(url){
    const res = await fetch(url).catch(e=>alert("Проекта трябва да се хостне"));
    return await res.text();
}

async function getShader(url,type,inGL){
    if (type === undefined)
        throw "specify type of the shader pls";
    
    const source = await downloadShader(url);

    const gl = inGL || bufferedGL;

    const shader = gl.createShader(type);

	gl.shaderSource(shader,source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
		throw gl.getShaderInfoLog(shader);
	
	return shader;
}

async function getProgram(urlVertex,urlFragment,inGL){
    const gl = inGL || bufferedGL;
    if (!gl)
        throw "Register context";
    
    
    const [vertexShader,fragmentShader] = await Promise.all(
        [   getShader(urlVertex,gl.VERTEX_SHADER),
            getShader(urlFragment,gl.FRAGMENT_SHADER)   ]);
    

	
	var shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram,vertexShader);
	gl.attachShader(shaderProgram,fragmentShader);
    gl.linkProgram(shaderProgram);
    

	if (!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS))
		throw (gl.getProgramInfoLog(shaderProgram));
	
	changeProgram(shaderProgram);
	return shaderProgram;
}


function getVariables(inProg)
{
	let prog = inProg || bufferedProg;
    let vars = new Map();
	for (var i=0; i<gl.getProgramParameter(prog,gl.ACTIVE_UNIFORMS); i++)
	{
		const {name} = gl.getActiveUniform(prog,i);
		vars.set(name, gl.getUniformLocation(prog,name))
	}

	for (var i=0; i<gl.getProgramParameter(prog,gl.ACTIVE_ATTRIBUTES); i++)
	{
		const {name} = gl.getActiveAttrib(prog,i);
		vars.set(name,gl.getAttribLocation(prog,name));
    }
    return vars;
}

async function fetchImage(url)
{
    const resp = await fetch(url);
    const arr = new Uint8Array(await resp.arrayBuffer());
    return arr;
}

function createTexture(image,inGL){
    const gl = inGL || bufferedGL;
    if(!gl) throw "createTexture: Register context pls";
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    
    return texture;
}

function texIdentity()
{
	return new Float32Array([1,0,0,0,1,0,0,0,1]);
}

// транслира текстурна 3D матрица с 2D вектор 
function texTranslate(v)
{
    const m6 = this[6] + this[0]*v[0]+this[3]*v[1];
    const m7 = this[7] + this[1]*v[0]+this[4]*v[1];
    const out = new Float32Array(
        this[0],this[1],this[2],
        this[3],this[4],this[5],
        m6     ,m7     ,this[8]);
	return out;
}

// мащабира текстурна 3D матрица с 2D вектор 
function texScale(m,v)
{
	const m0 = this[0] * v[0];
	const m1 = this[1] * v[0];
	const m3 = this[3] * v[1];
    const m4 = this[4] * v[1];
    return new Float32Array(
        m0     ,m1,     this[2],
        m3     ,m4,     this[5],
        this[8],this[7],this[8])
}

// върти текстурна 3D матрица на ъгъл в градуси 
function texRotate(m,a)
{
	const s = Math.sin(a);
	const c = Math.cos(a);
	
	const m0=this[0]*c-this[3]*s;
	const m3=this[0]*s+this[3]*c;
	
	const m1=this[1]*c-this[4]*s;
    const m4=this[1]*s+this[4]*c;
    return new Float32Array(
        m0     ,m1,     this[2],
        m3     ,m4,     this[5],
        this[8],this[7],this[8])
}


function orthoMatrix(width, height, near, far)
{
	var matrix = [
		2.0/width, 0, 0, 0,
		0, 2.0/height, 0, 0,
		0, 0, 2.0/(near-far), 0,
		0, 0, (far+near)/(near-far), 1];
	return new Float32Array(matrix);
}
function perspMatrix(angle, aspect, near, far)
{
	var fov = 1/Math.tan(angle/2);
	var matrix = [
		fov/aspect, 0, 0, 0,
		0, fov, 0, 0,
		0, 0, (far+near)/(near-far), -1,
		0, 0, 2.0*near*far/(near-far), 0];
	return new Float32Array(matrix);
}
function dot(xs,ys){
    if(xs.length != ys.length)
        throw "Dot multiplication : vectors with different lengths";
    return zipWith((x,y)=>x*y,xs,ys).reduce((acc,x)=>acc+x,0);
}
function normalize(xs)
{
	var len = Math.sqrt( dot(xs,xs) );
	if (len == 0) return xs.map(()=>0);
	else          return xs.map(x=>x/len);
}

function vectorProduct(x,y)
{
    if (!x.length || !y.length || x.length != 3 || y.length != 3){
        throw "vectorProduct: Error in length or in input types"
    }
	return [
		x[1]*y[2]-x[2]*y[1],
		x[2]*y[0]-x[0]*y[2],
		x[0]*y[1]-x[1]*y[0] ];
}

function vectorToFrom(xs,ys)
{
	return zipWith((x,y)=>x-y,xs,ys);
}
function isV3(v){
    return v.constructor === Array && v.length == 3
}

function viewMatrix (eye, focus, up)
{
    if(!isV3(eye) || !isV3(focus) || !isV3(up)){
        throw "viewMatrix: Error in arguments type"
    }
	// единичен вектор Z' по посоката на гледане
	const z = normalize(vectorToFrom(eye,focus));
	
	// единичен вектор X', перпендикулярен на Z' и на посоката нагоре
	const x = normalize(vectorProduct(up,z));
	
	// единичен вектор Y', перпендикулярен на X' и Z'
	const y = normalize(vectorProduct(z,x));
	
	// резултатът е тези три вектора + транслация
	const matrix = [
		x[0], y[0], z[0], 0,
		x[1], y[1], z[1], 0,
		x[2], y[2], z[2], 0,
		-dot(x,eye), -dot(y,eye), -dot(z,eye), 1 ];
	return new Float32Array(matrix);
};

function multiplyMatrix(a, b) {
	const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
		a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
		a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
		a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
	let out= new Array(16);
	let b0  = b[0], b1 = b[1], b2 = b[2], b3 = b[3];  
	out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
	out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
	out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

	b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
	out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
	out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
	out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
	out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
	return out;
};




// създаване на матрица за нормалните вектори,
// чрез реципрочна стойност и транспозиция
function calculateNormalMatrix(a) {
	const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
		a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
		a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
		a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

		b00 = a00 * a11 - a01 * a10,
		b01 = a00 * a12 - a02 * a10,
		b02 = a00 * a13 - a03 * a10,
		b03 = a01 * a12 - a02 * a11,
		b04 = a01 * a13 - a03 * a11,
		b05 = a02 * a13 - a03 * a12,
		b06 = a20 * a31 - a21 * a30,
		b07 = a20 * a32 - a22 * a30,
		b08 = a20 * a33 - a23 * a30,
		b09 = a21 * a32 - a22 * a31,
		b10 = a21 * a33 - a23 * a31,
		b11 = a22 * a33 - a23 * a32,

		// детерминанта
		det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

	det = 1.0 / det;

	var out=[];
	out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
	out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
	out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
	out[3] = 0;
	
	out[4] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
	out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
	out[6] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
	out[7] = 0;

	out[8] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
	out[9] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
	out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
	out[11] = 0;
	
	out[12] = 0;
	out[13] = 0;
	out[14] = 0;
	out[15] = 1;

	return out;
};
function identityMatrix(dim=4)
{
	if (dim == 4){
	const matrix = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
	}
	else{
		const size = dim**2;
		var matrix = new Float32Array(size);
		for (var a=0;a<size;a++){
			matrix[a] = a%(dim+1)==0?1:0;
		}
		return matrix;
	}
}

function translateMatrix(v)
{
    if(!isV3(v))
        throw "translateMatrix: size missmatch"
	var matrix = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		v[0], v[1], v[2], 1];
	return new Float32Array(matrix);
}

function scaleMatrix(v)
{
    if(!isV3(v))
        throw "scaleMatrix: size missmatch"
	const matrix = [
		v[0], 0, 0, 0,
		0, v[1], 0, 0,
		0, 0, v[2], 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}
function zRotateMatrix(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		c, s, 0, 0,
	   -s, c, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}

function xRotateMatrix(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		1, 0, 0, 0,
		0, c, s, 0,
		0,-s, c, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}

function yRotateMatrix(a)
{
	const c = Math.cos(a);
	const s = Math.sin(a);
	const matrix = [
		c, 0, s, 0,
		0, 1, 0, 0,
	   -s, 0, c, 0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}
function rotateMatrix(a, vin)
{
    if(!isV3(vin))
        throw "rotateMatrix: vector size missmatch";
	const v = normalize(vin);
	
	const c = Math.cos(a);
	const s = Math.sin(a);
	
	const xx = v[0]*v[0]*(1-c);
	const xy = v[0]*v[1]*(1-c);
	const xz = v[0]*v[2]*(1-c);
	const yy = v[1]*v[1]*(1-c);
	const yz = v[1]*v[2]*(1-c);
	const zz = v[2]*v[2]*(1-c);
	const matrix = [
		xx+c,      xy-v[2]*s, xz+v[1]*s, 0,
		xy+v[2]*s, yy+c,      yz-v[0]*s, 0,
		xz-v[1]*s, yz+v[0]*s, zz+c,      0,
		0, 0, 0, 1];
	return new Float32Array(matrix);
}
function begin(){
    currentMatrix = identityMatrix();
}
function translate(v)
{
    if(!isV3(v))
		throw "translate: vector size missmatch. " + v.length

	const mat = this == window?currentMatrix:this;
	
	mat[12] += mat[0]*v[0]+mat[4]*v[1]+mat[8]*v[2];
	mat[13] += mat[1]*v[0]+mat[5]*v[1]+mat[9]*v[2];
    mat[14] += mat[2]*v[0]+mat[6]*v[1]+mat[10]*v[2];
    return mat;
}

function scale(v)
{
    if(!isV3(v))
		throw "scale: vector size missmatch."
		
	const mat = this == window?currentMatrix:this;

	mat[0] *= v[0];
	mat[1] *= v[0];
	mat[2] *= v[0];
	
	mat[4] *= v[1];
	mat[5] *= v[1];
	mat[6] *= v[1];
	
	mat[8] *= v[2];
	mat[9] *= v[2];
    mat[10] *= v[2];
    
    return mat;
}

function xRotate(a)
{
	const mat = this == window?currentMatrix:this;
	
	const s = Math.sin(a);
	const c = Math.cos(a);
	
	a = mat[4]*s+mat[8]*c;
	mat[4]=mat[4]*c-mat[8]*s;
	mat[8]=a;
	
	a = mat[5]*s+mat[9]*c;
	mat[5]=mat[5]*c-mat[9]*s;
	mat[9]=a;
	
	a = mat[6]*s+mat[10]*c;
	mat[6]=mat[6]*c-mat[10]*s;
    mat[10]=a;
    
    return mat;
}

function yRotate(a){
	const s = Math.sin(a);
	const c = Math.cos(a);

	const mat = this == window?currentMatrix:this;

	
	a = mat[0]*s+mat[8]*c;
	mat[0]=mat[0]*c-mat[8]*s;
	mat[8]=a;
	
	a = mat[1]*s+mat[9]*c;
	mat[1]=mat[1]*c-mat[9]*s;
	mat[9]=a;
	
	a = mat[2]*s+mat[10]*c;
	mat[2]=mat[2]*c-mat[10]*s;
	mat[10]=a;

    return mat;
}


// добавя въртене около Z към матрицата на модела
function zRotate(a){
	const s = Math.sin(a);
	const c = Math.cos(a);
	
	a = currentMatrix[0]*s+currentMatrix[4]*c;
	currentMatrix[0]=currentMatrix[0]*c-currentMatrix[4]*s;
	currentMatrix[4]=a;
	
	a = currentMatrix[1]*s+currentMatrix[5]*c;
	currentMatrix[1]=currentMatrix[1]*c-currentMatrix[5]*s;
	currentMatrix[5]=a;
	
	a = currentMatrix[2]*s+currentMatrix[6]*c;
	currentMatrix[2]=currentMatrix[2]*c-currentMatrix[6]*s;
	currentMatrix[6]=a;

    return currentMatrix;
}

function cloneMatrix(a)
{
	var b = new Float32Array(a.length);
	b.set(a);
	return b;
}
function toBuffer(data,inGL){
	let gl = inGL || bufferedGL;
	if (!gl)
		throw "gl Is Not Defined!";
    let buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	return buf;
}

function _gl(inGL){
	let gl = inGL || bufferedGL;
	if (!gl)
		throw "gl Is Not Defined!";	
	return gl;
}
function _prog(inProg){
	let prog = inProg || bufferedProg;
	if (!prog)
		throw "program is not defined!";
	return prog;
}

function uniformMatrix(pos,mat,inGL){
	let gl = inGL || bufferedGL;
	if (mat.length == 25){
		gl.uniform1fv(pos,mat);
		return;
	}
	const correctSize = {
		4:"uniformMatrix2fv",
		9:"uniformMatrix3fv",
		16:"uniformMatrix4fv",
	}
	gl[correctSize[mat.length]](pos,false,mat);
}

function attribArray(pos,buffer,sizeEach,skip=0,offset=0,inGL){
	let gl = _gl(inGL);
	gl.enableVertexAttribArray(pos);
	gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
	gl.vertexAttribPointer(pos,sizeEach,gl.FLOAT,false,skip,offset);

}

function Plotfunction(f,size  = 50000){
	let data = new Array(size);
	for (let a = -1,b=0;a<1;a+=2/size,b+=2){
		data[b] = a;
		data[b+1] = f(a);
	}
	return data;
}

function Cube(){
    // 12 TRIANGLES
    // 8 floats per vertex: vx, vy, vz, nx, ny, nz, tx, ty 

    // върхове
	const v = [ [+0.5,-0.5,-0.5], [+0.5,+0.5,-0.5],
			  [-0.5,+0.5,-0.5], [-0.5,-0.5,-0.5],
			  [+0.5,-0.5,+0.5], [+0.5,+0.5,+0.5],
			  [-0.5,+0.5,+0.5], [-0.5,-0.5,+0.5] ];
	// нормални вектори
	const n = [ [1,0,0], [-1,0,0],
			  [0,1,0], [0,-1,0],
			  [0,0,1], [0,0,-1] ];
	// общ списък връх-нормала
	return [].concat(
			  v[0],n[0],0,0, v[1],n[0],1,0, v[4],n[0],0,1, // предна стена
			  v[4],n[0],0,1, v[1],n[0],1,0, v[5],n[0],1,1,
			  v[6],n[1],0,1, v[2],n[1],0,0, v[7],n[1],1,1, // задна стена
			  v[7],n[1],1,1, v[2],n[1],0,0, v[3],n[1],1,0, 
			  v[5],n[2],0,1, v[1],n[2],0,0, v[6],n[2],1,1, // дясна стена 
			  v[6],n[2],1,1, v[1],n[2],0,0, v[2],n[2],1,0, 
			  v[4],n[3],1,1, v[7],n[3],0,1, v[0],n[3],1,0, // лява стена 
			  v[0],n[3],1,0, v[7],n[3],0,1, v[3],n[3],0,0, 
			  v[4],n[4],0,0, v[5],n[4],1,0, v[7],n[4],0,1, // горна стена
			  v[7],n[4],0,1, v[5],n[4],1,0, v[6],n[4],1,1, 
			  v[0],n[5],0,0, v[3],n[5],0,1, v[1],n[5],1,0, // долна стена 
			  v[1],n[5],1,0, v[3],n[5],0,1, v[2],n[5],1,1 );

}



Array.prototype.toBuffer = function(){return toBuffer(this);}

function Pyramid(quality)
{	
    // n TRIANGLE FAN + n TRIANGLES
    // 6 per Vertex -> vx, vy, vz, nx, ny, nz


	var a = 0, dA = 2*Math.PI/quality;

	// генериране на основата като ветрило
	var data = [0,0,0, 0,0,-1];
	for (var i=0; i<=quality; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),0,0,0,-1);
		a += dA;
	}
	a = 0;
	var nZ = Math.cos(Math.PI/quality); // височина на нормалния вектор
	for (var i=0; i<=quality; i++)
	{ 
		// нормален вектор (няма нужда да е единичен, в щейдъра се нормализира)
		var N = [Math.cos(a+dA/2),Math.sin(a+dA/2),0/*nZ*/];
		data.push(0,0,1,N[0],N[1],nZ);
		data.push(Math.cos(a),Math.sin(a),0,N[0],N[1],0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),0,N[0],N[1],0);
		a += dA;
	}
    return data;
}

function Cone(n){

    // n TRIANGLE FAN + n TRIANGLES
    // 6 per Vertex -> vx, vy, vz, nx, ny, nz


	var a = 0, dA = 2*Math.PI/n;

	// генериране на основата като ветрило
	var data = [0,0,0, 0,0,-1];
	for (var i=0; i<=n; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),0,0,0,-1);
		a += dA;
	}

	// генериране на околните стени
	a = 0;
	for (var i=0; i<=n; i++)
	{ 
		// нормален вектор (няма нужда да е единичен, в щейдъра се нормализира)
		data.push(0,0,1,0,0,1/*N[0],N[1],N[2]*/);
		data.push(Math.cos(a),Math.sin(a),0,Math.cos(a),Math.sin(a),0/*Nz*/);
		a += dA;
		data.push(Math.cos(a),Math.sin(a),0,Math.cos(a),Math.sin(a),0/*Nz*/);
    }
    return data;
}

Prism = function(n)
{	
	// текущ ъгъл и ъглова разлика
	var a = 0, dA = 2*Math.PI/n;

	// генериране на долната основа като ветрило
	var data = [0,0,0, 0,0,-1];
	for (var i=0; i<=n; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),0,0,0,-1);
		a += dA;
	}

	// генериране на горната основа като ветрило
	data.push(0,0,1, 0,0,1);
	for (var i=0; i<=n; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),1,0,0,1);
		a += dA;
	}

	// генериране на околните стени
	a = 0;
	var nZ = Math.cos(Math.PI/n); // височина на нормалния вектор
	for (var i=0; i<=n; i++)
	{ 
		var N = [Math.cos(a+dA/2),Math.sin(a+dA/2)];
		data.push(Math.cos(a),Math.sin(a),1,N[0],N[1],0);
		data.push(Math.cos(a),Math.sin(a),0,N[0],N[1],0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),0,N[0],N[1],0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),1,N[0],N[1],0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),0,N[0],N[1],0);
		data.push(Math.cos(a),Math.sin(a),1,N[0],N[1],0);
		a += dA;
    }
    return data;
}
Cylinder = function(n)
{	
	// текущ ъгъл и ъглова разлика
	var a = 0, dA = 2*Math.PI/n;

	// генериране на долната основа като ветрило
	var data = [0,0,0, 0,0,-1, 0.5,0.5];
	for (var i=0; i<=n; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),0,0,0,-1, 0.5+0.5*Math.cos(a),0.5+0.5*Math.sin(a));
		a += dA;
	}

	// генериране на горната основа като ветрило
	data.push(0,0,1, 0,0,1, 0.5,0.5);
	for (var i=0; i<=n; i++)
	{ 
		data.push(Math.cos(a),Math.sin(a),1,0,0,1, 0.5+0.5*Math.cos(a),0.5+0.5*Math.sin(a));
		a += dA;
	}

	// генериране на околните стени
	a = 0;
	var nZ = Math.cos(Math.PI/n); // височина на нормалния вектор
	for (var i=0; i<=n; i++)
	{ 
		var N = [Math.cos(a),Math.sin(a)]; // нормала към един отвес
		var M = [Math.cos(a+dA),Math.sin(a+dA)]; // нормала към следващия отвес
		data.push(Math.cos(a),Math.sin(a),1,N[0],N[1],0, i/n,1);
		data.push(Math.cos(a),Math.sin(a),0,N[0],N[1],0, i/n,0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),0,M[0],M[1],0, (i+1)/n,0);
		data.push(Math.cos(a+dA),Math.sin(a+dA),1,M[0],M[1],0, (i+1)/n,1);
		data.push(Math.cos(a+dA),Math.sin(a+dA),0,M[0],M[1],0, (i+1)/n,0);
		data.push(Math.cos(a),Math.sin(a),1,N[0],N[1],0, i/n,1);
		a += dA;
	}
    return data;
}
Sphere = function(n)
{	
	n = 2*Math.floor(n/2);
	function dataPush(a,b,s,t)
	{	// координати на точка и нормален вектор, текстурни координати
		data.push(
			Math.cos(a)*Math.cos(b),
			Math.sin(a)*Math.cos(b),
			Math.sin(b),
			s, t );
	}
	
	var data = [];
	
	// генериране на хоризонтални ленти
	var b = -Math.PI/2, dB = 2*Math.PI/n;
	for (var bi=0; bi<n/2; bi++)
	{
		// генериране на една лента
		var a = 0, dA = 2*Math.PI/n;
		for (var ai=0; ai<=n; ai++)
		{
			dataPush(a,b,ai/n,bi/(n/2));
			dataPush(a,b+dB,ai/n,(bi+1)/(n/2));
			a += dA;
		}
		b += dB;
    }
    return data;
}
Icosahedron = function(n)
{	
    var data = [];
    
    // генерира триъгълник, смята нормалния
    // вектор чрез векторно произведение
    function triangle(p1,p2,p3)
    {
        var u = vectorToFrom(p2,p1);
        var v = vectorToFrom(p3,p1);
        var norm = normalize(vectorProduct(u,v));
        data.push( p1[0], p1[1], p1[2], norm[0], norm[1], norm[2] );
        data.push( p2[0], p2[1], p2[2], norm[0], norm[1], norm[2] );
        data.push( p3[0], p3[1], p3[2], norm[0], norm[1], norm[2] );
    }
    
    // златното сечение 1.618...
    var f = (1+Math.sqrt(5))/2;

    // триъгълници - стени на икосаедъра
    triangle([ 0, 1, f], [ 1, f, 0], [-1, f, 0]);	// десен горен
    triangle([ 0, 1,-f], [-1, f, 0], [ 1, f, 0]);	// десен долен
    triangle([ 0,-1, f], [-1,-f, 0], [ 1,-f, 0]);	// ляв горен
    triangle([ 0,-1,-f], [ 1,-f, 0], [-1,-f, 0]);	// ляв долен

    triangle([ 1, f, 0], [ f, 0, 1], [ f, 0,-1]);	// предни и задни
    triangle([ 1,-f, 0], [ f, 0,-1], [ f, 0, 1]);
    triangle([-1, f, 0], [-f, 0,-1], [-f, 0, 1]);
    triangle([-1,-f, 0], [-f, 0, 1], [-f, 0,-1]);

    triangle([ f, 0, 1], [ 0, 1, f], [ 0,-1, f]);	// горни и долни
    triangle([-f, 0, 1], [ 0,-1, f], [ 0, 1, f]);
    triangle([ f, 0,-1], [ 0,-1,-f], [ 0, 1,-f]);
    triangle([-f, 0,-1], [ 0, 1,-f], [ 0,-1,-f]);

    triangle([ 0, 1, f], [ f, 0, 1], [ 1, f, 0]);	// горни ъглови 
    triangle([ 0, 1, f], [-1, f, 0], [-f, 0, 1]);
    triangle([ 0,-1, f], [ 1,-f, 0], [ f, 0, 1]); 
    triangle([ 0,-1, f], [-f, 0, 1], [-1,-f, 0]);
    
    triangle([ 0, 1,-f], [ 1, f, 0], [ f, 0,-1]);	// долни ъглови 
    triangle([ 0, 1,-f], [-f, 0,-1], [-1, f, 0]);
    triangle([ 0,-1,-f], [ f, 0,-1], [ 1,-f, 0]); 
    triangle([ 0,-1,-f], [-1,-f, 0], [-f, 0,-1]);
    return data;
}

RotationalSolid = function(f)
{	
	// пресмята връх от ъгъл и височина
	function vertex(a,z)
	{
		var r = f(z);
		return [r*Math.cos(a),r*Math.sin(a),z];
	}

	// пресмята нормален вектор във връх с ъгъл a и височина z
	function normal(a,z)
	{
		var p = vertex(a,z);
		var u = vectorPoints(vertex(a+0.0001,z),p);
		var v = vectorPoints(vertex(a+0.0001,z+0.0001),p);
		return unitVector(vectorProduct(u,v));
	}
		
	// попълва в буфера връх и нормалният му вектор
	function dataPush(a,z)
	{	
		var p = vertex(a,z);
		var n = normal(a,z);
		data.push(p[0],p[1],p[2],n[0],n[1],n[2]);
	}
	
	var data = [];
	
	// генериране на хоризонтални ленти
	var dZ = 1/ROTATIONAL_LEVELS;
	for (var zi=0; zi<ROTATIONAL_LEVELS; zi++)
	{
		var a = 0, dA = 2*Math.PI/ROTATIONAL_SIDES;

		var z1 = zi*dZ;
		var z2 = (zi+1)*dZ;
		
		for (var ai=0; ai<=ROTATIONAL_SIDES; ai++)
		{
			dataPush(a,z1);
			dataPush(a,z2);
			a += dA;
		}
    }
    return data;
}

Torus = function(center,size,R,r)
{	
	// пресмята връх от два ъгъла
	function vertex(a,b)
	{
		var x = (R+r*Math.cos(b))*Math.cos(a);
		var y = (R+r*Math.cos(b))*Math.sin(a);
		var z = r*Math.sin(b);
		return [x,y,z];
	}

	// пресмята нормален вектор във връх с ъгъл a и височина z
	function normal(a,b)
	{
		var u = [-Math.cos(a)*Math.sin(b),-Math.sin(b)*Math.sin(a),Math.cos(b)];
		var v = [-Math.sin(a),Math.cos(a),0];
		return unitVector(vectorProduct(v,u));
	}
		
	// попълва в буфера връх и нормалният му вектор
	function dataPush(a,b,ai,bi)
	{	
		var p = vertex(a,b);
		var n = normal(a,b);
		data.push(p[0],p[1],p[2],n[0],n[1],n[2],ai,bi);
	}
	
	var data = [];
	
	var dA = 2*Math.PI/TORUS_MAJOR_SIDES;
	var dB = 2*Math.PI/TORUS_MINOR_SIDES;

	// генериране на ленти (по b)
	for (var bi=0; bi<TORUS_MINOR_SIDES; bi++)
	{
		var b1 = bi*dB;
		var b2 = (bi+1)*dB;
		
		// генериране на лента (по a)
		for (var ai=0; ai<=TORUS_MAJOR_SIDES; ai++)
		{
			var a = ai*dA;
			dataPush(a,b1,ai/TORUS_MAJOR_SIDES,bi/TORUS_MINOR_SIDES);
			dataPush(a,b2,ai/TORUS_MAJOR_SIDES,(bi+1)/TORUS_MINOR_SIDES);
		}
    }
    return data;
}