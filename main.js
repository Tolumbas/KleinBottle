const picasso = document.querySelector("#picasso");
let gl, prog, vars,shadowprog,shadowvars;
let shape = "KleinBottle";

gl = getContext(picasso);

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA,gl.SRC_ONE_MINUS_ALPHA);
gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LESS);

onload = async function(){ 
    document.querySelector("#loading").remove();

    //това е програмата за шейдваните фигури
    shadowprog = await getProgram("vertexShaderShadow.glsl","fragmentShaderShadow.glsl").catch(e=>console.error(e));
    shadowvars = getVariables();
    //това е програмата за полупрозрачните точки
    prog = await getProgram("vertexShader.glsl","fragmentShader.glsl").catch(e=>console.error(e));
    vars = getVariables();

    //за жалост getVariables не взима uniform arrays
    zipWith((pr,use)=>{
        use.set("rotation",gl.getUniformLocation(pr,"rotation"));
        use.set("viewMatrix4d",gl.getUniformLocation(pr,"viewMatrix4d"));
        use.set("prespMatrix4d",gl.getUniformLocation(pr,"prespMatrix4d"));
    },[prog,shadowprog],[vars,shadowvars]);

    
    requestAnimationFrame(drawFrame);
}

function changeShape(str){
    shape = str;
}

const zip = (xs,ys)=>zipWith((a,b)=>[a,b],xs,ys); // Обичам фунцкионалното <3


function generate4dSphere(center,radius){
    let out = [];
    function gen(center,radius,a,b,c){
        const step1 = matXvec(translateMatrix4d([0,0,radius,0]),center); //премествам точка на произволно място на сферата
        const step2 = matXvec(rotXZ(a),step1); // ротирам я така че да бъде на уникално място спрямо трите ъгли
        const step3 = matXvec(rotXY(b),step2); // релаизация на матриците можеш да видиш в WebGLlib.js
        const step4 = matXvec(rotYU(c),step3);
        return step4.slice(0,4);
    }

    for (var a=0;a<TAU;a+=TAU/60)
        for(var b=0;b<TAU;b+=TAU/60)
            for(var c=0;c<TAU;c+=TAU/60)
                out.push(gen(center,radius,a,b,c));
    return out;
}

function generateTourusPoints(){
    //клайновата бутилка е като торус, само където има завъртане в четвъртото измерение
    //Оставих тази функционалност за да се види как програмата ми визуализира три измерни обекти
    //Освен това за да се види начина ми на генериране на обекти. Аз съм много горд от него :3
    const rad = 1;
    let data = [];
    
    const center = [0,0,0,0,1];
    
    function getPoint(alpha,beta){
        const step1 = matXvec(translateMatrix4d([.7,0,0,0]),center); // премествам точката върху XY окръжността
        const step2 = matXvec(rotXY(beta),step1); 
        const step3 = matXvec(translateMatrix4d([rad,0,0,0]),step2); // премествам точката върху торуса
        const step4 = matXvec(rotXZ(alpha),step3);
        return step4.slice(0,4);
    }
    
    const stepa = TAU/100,stepb = TAU/50;
    for (let a = 0; a<TAU;a+=stepa){
        for (var b=0;b<=TAU;b+=stepb){
            
            data = [...data, ...getPoint(a,b)];
        }
    }
    return data;
}

function generateKleinBottle(){
    const rad = 1;
    let data = [];
    
    const center = [0,0,0,0,1];
    
    function getPoint(alpha,beta){
        const step1 = matXvec(translateMatrix4d([.7,0,0,0]),center);
        const step2 = matXvec(rotXY(beta),step1);
        const step3 = matXvec(rotXU(alpha/2),step2); //Това е единствената разлика от торуса. Завъртам с 180 градуса.
        const step4 = matXvec(translateMatrix4d([rad,0,0,0]),step3);
        const step5 = matXvec(rotXZ(alpha),step4);
        const final = step5;
        return final.slice(0,4);
    }
    
    const stepa = TAU/100,stepb = TAU/50;
    for (let a = 0; a<TAU;a+=stepa){
        for (var b=0;b<=TAU;b+=stepb){
            
            data = [...data, ...getPoint(a,b)];
        }
    }
    return data;
}

function generateKleinBottleMesh(){
    const rad = 1;
    let data = [];
    let normals = [];

    const center = [0,0,0,0,1];
    
    function getPoint(alpha,beta){
        const step1 = matXvec(translateMatrix4d([.7,0,0,0]),center);
        const step2 = matXvec(rotXY(beta),step1);
        const step3 = matXvec(rotXU(alpha/2),step2);
        const step4 = matXvec(translateMatrix4d([rad,0,0,0]),step3);
        const step5 = matXvec(rotXZ(alpha),step4);
        const final = step5;
        return final.slice(0,4);
    }
    function getNormal(alpha,beta){
        const step1 = matXvec(translateMatrix4d([0.7,0,0,-0.7]),center);
        const step2 = matXvec(rotXY(beta),step1);
        const step3 = matXvec(rotXU(alpha/2),step2);
        const step4 = matXvec(translateMatrix4d([rad,0,0,0]),step3);
        const step5 = matXvec(rotXZ(alpha),step4);
        const final = step5;
        return final.slice(0,4);
    }
    
    const stepa = TAU/100,stepb = TAU/50;
    for (let a = stepa; a<TAU;a+=stepa){
        for (var b=0;b<=TAU;b+=stepb){
            
            data = [...data, 
                ...getPoint(a,b),...getPoint(a,b+stepb),...getPoint(a+stepa,b),
                ...getPoint(a+stepa,b),...getPoint(a,b+stepb),...getPoint(a+stepa,b+stepb),
            ];
            normals = [...normals, 
                ...getNormal(a,b),...getNormal(a,b+stepb),...getNormal(a+stepa,b),
                ...getNormal(a+stepa,b),...getNormal(a,b+stepb),...getNormal(a+stepa,b+stepb),
            ];
        }
    }
    return [data,normals];
}


function numberToBinArray(n,dim){
    if (dim == 0)return [];
    return [n&1,...numberToBinArray(n>>1,dim-1)];
}

function generateCubeLines(dim){
    //a cube is array of lines, lines are array of points, points are arrays of numbers 
    //идеята е да направя две кубчета и да свържа всеки връх от единия със съответния на другия.
    if (dim == 1)
        return [[[0],[1]]];
    const rec = generateCubeLines(dim-1);
    const prevcube = rec.map(line=>line.map(point=>[...point,0])); // добавям допълнителна координата
    const newcube = rec.map(line=>line.map(point=>[...point,1]));
    
    const points = new Array(2**(dim-1));

    // От лекциите по дискретни структори доказахме че координатите на кубче са 
    // пермутациите с повториения на 0 и 1 за съответното измерение
    // Тук използвам че бинарната репрезентация на числата от 0 до 2^n-1 е точно това което ми трябва.
    for (let a=0;a<points.length;a++)
        points[a] = numberToBinArray(a,dim-1);
    
    const prevpoints = points.map(p=>[...p,0]);
    const newpoints = points.map(p=>[...p,1]);

    const newlines = zip (prevpoints,newpoints); 

    return prevcube.concat(newcube,newlines);
}

function generateCubeTriangles(dim){
    //a cube is array of triangles, triangles are array of points, points are arrays of number
    //тук използвам предната функция за да да свържа всеки ръб със съответния и да генерирам нови стени.
    if (dim == 2)
        return [[[0,0],[1,1],[0,1]],[[0,0],[1,0],[1,1]]];
    
    const rec = generateCubeTriangles(dim - 1);
    const prevcube = rec.map(triangle=>triangle.map(point=>[...point,0]));
    const newcube = rec.map(triangle=>triangle.map(point=>[...point,1]));

    const lines = generateCubeLines(dim - 1);
    const prevlines = lines.map(line=>line.map(point=>[...point,0]));
    const newlines = lines.map(line=>line.map(point=>[...point,1]));
    
    const newtriangles1 = zipWith(([p1b,p1e],[p2b,p2e])=>[p1b,p2e,p1e],prevlines,newlines);
    const newtriangles2 = zipWith(([p1b,p1e],[p2b,p2e])=>[p1b,p2b,p2e],prevlines,newlines);
    return [].concat(prevcube,newcube,newtriangles1,newtriangles2);
}



const kleinBottle = generateKleinBottle();
const kleinBottlebuffer = kleinBottle.toBuffer();

const hypercubelines = generateCubeLines(4);
const hypercubelinesbuffer = hypercubelines.flat(2).toBuffer();

const hypercubetri = generateCubeTriangles(4);
const hypercubetribuffer = hypercubetri.flat(2).toBuffer();
const hypercubetrinormals = hypercubetri.map(tri=>tri.map(point=>point.map(v=>v-0.5))).map(([t1,t2,t3])=>{
    const allsame = vectorProduct4d(t1,t2,t3);
    if (dot(allsame,[0,0,0,0])>=0)
        return allsame.map(e=>-e);
    else
        return allsame;
}).map(e=>[e,e,e]).flat(1);
const hypercubetrinormalsbuffer = hypercubetrinormals.flat(2).toBuffer();

const sphere = generate4dSphere([0,0,0,0,1],1);
const spherebuffer = sphere.flat().toBuffer();

const torus = generateTourusPoints();
const torusbuffer = torus.toBuffer();

const [kleinBottleShaded,kleinBottleShadedNormals] = generateKleinBottleMesh();
const kleinBottleShadedbuffer = kleinBottleShaded.toBuffer();
const kleinBottleShadedNormalsBuffer = kleinBottleShadedNormals.toBuffer();



function drawFrame(){

    let use = vars;


    if (shape == "HyperCubeShaded" || shape ==  "KleinBottleShaded"){
        use = shadowvars;
        changeProgram(shadowprog);
    }
    else{
        changeProgram(prog);
    }

    gl.clearColor(1,1,1,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.uniform3fv(use.get("color"),[0,0,0]);


    //ротационните матрици са аналогични както в 2д и 3д. Реализацията на всички марици е в WebGLlib.js

    // const rotmatrix = rotXY(Date.now()/1000);
    const rotmatrix = mat5xmat5(rotZU(Date.now()/3000),mat5xmat5(rotXU(Date.now()/2000),rotXY(Date.now()/2200)));
    // const rotmatrix =  mat5xmat5(rotYZ(Date.now()/3200),mat5xmat5(rotXZ(Date.now()/2000),rotXY(Date.now()/2200)));


    //за view матрицата идеята е аналогична както в 3д, но се налага и още един вектор който да специфицира къде е назад.
    const vm4d = viewMatrix4d([0,0,-4,-1],[0,0,0,0],[0,1,0,0],[0,0,1,0]);


    //тази перспективна матрица няма нужда да се занимава с aspectRatio или фруструм, 
    //защото оставям тази работа на другата перспективна матрица
    const p4d = perspMatrix4d(Math.PI/2);


    uniformMatrix(use.get("rotation"),rotmatrix);
    uniformMatrix(use.get("viewMatrix4d"),vm4d);
    uniformMatrix(use.get("prespMatrix4d"),p4d);

    uniformMatrix(use.get("viewMatrix"),viewMatrix([0,0,-4],[0,0,0],[0,1,0]));
    uniformMatrix(use.get("projectionMatrix"),perspMatrix(Math.PI/2,picasso.width/picasso.height,.1,1000));
    try{
        switch(shape){
        case "HyperSphere":
            attribArray(use.get("position"),spherebuffer,4);
            gl.drawArrays(gl.POINTS,0, sphere.length);
            break;
        case "HyperCubeLines":
            attribArray(use.get("position"),hypercubelinesbuffer,4);
            gl.drawArrays(gl.LINES,0, hypercubelines.length*2);
            break;
        case "HyperCubeShaded":
            attribArray(use.get("normal"),hypercubetrinormalsbuffer,4);
            attribArray(use.get("position"),hypercubetribuffer,4);
            gl.drawArrays(gl.TRIANGLES,0, hypercubetri.length*3);
            break;
        case '3D Tourus':
            attribArray(use.get("position"),torusbuffer,4);
            gl.drawArrays(gl.POINTS,0, torus.length/4);
            break;
        case 'KleinBottle':
            attribArray(use.get("position"),kleinBottlebuffer,4);
            gl.drawArrays(gl.POINTS,0, kleinBottle.length/4);
            break;
        case 'KleinBottleShaded':
            attribArray(use.get("normal"),kleinBottleShadedNormalsBuffer,4);
            attribArray(use.get("position"),kleinBottleShadedbuffer,4);
            gl.drawArrays(gl.TRIANGLES,0, kleinBottleShaded.length/4);
            break;
        }
    }catch(e){console.log(e);}
    
    requestAnimationFrame(drawFrame);
}


