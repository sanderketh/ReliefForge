// src/lib/stl-generator.ts
// Converts image brightness data into a valid binary STL file (3D heightmap mesh)

export interface STLOptions {
  resolution: 'low' | 'medium' | 'high'
  heightScale: number  // 0.5 to 5.0
  inverted: boolean
}

const RESOLUTION_SIZES = {
  low:    { width: 50,  height: 50  },
  medium: { width: 100, height: 100 },
  high:   { width: 200, height: 200 },
}

/**
 * Write a 32-bit float to a DataView at offset (little-endian)
 */
function writeFloat32(view: DataView, offset: number, value: number): void {
  view.setFloat32(offset, value, true)
}

/**
 * Write a 16-bit unsigned int to a DataView at offset (little-endian)
 */
function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

/**
 * Write a 32-bit unsigned int to a DataView at offset (little-endian)
 */
function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true)
}

/**
 * Write a 3D vector (3 floats) to DataView
 */
function writeVec3(view: DataView, offset: number, x: number, y: number, z: number): number {
  writeFloat32(view, offset,     x)
  writeFloat32(view, offset + 4, y)
  writeFloat32(view, offset + 8, z)
  return offset + 12
}

/**
 * Calculate face normal from 3 vertices
 */
function calcNormal(
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number]
): [number, number, number] {
  const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2]
  const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2]
  const nx = ay * bz - az * by
  const ny = az * bx - ax * bz
  const nz = ax * by - ay * bx
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
  return [nx / len, ny / len, nz / len]
}

/**
 * Write one triangle to the STL buffer
 * Binary STL triangle = 12 bytes normal + 3×12 bytes vertices + 2 bytes attribute
 * Total: 50 bytes per triangle
 */
function writeTriangle(
  view: DataView,
  offset: number,
  v0: [number, number, number],
  v1: [number, number, number],
  v2: [number, number, number]
): number {
  const normal = calcNormal(v0, v1, v2)
  offset = writeVec3(view, offset, normal[0], normal[1], normal[2])
  offset = writeVec3(view, offset, v0[0], v0[1], v0[2])
  offset = writeVec3(view, offset, v1[0], v1[1], v1[2])
  offset = writeVec3(view, offset, v2[0], v2[1], v2[2])
  writeUint16(view, offset, 0)   // attribute byte count
  return offset + 2
}

/**
 * Main function: converts grayscale pixel grid into binary STL buffer
 * 
 * The mesh consists of:
 * - Top surface: heightmap triangles
 * - Bottom flat base
 * - 4 side walls connecting top edge to bottom
 */
export function generateSTLBuffer(
  grayscalePixels: Float32Array,  // values 0.0–1.0, row-major
  gridWidth: number,
  gridHeight: number,
  options: STLOptions
): Buffer {
  const { heightScale, inverted } = options

  // Scale model to reasonable mm dimensions
  const cellSize = 1.0         // mm per cell
  const baseThickness = 2.0    // mm for solid base
  const maxHeight = heightScale * 10  // max mm height above base

  // Build height grid (same size as pixel grid)
  const heights: number[][] = []
  for (let row = 0; row < gridHeight; row++) {
    heights[row] = []
    for (let col = 0; col < gridWidth; col++) {
      let brightness = grayscalePixels[row * gridWidth + col]
      if (inverted) brightness = 1.0 - brightness
      heights[row][col] = baseThickness + brightness * maxHeight
    }
  }

  // Count triangles:
  // Top surface: (gridWidth-1) * (gridHeight-1) quads * 2 triangles each
  // Bottom:      (gridWidth-1) * (gridHeight-1) * 2
  // 4 sides:
  //   left/right: (gridHeight-1) * 2 * 2
  //   top/bottom: (gridWidth-1)  * 2 * 2
  const topTris    = (gridWidth - 1) * (gridHeight - 1) * 2
  const bottomTris = (gridWidth - 1) * (gridHeight - 1) * 2
  const sideTrisLR = (gridHeight - 1) * 4
  const sideTrisTB = (gridWidth  - 1) * 4
  const totalTris  = topTris + bottomTris + sideTrisLR + sideTrisTB

  // Binary STL: 80 byte header + 4 byte triangle count + 50 bytes per triangle
  const bufferSize = 80 + 4 + totalTris * 50
  const buffer = Buffer.alloc(bufferSize, 0)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // Header: ASCII text, 80 bytes
  const header = 'ReliefForge STL - generated heightmap'
  for (let i = 0; i < Math.min(header.length, 80); i++) {
    buffer[i] = header.charCodeAt(i)
  }

  // Triangle count
  writeUint32(view, 80, totalTris)

  let offset = 84

  // Helper: get world position of grid vertex
  const pos = (col: number, row: number, z: number): [number, number, number] => [
    col * cellSize,
    row * cellSize,
    z,
  ]

  // ---- TOP SURFACE ----
  for (let row = 0; row < gridHeight - 1; row++) {
    for (let col = 0; col < gridWidth - 1; col++) {
      const z00 = heights[row][col]
      const z10 = heights[row][col + 1]
      const z01 = heights[row + 1][col]
      const z11 = heights[row + 1][col + 1]

      const v00 = pos(col,     row,     z00)
      const v10 = pos(col + 1, row,     z10)
      const v01 = pos(col,     row + 1, z01)
      const v11 = pos(col + 1, row + 1, z11)

      // Triangle 1: v00, v10, v01
      offset = writeTriangle(view, offset, v00, v10, v01)
      // Triangle 2: v10, v11, v01
      offset = writeTriangle(view, offset, v10, v11, v01)
    }
  }

  // ---- BOTTOM FLAT BASE (z=0) ----
  for (let row = 0; row < gridHeight - 1; row++) {
    for (let col = 0; col < gridWidth - 1; col++) {
      const b00 = pos(col,     row,     0)
      const b10 = pos(col + 1, row,     0)
      const b01 = pos(col,     row + 1, 0)
      const b11 = pos(col + 1, row + 1, 0)

      // Reversed winding for bottom face (normal points down)
      offset = writeTriangle(view, offset, b00, b01, b10)
      offset = writeTriangle(view, offset, b10, b01, b11)
    }
  }

  // ---- LEFT WALL (col=0) ----
  for (let row = 0; row < gridHeight - 1; row++) {
    const topA = pos(0, row,     heights[row][0])
    const topB = pos(0, row + 1, heights[row + 1][0])
    const botA = pos(0, row,     0)
    const botB = pos(0, row + 1, 0)
    offset = writeTriangle(view, offset, botA, topA, botB)
    offset = writeTriangle(view, offset, topA, topB, botB)
  }

  // ---- RIGHT WALL (col=gridWidth-1) ----
  for (let row = 0; row < gridHeight - 1; row++) {
    const c = gridWidth - 1
    const topA = pos(c, row,     heights[row][c])
    const topB = pos(c, row + 1, heights[row + 1][c])
    const botA = pos(c, row,     0)
    const botB = pos(c, row + 1, 0)
    offset = writeTriangle(view, offset, botA, botB, topA)
    offset = writeTriangle(view, offset, topA, botB, topB)
  }

  // ---- FRONT WALL (row=0) ----
  for (let col = 0; col < gridWidth - 1; col++) {
    const topA = pos(col,     0, heights[0][col])
    const topB = pos(col + 1, 0, heights[0][col + 1])
    const botA = pos(col,     0, 0)
    const botB = pos(col + 1, 0, 0)
    offset = writeTriangle(view, offset, botA, botB, topA)
    offset = writeTriangle(view, offset, topA, botB, topB)
  }

  // ---- BACK WALL (row=gridHeight-1) ----
  for (let col = 0; col < gridWidth - 1; col++) {
    const r = gridHeight - 1
    const topA = pos(col,     r, heights[r][col])
    const topB = pos(col + 1, r, heights[r][col + 1])
    const botA = pos(col,     r, 0)
    const botB = pos(col + 1, r, 0)
    offset = writeTriangle(view, offset, botA, topA, botB)
    offset = writeTriangle(view, offset, topA, topB, botB)
  }

  return buffer
}

/**
 * Resample a grayscale pixel array to a new width/height using nearest-neighbor
 */
export function resampleGrayscale(
  pixels: Float32Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const result = new Float32Array(dstWidth * dstHeight)
  for (let row = 0; row < dstHeight; row++) {
    for (let col = 0; col < dstWidth; col++) {
      const srcCol = Math.floor((col / dstWidth)  * srcWidth)
      const srcRow = Math.floor((row / dstHeight) * srcHeight)
      result[row * dstWidth + col] = pixels[srcRow * srcWidth + srcCol]
    }
  }
  return result
}

export { RESOLUTION_SIZES }
