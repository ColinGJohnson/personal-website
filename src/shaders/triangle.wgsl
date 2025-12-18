
struct OurVertexShaderOutput {
  @builtin(position) position: vec4f,
};

@vertex
fn vs(
  @builtin(vertex_index) vertexIndex : u32
) -> OurVertexShaderOutput {
  let pos = array(
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0, -1.0),
  );

  var vsOutput: OurVertexShaderOutput;
  vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  return vsOutput;
}

@fragment
fn fs(
  fsInput: OurVertexShaderOutput
) -> @location(0) vec4f {
  let hv = vec2f(floor(fsInput.position.xy % 2));
  return vec4f(1, 0, 1, 1) * hv.x + vec4f(0, 1, 0, 1) * hv.y;
}
