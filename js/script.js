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
    throw Error('Vertex shader compilation failed');
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fs_source);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fs));
    throw Error('Fragment shader compilation failed');
  }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw Error('Linking failed');
  }

  const uniforms = {};
  for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i += 1) {
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

function updatePosition(deltaTime, speed = 1.0) {
  const d = speed * deltaTime;
  if (window.pressedKeys.has('q')) window.position[2] -= d;
  if (window.pressedKeys.has('e')) window.position[2] += d;
  if (window.pressedKeys.has('a')) window.position[0] -= d;
  if (window.pressedKeys.has('d')) window.position[0] += d;
  if (window.pressedKeys.has('w')) window.position[1] += d;
  if (window.pressedKeys.has('s')) window.position[1] -= d;
}

/** Draw one frame */
function draw(seconds) {
  gl.useProgram(program);

  gl.uniformMatrix4fv(program.uniforms.p, false, p);

  const v = m4view([3, 2, 7], [0, 0, 0], [0, 1, 0]);

  gl.bindVertexArray(octa.vao);
  const octahedronRadius = 0.15;
  const octahedronModelMatrix = m4mul(m4trans(...window.position), m4scale(octahedronRadius, octahedronRadius, octahedronRadius));
  gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v, octahedronModelMatrix));
  gl.drawElements(octa.mode, octa.count, octa.type, 0);
}

function tick(milliseconds) {
  const deltaTime = window.previousTime === null ? 0 : (milliseconds - window.previousTime) / 1000;
  window.previousTime = milliseconds;
  updatePosition(deltaTime);
  draw(milliseconds / 1000);
  requestAnimationFrame(tick);
}

/** Resizes the canvas to completely fill the screen */
function fillScreen() {
  let canvas = document.querySelector('canvas');
  document.body.style.margin = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  canvas.style.width = '';
  canvas.style.height = '';
  if (window.gl) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    clearCanvas();
    window.p = m4perspNegZ(0.1, 100, Math.PI / 2, canvas.width, canvas.height);
    window.position = [0, 0, 0];
  }
}

/** Compile, link, set up geometry */
window.addEventListener('load', async (event) => {
  window.gl = document.querySelector('canvas').getContext(
    'webgl2',
    // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
    { antialias: false, depth: true, preserveDrawingBuffer: true },
  );
  const vs = await fetch('glsl/vs.glsl').then((res) => res.text());
  const fs = await fetch('glsl/fs.glsl').then((res) => res.text());
  window.program = compileShader(vs, fs);
  gl.enable(gl.DEPTH_TEST);
  window.tetra = setupGeomery(tetrahedron);
  window.octa = setupGeomery(octahedron);
  fillScreen();
  window.addEventListener('resize', fillScreen);
  window.pressedKeys = new Set();
  window.addEventListener('keydown', (event) => pressedKeys.add(event.key.toLowerCase()));
  window.addEventListener('keyup', (event) => pressedKeys.delete(event.key.toLowerCase()));
  window.previousTime = null;
  requestAnimationFrame(tick);
});
