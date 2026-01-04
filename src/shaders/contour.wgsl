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

@group(0) @binding(0) var noiseTexture: texture_2d<f32>;
@group(0) @binding(1) var noiseSampler: sampler;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let offsets = array(
   vec2f(0, -1), // N
   vec2f(1, -1), // NE
   vec2f(1, 0),  // E
   vec2f(1, 1),  // SE
   vec2f(0, 1),  // S
   vec2f(-1, 1), // SW
   vec2f(-1, 0), // W
   vec2f(-1, -1) // SW
  );

  var onContourLine = false;
  let color = textureSample(noiseTexture, noiseSampler, fsInput.texcoord);

  const SHIFT = 0.0001;
  for (var i = 0u; i < 5; i++) {
    let colorChange = detectColorChange(noiseTexture, noiseSampler, color, fsInput.texcoord, offsets[i] * SHIFT);
    onContourLine = onContourLine || colorChange;
  }

  if (onContourLine) {
    return solarized(vec4f(1) / 3);
  }

  return solarized(color / 3);
}

fn detectColorChange(
  texture: texture_2d<f32>, textureSampler: sampler, color: vec4f, position: vec2f, offset: vec2f
) -> bool {
  let adjacentColor = textureSample(texture, textureSampler, position + offset);
  return length(color) != length(adjacentColor);
}

fn solarized(color: vec4f) -> vec4f {
  // Corresponds to CSS var(--solarized-base-2)
  const SOLARIZED_BASE_2 = vec3f(0.933, 0.910, 0.835);
  return color * vec4f(SOLARIZED_BASE_2, 1);
}
