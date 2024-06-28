import { plainText as renderShaderCode } from './render.wgsl'
import { plainText as computeShaderCode } from './compute.wgsl'

const numCells = 256
const numAllCells = numCells * numCells

const workgroupSize = [8, 8]

const squareVertices = new Float32Array([
  -1, 1,
  -1, -1,
  1, 1,
  1, -1
])

const squareIndices = new Uint16Array([
  0, 1, 2,
  2, 1, 3
])

const targetFps = 30

async function setup() {
  const canvas = document.querySelector('#canvas') as HTMLCanvasElement
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    throw new Error('WebGPU is not supported')
  }
  const device = await adapter.requestDevice()
  if (!device) {
    throw new Error('WebGPU is not supported')
  }
  const context = canvas.getContext('webgpu')
  if (!context) {
    throw new Error('WebGPU is not supported')
  }

  const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
  context.configure({
    device,
    format: canvasFormat
  })

  const initialStates = new Uint32Array(Array.from({ length: numAllCells }, () => Math.random() > 0.5 ? 1 : 0))
  let computeReadBuffer = device.createBuffer({
    size: initialStates.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })
  device.queue.writeBuffer(computeReadBuffer, 0, initialStates)
  let computeWriteBuffer = device.createBuffer({
    size: initialStates.byteLength,
    usage: GPUBufferUsage.STORAGE
  })
  const computeShaderModule = device.createShaderModule({
    code: computeShaderCode
  })
  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: computeShaderModule,
      entryPoint: 'main',
      constants: {
        'numCells': numCells,
      }
    }
  })

  const renderShaderModule = device.createShaderModule({
    code: renderShaderCode
  })
  const vertexBuffer = device.createBuffer({
    size: squareVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(vertexBuffer, 0, squareVertices)
  const indexBuffer = device.createBuffer({
    size: squareIndices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(indexBuffer, 0, squareIndices)
  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: renderShaderModule,
      entryPoint: 'vs',
      buffers: [{
        attributes: [{
          shaderLocation: 0,
          offset: 0,
          format: 'float32x2'
        }],
        arrayStride: 8
      }],
      constants: {
        'numCells': numCells
      }
    },
    fragment: {
      module: renderShaderModule,
      entryPoint: 'fs',
      targets: [{
        format: canvasFormat
      }]
    }
  })
  const renderBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: computeReadBuffer }
      }
    ]
  })

  const update = () => {
    performance.now()
    const computeCommandEncoder = device.createCommandEncoder()
    const computePassEncoder = computeCommandEncoder.beginComputePass()
    computePassEncoder.setPipeline(computePipeline)
    const computeBindGroup = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        {binding:0, resource: { buffer: computeReadBuffer }},
        {binding:1, resource: { buffer: computeWriteBuffer }}
      ]
    })
    computePassEncoder.setBindGroup(0, computeBindGroup)
    computePassEncoder.dispatchWorkgroups(Math.ceil(numCells  / workgroupSize[0]), Math.ceil(numCells / workgroupSize[1]), 1)
    computePassEncoder.end()
    device.queue.submit([computeCommandEncoder.finish()])
    ;[computeReadBuffer, computeWriteBuffer] = [computeWriteBuffer, computeReadBuffer]

    const encoder = device.createCommandEncoder()
    const renderPassEncoder = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
      }]
    })
    renderPassEncoder.setPipeline(renderPipeline)
    renderPassEncoder.setBindGroup(0, renderBindGroup)
    renderPassEncoder.setVertexBuffer(0, vertexBuffer)
    renderPassEncoder.setIndexBuffer(indexBuffer, 'uint16')
    renderPassEncoder.drawIndexed(squareIndices.length, numAllCells)
    renderPassEncoder.end()
    device.queue.submit([encoder.finish()])
  }

  let updatedAt = performance.now()
  const loop = () => {
    requestAnimationFrame(loop)
    const now = performance.now()
    const elapsedSeconds = (now - updatedAt) / 1000
    if (elapsedSeconds >= 1 / targetFps) {
      update()
      updatedAt = now
    }
  }
  loop()
}

setup()