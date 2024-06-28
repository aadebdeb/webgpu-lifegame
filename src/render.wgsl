override numCells: u32 = 512;

@group(0) @binding(0) var<storage, read> states: array<u32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f
}

@vertex
fn vs(@location(0) position: vec2f, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
  let cellSize = 2.0 / f32(numCells);
  let vertexPos = position * cellSize * 0.5;

  let x = instanceIndex % numCells;
  let y = instanceIndex / numCells;
  let cellPos = vec2f(-1, -1) + vec2f(f32(x) + 0.5, f32(y) + 0.5) * cellSize;

  var output: VertexOutput;
  output.position = vec4f(vertexPos + cellPos, 0, 1);
  output.color = select(vec3f(0, 0, 0), vec3f(1, 1, 1), states[instanceIndex] == 1);
  return output;
}

@fragment
fn fs(vo: VertexOutput) -> @location(0) vec4f {
  return vec4f(vo.color.x, vo.color.x, vo.color.x, 1);
}