import glMatrix from 'gl-matrix';
import './styles.css' 

const vertexShaderSource = `
  attribute vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
`;

const fragmentShaderSource = `

`;

function main() {
  const canvas = document.querySelector("#webgl-canvas");
  const gl = canvas.getContext("webgl");

  if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
  }

  // Set clear color to black and clear the color buffer
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
  
window.onload = main;