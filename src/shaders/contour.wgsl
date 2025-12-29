struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@vertex fn vs(
  @builtin(vertex_index) vertexIndex : u32,
) -> VSOutput {
  var pos = array(
    vec2f(-1.0, -1.0),
    vec2f(-1.0,  3.0),
    vec2f( 3.0, -1.0),
  );

  var vsOutput: VSOutput;
  let xy = pos[vertexIndex];
  vsOutput.position = vec4f(xy, 0.0, 1.0);
  vsOutput.texcoord = xy * vec2f(0.5, -0.5) + vec2f(0.5);
  return vsOutput;
}

@group(0) @binding(0) var postTexture2d: texture_2d<f32>;
@group(0) @binding(1) var postSampler: sampler;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  const SHIFT = 0.0005;
  let color = textureSample(postTexture2d, postSampler, fsInput.texcoord);

  let shiftLeft = textureSample(postTexture2d, postSampler, fsInput.texcoord + vec2f(-SHIFT, 0));
  let contourLeft = color - shiftLeft;

  let shiftRight = textureSample(postTexture2d, postSampler, fsInput.texcoord + vec2f(SHIFT, 0));
  let contourRight = color - shiftRight;

  let shiftUp = textureSample(postTexture2d, postSampler, fsInput.texcoord + vec2f(0, SHIFT));
  let contourUp = color - shiftUp;

  let shiftDown = textureSample(postTexture2d, postSampler, fsInput.texcoord + vec2f(0, -SHIFT));
  let contourDown = color - shiftDown;

  let contour = contourLeft + contourRight + contourUp + contourDown;

  if (length(contour) > 0.2) {
    return color / 2.0;
  }
  return color / 6.0;
}
