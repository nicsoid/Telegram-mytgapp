/**
 * Extract video dimensions (width and height) from MP4 file buffer
 * Parses the MP4 atom structure to find the tkhd (track header) atom
 * MP4 structure: ftyp -> moov -> trak -> tkhd
 */
function parseAtom(buffer: Buffer, offset: number, maxOffset: number): { width: number; height: number } | null {
  while (offset < maxOffset - 8) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    
    if (size === 0 || size === 1) {
      // Extended size (64-bit) - skip for now
      break
    }
    
    if (size > maxOffset - offset || size < 8) {
      break
    }
    
    const atomEnd = offset + size
    
    // Look for tkhd atom (track header) - this contains width and height
    if (type === 'tkhd') {
      try {
        // tkhd atom structure:
        // 4 bytes: size
        // 4 bytes: type ('tkhd')
        // 1 byte: version
        // 3 bytes: flags
        // 8 bytes: creation time (if version 1) or 4 bytes (if version 0)
        // 8 bytes: modification time (if version 1) or 4 bytes (if version 0)
        // 4 bytes: track ID
        // 4 bytes: reserved
        // 8 bytes: duration (if version 1) or 4 bytes (if version 0)
        // 8 bytes: reserved
        // 2 bytes: layer
        // 2 bytes: alternate group
        // 2 bytes: volume
        // 2 bytes: reserved
        // 36 bytes: matrix
        // 4 bytes: width (fixed point 16.16)
        // 4 bytes: height (fixed point 16.16)
        
        const version = buffer.readUInt8(offset + 8)
        const timeSize = version === 1 ? 8 : 4
        const durationSize = version === 1 ? 8 : 4
        
        // Calculate offset to width/height
        const headerSize = 8 + 1 + 3 + timeSize + timeSize + 4 + 4 + durationSize + 8 + 2 + 2 + 2 + 2 + 36
        const widthOffset = offset + headerSize
        const heightOffset = offset + headerSize + 4
        
        if (widthOffset + 4 <= atomEnd && heightOffset + 4 <= atomEnd) {
          // Width and height are stored as fixed-point 16.16 numbers
          const widthFixed = buffer.readUInt32BE(widthOffset)
          const heightFixed = buffer.readUInt32BE(heightOffset)
          
          // Convert from fixed-point to integer
          const width = Math.round(widthFixed / 65536)
          const height = Math.round(heightFixed / 65536)
          
          if (width > 0 && height > 0 && width < 10000 && height < 10000) {
            return { width, height }
          }
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    // Recursively search inside container atoms (moov, trak, etc.)
    if (type === 'moov' || type === 'trak' || type === 'mdia' || type === 'minf' || type === 'stbl') {
      const result = parseAtom(buffer, offset + 8, atomEnd)
      if (result) {
        return result
      }
    }
    
    // Move to next atom
    offset = atomEnd
  }
  
  return null
}

export function getVideoDimensions(videoBuffer: Buffer): { width: number; height: number } | null {
  try {
    return parseAtom(videoBuffer, 0, videoBuffer.length)
  } catch (error) {
    console.error('[getVideoDimensions] Error parsing video dimensions:', error)
    return null
  }
}

