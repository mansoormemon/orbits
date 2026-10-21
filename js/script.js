/**
 * Given the source code of a vertex and fragment shader, compiles them,
 * and returns the linked program.
 */
function compileShader(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vs_source);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs));
        throw Error("Vertex shader compilation failed");
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fs_source);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs));
        throw Error("Fragment shader compilation failed");
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        throw Error("Linking failed");
    }

    const uniforms = {};
    for (
        let i = 0;
        i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        i += 1
    ) {
        let info = gl.getActiveUniform(program, i);
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    program.uniforms = uniforms;

    return program;
}

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 *
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc     the layout location of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 *
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const f32 = new Float32Array(data.flat());
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode);

    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);

    return buf;
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 *
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  [ a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 0
 *  , a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 1
 *  , ...
 *  ]
 * }
 * ````
 *
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */
function setupGeomery(geom) {
    var triangleArray = gl.createVertexArray();
    gl.bindVertexArray(triangleArray);

    for (let i = 0; i < geom.attributes.length; i += 1) {
        let data = geom.attributes[i];
        supplyDataBuffer(data, i);
    }

    var indices = new Uint16Array(geom.triangles.flat());
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray,
    };
}

var tetrahedron = {
    triangles: [
        [0, 1, 2],
        [0, 2, 3],
        [0, 3, 1],
        [1, 2, 3],
    ],
    attributes: [
        [
            [1, 1, 1],
            [-1, -1, 1],
            [-1, 1, -1],
            [1, -1, -1],
        ],
        [
            [1, 1, 1],
            [0, 0, 1],
            [0, 1, 0],
            [1, 0, 0],
        ],
    ],
};

var octahedron = {
    triangles: [
        [0, 1, 2],
        [0, 2, 3],
        [0, 3, 4],
        [0, 4, 1],
        [5, 1, 4],
        [5, 4, 3],
        [5, 3, 2],
        [5, 2, 1],
    ],
    attributes: [
        [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [0, -1, 0],
            [0, 0, -1],
            [-1, 0, 0],
        ],
        [
            [1, 0.5, 0.5],
            [0.5, 1, 0.5],
            [0.5, 0.5, 1],
            [0.5, 0, 0.5],
            [0.5, 0.5, 0],
            [0, 0.5, 0.5],
        ],
    ],
};

function clearCanvas() {
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

/** Draw one frame */
function draw(seconds) {
    const TAU = 2 * Math.PI;
    const DEGREES_TO_RADIANS = Math.PI / 180;

    const orbitAngle = (speed) => seconds * speed * TAU;
    const toRadians = (degrees) => degrees * DEGREES_TO_RADIANS;

    clearCanvas();

    gl.useProgram(program);

    gl.uniformMatrix4fv(program.uniforms.p, false, p);

    let v = m4view([0, 0, 8], [0, 0, 0], [0, 1, 0]);
    v = m4view([0, 1, 5], [0, 0, 0], [0, 1, 0]);
    // v = m4view([0, 8, 0], [0, 0, 0], [0, 0, -1]);

    gl.bindVertexArray(octa.vao);

    const sunRadius = 1.0;
    const sunRotationRate = 0.5;
    const sunRotationAngle = orbitAngle(sunRotationRate);
    const sunModelMatrix = m4mul(
        m4rotY(sunRotationAngle),
        m4scale(sunRadius, sunRadius, sunRadius),
    );
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, sunModelMatrix));
    gl.drawElements(octa.mode, octa.count, octa.type, 0);

    const earthOrbitRadius = 2.25;
    const earthOrbitRate = 0.2;
    const earthOrbitAngle = orbitAngle(earthOrbitRate);
    const earthAxialTilt = toRadians(23);
    const earthOrbitMatrix = m4mul(
        m4rotY(earthOrbitAngle),
        m4trans(earthOrbitRadius, 0, 0),
        m4rotZ(earthAxialTilt),
    );
    const earthRadius = sunRadius * 0.4;
    const earthRotationRate = 2.2;
    const earthRotationAngle = orbitAngle(earthRotationRate);
    const earthModelMatrix = m4mul(
        earthOrbitMatrix,
        m4rotY(earthRotationAngle),
        m4scale(earthRadius, earthRadius, earthRadius),
    );
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, earthModelMatrix));
    gl.drawElements(octa.mode, octa.count, octa.type, 0);

    const marsOrbitRadius = earthOrbitRadius * 1.6;
    const marsOrbitAngle = earthOrbitAngle / 1.9;
    const marsAxialTilt = toRadians(25);
    const marsOrbitMatrix = m4mul(
        m4rotY(marsOrbitAngle),
        m4trans(marsOrbitRadius, 0, 0),
        m4rotZ(marsAxialTilt),
    );
    const marsRadius = earthRadius * 0.8;
    const marsRotationAngle = earthRotationAngle / 2.2;
    const marsModelMatrix = m4mul(
        marsOrbitMatrix,
        m4rotY(marsRotationAngle),
        m4scale(marsRadius, marsRadius, marsRadius),
    );
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, marsModelMatrix));
    gl.drawElements(octa.mode, octa.count, octa.type, 0);

    gl.bindVertexArray(tetra.vao);

    const moonRadius = earthRadius * 0.25;
    const moonOrbitRadius = 0.75;
    const moonOrbitRate = 1.5;
    const moonOrbitAngle = orbitAngle(moonOrbitRate);
    const moonModelMatrix = m4mul(
        earthOrbitMatrix,
        m4rotY(moonOrbitAngle),
        m4trans(moonOrbitRadius, 0, 0),
        m4scale(moonRadius, moonRadius, moonRadius),
    );
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, moonModelMatrix));
    gl.drawElements(tetra.mode, tetra.count, tetra.type, 0);

    const phobosRadius = marsRadius * 0.3;
    const phobosOrbitRadius = 0.5;
    const phobosOrbitRate = 3;
    const phobosOrbitAngle = orbitAngle(phobosOrbitRate);
    let phobosModelMatrix = m4mul(
        marsOrbitMatrix,
        m4rotY(phobosOrbitAngle),
        m4trans(phobosOrbitRadius, 0, 0),
        m4scale(phobosRadius, phobosRadius, phobosRadius),
    );
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, phobosModelMatrix));
    gl.drawElements(tetra.mode, tetra.count, tetra.type, 0);

    const deimosRadius = phobosRadius * 0.5;
    const deimosOrbitRadius = phobosOrbitRadius * 2;
    const deimosOrbitRate = 1.2;
    const deimosOrbit = orbitAngle(deimosOrbitRate);
    let deimosModelMatrix = m4mul(
        marsOrbitMatrix,
        m4rotY(deimosOrbit),
        m4trans(deimosOrbitRadius, 0, 0),
        m4scale(deimosRadius, deimosRadius, deimosRadius),
    );
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, deimosModelMatrix));
    gl.drawElements(tetra.mode, tetra.count, tetra.type, 0);
}

/** Compute any time-varying or animated aspects of the scene */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    draw(seconds);
    requestAnimationFrame(tick);
}

/** Resizes the canvas to completely fill the screen */
function fillScreen() {
    let canvas = document.querySelector("canvas");
    document.body.style.margin = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    canvas.style.width = "";
    canvas.style.height = "";
    if (window.gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        window.p = m4perspNegZ(0.1, 100, Math.PI / 2, canvas.width, canvas.height);
    }
}

/** Compile, link, set up geometry */
window.addEventListener("load", async (event) => {
    window.gl = document.querySelector("canvas").getContext(
        "webgl2",
        // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        { antialias: false, depth: true, preserveDrawingBuffer: true },
    );
    const vs = await fetch("glsl/vs.glsl").then((res) => res.text());
    const fs = await fetch("glsl/fs.glsl").then((res) => res.text());
    window.program = compileShader(vs, fs);
    gl.enable(gl.DEPTH_TEST);
    window.tetra = setupGeomery(tetrahedron);
    window.octa = setupGeomery(octahedron);
    fillScreen();
    window.addEventListener("resize", fillScreen);
    requestAnimationFrame(tick);
});
