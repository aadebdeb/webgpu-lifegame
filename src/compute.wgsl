@group(0) @binding(0) var<storage, read> currentStates: array<u32>;
@group(0) @binding(1) var<storage, read_write> nextStates: array<u32>;

override numCells: u32 = 512;

fn calcIndex(center: vec2<i32>, offset: vec2<i32>) -> i32 {
  let iNumCells = i32(numCells);
  var x = center.x + offset.x;
  if (x == -1) {
    x = iNumCells - 1;
  } else if (x == iNumCells) {
    x = 0;
  }
  var y = center.y + offset.y;
  if (y == -1) {
    y = iNumCells - 1;
  } else if (y ==iNumCells) {
    y = 0;
  }
  return x + y * iNumCells;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let stateIndex = gid.x + gid.y * u32(numCells);
  let currentState = currentStates[stateIndex];

  let center = vec2i(gid.xy);
  var aliveNeighbors: u32 = 0;
  aliveNeighbors += currentStates[calcIndex(center, vec2(-1, -1))];
  aliveNeighbors += currentStates[calcIndex(center, vec2(0, -1))];
  aliveNeighbors += currentStates[calcIndex(center, vec2(1, -1))];
  aliveNeighbors += currentStates[calcIndex(center, vec2(-1, 0))];
  aliveNeighbors += currentStates[calcIndex(center, vec2(1, 0))];
  aliveNeighbors += currentStates[calcIndex(center, vec2(-1, 1))];
  aliveNeighbors += currentStates[calcIndex(center, vec2(0, 1))];
  aliveNeighbors += currentStates[calcIndex(center, vec2(1, 1))];

  if ((currentState == 0 && aliveNeighbors == 3) || (currentState == 1 && (aliveNeighbors == 2 || aliveNeighbors == 3))) {
    nextStates[stateIndex] = 1;
  } else {
    nextStates[stateIndex] = 0;
  }
}