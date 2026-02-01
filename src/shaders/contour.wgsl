struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec2f,
  @location(1) textureCoordinate: vec2f,
};

struct Camera {
  scale: vec2f,
  offset: vec2f
}

@group(0) @binding(0) var noiseTexture: texture_2d<f32>;
@group(0) @binding(1) var noiseSampler: sampler;
@group(0) @binding(2) var<uniform> camera: Camera;

@vertex fn vs(@builtin(vertex_index) index : u32) -> VSOutput {

  // https://webgpufundamentals.org/webgpu/lessons/webgpu-large-triangle-to-cover-clip-space.html
  let pos = array(vec2f(-1.0, -1.0), vec2f(-1.0,  3.0), vec2f( 3.0, -1.0));

  return VSOutput(
    vec4f(pos[index], 0.0, 1.0), // Clip space position
    clipToWorld(pos[index]), // World space position
    clipToTexture(pos[index]) // Noise texture coordinate
  );
}

@fragment fn fs2d(fsInput: VSOutput) -> @location(0) vec4f {
  let noise = textureSample(noiseTexture, noiseSampler, fsInput.textureCoordinate);
  let color = thresholdAndQuantizeForContour(noise.x);

  let contourLine = onContourLine(color, fsInput.textureCoordinate);
  let shadowFactor = getShadowFactor(vec3f(fsInput.worldPosition, noise.x));
  
  let baseColor = getBaseColor(noise, color, contourLine);

  // Mix the baseColor with a darkened version based on the shadow factor
  // shadowFactor 1.0 = fully lit, 0.0 = fully shadowed
  return mix(baseColor * 0.5, baseColor, shadowFactor);
}

fn getBaseColor(noise: vec4f, color: vec4f, contourLine: bool) -> vec4f {
   if (contourLine) {
     return solarized(0.4);
   }

   if (length(color) < 1.0001) {
     return solarized(0.4) * noise;
   }

   return solarized(color.x + 0.5) / 3;;
}


fn getShadowFactor(p_0: vec3f) -> f32 {

  // The direction of the light source
  const light = vec3f(1, -1, -0.7);

  // Number of times to sample for occlusions between worldPosition and the light source
  const numSamples = 20;

  // Higher = harder shadows, Lower = softer
  const softness = 2;

  // The most distant point that could occlude p_0, assuming the max terrain height is z=1
  // I.e. the intersection between the plane z=1 and a line defined by the p_0 and the light direction
  let p_1 = vec3f(
    p_0.x + ((light.x * (1 - p_0.z)) / light.z),
    p_0.y + ((light.y * (1 - p_0.z)) / light.z),
    1
  );

  // Vector from the current point towards the light source along which to march
  let v_01 = p_1 - p_0;
  let v_01_norm = normalize(v_01);
  let step = length(v_01) / numSamples;

  var shadowFactor = 1.0;
  for (var i = 1u; i < numSamples; i++) {
    let dist = step * f32(i);

    // Point on the light ray
    let p_ray = p_0 + v_01_norm * dist;

    // Terrain height under the point on the light ray
    let height = textureSampleLevel(noiseTexture, noiseSampler, worldToTexture(p_ray.xy), 0.0).x;

    // Hard occlusion
    if (height > p_ray.z) {
      return 0.0;
    }

    // Soft shadow - terrain close to the ray creates partial shadows
    shadowFactor = min(shadowFactor, softness * (p_ray.z - height) / dist);
  }

  return clamp(shadowFactor, 0.0, 1.0);
}

// TODO: should depend on the screen's width / height ratio
fn onContourLine(color: vec4f, textureCoordinate: vec2f) -> bool {
  const SHIFT = 0.0005;
  const OFFSETS = array(
   vec2f(0, -1), // N
   vec2f(0, 1),  // S
   vec2f(1, 0),  // E
   vec2f(-1, 0), // W
  );

  var colorChanged = false;
  for (var i = 0u; i < 4; i++) {
    let adjacentNoise = textureSample(noiseTexture, noiseSampler, textureCoordinate + OFFSETS[i] * SHIFT);
    let adjacentColor = thresholdAndQuantizeForContour(adjacentNoise.x);

    // No early return to avoid avoid textureSample in non-uniform control flow
    colorChanged = colorChanged || (length(color) != length(adjacentColor));
  }

  return colorChanged;
}

fn solarized(t: f32) -> vec4f {
  const SOLARIZED_BASE_2 = vec3f(0.933, 0.910, 0.835); // CSS var(--solarized-base-2)
  return t * vec4f(SOLARIZED_BASE_2, 1);
}

fn thresholdAndQuantizeForContour(x: f32) -> vec4f {
  const WATER_LEVEL = 0.2;
  let thresholded = threshold(x, WATER_LEVEL, WATER_LEVEL) - WATER_LEVEL;
  let normalized = thresholded / (1 - WATER_LEVEL);
  let quantized = quantize(normalized, 15);
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

fn clipToWorld(clipPos: vec2f) -> vec2f {
  return clipPos * camera.scale + camera.offset;
}

fn worldToClip(worldPos: vec2f) -> vec2f {
  return (worldPos - camera.offset) / camera.scale;
}

fn clipToTexture(clipPos: vec2f) -> vec2f {
  return clipPos * vec2f(0.5, -0.5) + vec2f(0.5);
}

fn worldToTexture(worldPos: vec2f) -> vec2f {
  return clipToTexture(worldToClip(worldPos));
}
