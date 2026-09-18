/// <reference types="node" />
import { Buffer } from 'node:buffer'
import { inflateRawSync } from 'node:zlib'

/** Independent test reader for ordinary single-disk ZIP (STORE/DEFLATE), including CRC. */
export function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const data = Buffer.from(bytes)
  let end = data.length - 22
  const lower = Math.max(0, data.length - 65557)
  while (end >= lower && data.readUInt32LE(end) !== 0x06054b50) end--
  if (end < lower) throw new Error('ZIP end record missing')
  const count = data.readUInt16LE(end + 10)
  let cursor = data.readUInt32LE(end + 16)
  const entries = new Map<string, Uint8Array>()
  for (let index = 0; index < count; index++) {
    if (data.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid central directory')
    const method = data.readUInt16LE(cursor + 10)
    const crc = data.readUInt32LE(cursor + 16)
    const compressedSize = data.readUInt32LE(cursor + 20)
    const size = data.readUInt32LE(cursor + 24)
    const nameLength = data.readUInt16LE(cursor + 28)
    const extraLength = data.readUInt16LE(cursor + 30)
    const commentLength = data.readUInt16LE(cursor + 32)
    const offset = data.readUInt32LE(cursor + 42)
    const name = data.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    if (entries.has(name)) throw new Error('Duplicate ZIP entry')
    if (data.readUInt32LE(offset) !== 0x04034b50) throw new Error('Invalid local header')
    const start = offset + 30 + data.readUInt16LE(offset + 26) + data.readUInt16LE(offset + 28)
    const compressed = data.subarray(start, start + compressedSize)
    if (method !== 0 && method !== 8) throw new Error('Unsupported ZIP compression')
    const decoded = method === 0 ? compressed : inflateRawSync(compressed)
    if (decoded.length !== size) throw new Error('Invalid entry size')
    let actualCRC = 0xffffffff
    for (const byte of decoded) {
      actualCRC ^= byte
      for (let bit = 0; bit < 8; bit++)
        actualCRC = (actualCRC >>> 1) ^ (actualCRC & 1 ? 0xedb88320 : 0)
    }
    if ((actualCRC ^ 0xffffffff) >>> 0 !== crc) throw new Error('Invalid ZIP CRC')
    entries.set(name, Uint8Array.from(decoded))
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

export function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}
