
struct Camera {
  scale: vec2f,
  offset: vec2f
}

@group(0) @binding(0) var<uniform> camera: Camera;

struct vsOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec2f
};

/**
 * https://webgpufundamentals.org/webgpu/lessons/webgpu-large-triangle-to-cover-clip-space.html
 */
@vertex
fn vs(@builtin(vertex_index) index : u32) -> vsOutput {
  let pos = array(vec2f(-1.0,  3.0), vec2f( 3.0, -1.0), vec2f(-1.0, -1.0));
  return vsOutput(
    vec4f(pos[index], 0.0, 1.0),
    pos[index] * camera.scale + camera.offset
  );
}

@fragment
fn fs(fsInput: vsOutput) -> @location(0) vec4f {
  // Sample gradient noise and normalize from [-1, 1] to [0, 1]
  let noise = (gradient_noise_fbm(fsInput.worldPosition, 5) + 1.0) * 0.5;
  let quantized = quantize(noise, 7);
  return vec4f(quantized, quantized, quantized, 1.0);
}

/**
 * Returns the sum of multiple octaves of gradient noise at the given position.
 * I.e. "Fractal Brownian Motion" (https://thebookofshaders.com/13).
 */
fn gradient_noise_fbm(position: vec2f, octaves: u32) -> f32 {
  const LACUNARITY: f32 = 1.98;
  const GAIN: f32 = 0.51;

  var sum: f32 = 0.0;
  var amp: f32 = 1.0;
  var freq: f32 = 1.0;

  for (var i: u32 = 0u; i < octaves; i++) {
    sum += amp * gradient_noise(position * freq);
    freq *= LACUNARITY;
    amp *= GAIN;
  }

  return sum;
}

/**
 * Returns a gradient noise value in [-1, 1] for the given position.
 */
fn gradient_noise(position: vec2f) -> f32 {

  // Find the bottom left corner of the grid cell
  // TODO: Is this vec2f to vec2u conversion safe?
  let gridPosition = vec2u(floor(position));

  // Sample random gradients at each corner of the cell
  let g0 = gradient(gridPosition);
  let g1 = gradient(gridPosition + vec2u(1, 0));
  let g2 = gradient(gridPosition + vec2u(0, 1));
  let g3 = gradient(gridPosition + vec2u(1, 1));

  // Each each corner's influence is determined by the alignment of its gradient
  // with the vector from that corner to the position being sampled
  let f = fract(position);
  let d0 = dot(g0, f);
  let d1 = dot(g1, f - vec2f(1.0, 0.0));
  let d2 = dot(g2, f - vec2f(0.0, 1.0));
  let d3 = dot(g3, f - vec2f(1.0, 1.0));

  // Interpolate between the four values
  let u = fade(f.x);
  let v = fade(f.y);
  return mix(mix(d0, d1, u), mix(d2, d3, u), v);
}

/**
 * Samples the quintic interpolation curve 6t^5 - 15t^4 + 10t^3.
 */
fn fade(t: f32) -> f32 {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

/**
 * Returns a pseudorandom 2D unit vector for the given position.
 */
fn gradient(position: vec2u) -> vec2f {
  const TAU = 6.283185307179586;
  let angle = random_2d(position) * TAU;
  return vec2f(cos(angle), sin(angle));
}

/**
 * Returns a pseudorandom float in [0, 1] for the given position.
 */
fn random_2d(position: vec2u) -> f32 {
  return random(f32(position.x) * random(f32(position.y)));
}

/**
 * Returns a pseudorandom float in [0, 1] for the given seed.
 */
fn random(x: f32) -> f32 {
  return fract(sin(x) * 43758.5453123);
}

fn quantize(x: f32, steps: f32) -> f32 {
  return floor(x * steps) / steps;
}
