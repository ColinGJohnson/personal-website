struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
};

@vertex fn vs(@builtin(vertex_index) index : u32) -> VSOutput {

  // https://webgpufundamentals.org/webgpu/lessons/webgpu-large-triangle-to-cover-clip-space.html
  let pos = array(vec2f(-1.0, -1.0), vec2f(-1.0,  3.0), vec2f( 3.0, -1.0));

  return VSOutput(
    vec4f(pos[index], 0.0, 1.0), // Clip space position
    pos[index] * vec2f(0.5, -0.5) + vec2f(0.5) // Noise texture coordinate
  );
}

@group(0) @binding(0) var noiseTexture: texture_2d<f32>;
@group(0) @binding(1) var noiseSampler: sampler;

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let noise = textureSample(noiseTexture, noiseSampler, fsInput.texcoord);
  let color = thresholdAndQuantizeForContour(noise.x);

  if (onContourLine(noiseTexture, noiseSampler, color, fsInput.texcoord)) {
    return solarized(vec4f(0.3));
  }

  if (length(color) < 1.0001) {
    return solarized(vec4f(0.3)) * noise;
  }

  return solarized(color + vec4(0.3)) / 3;
}

// TODO: should depend on the screen's width / height ratio
fn onContourLine(
  texture: texture_2d<f32>, textureSampler: sampler, color: vec4f, texcoord: vec2f,
) -> bool {
  const SHIFT = 0.0005;
  const OFFSETS = array(
   vec2f(0, -1), // N
   vec2f(0, 1),  // S
   vec2f(1, 0),  // E
   vec2f(-1, 0), // W
  );

  var colorChanged = false;
  for (var i = 0u; i < 4; i++) {
    let adjacentNoise = textureSample(texture, textureSampler, texcoord + OFFSETS[i] * SHIFT);
    let adjacentColor = thresholdAndQuantizeForContour(adjacentNoise.x);
    colorChanged = colorChanged || (length(color) != length(adjacentColor));
  }

  return colorChanged;
}

fn solarized(color: vec4f) -> vec4f {
  const SOLARIZED_BASE_2 = vec3f(0.933, 0.910, 0.835); // CSS var(--solarized-base-2)
  return color * vec4f(SOLARIZED_BASE_2, 1);
}

fn thresholdAndQuantizeForContour(x: f32) -> vec4f {
  const WATER_LEVEL = 0.2;
  let thresholded = threshold(x, WATER_LEVEL, WATER_LEVEL) - WATER_LEVEL;
  let normalized = thresholded / (1 - WATER_LEVEL);
  let quantized = quantize(normalized, 12);
  return vec4(quantized, quantized, quantized, 1);
}

/**
 * Returns `replacement` if `x` is less than `threshold`, otherwise `x`.
 */
fn threshold(x: f32, threshold: f32, replacement: f32) -> f32 {
  return select(x, replacement, x < threshold);
}

/**
 * Maps a continuous value x to n evenly distributed discrete values.
 */
fn quantize(x: f32, n: f32) -> f32 {
  return floor(x * n) / n;
}
