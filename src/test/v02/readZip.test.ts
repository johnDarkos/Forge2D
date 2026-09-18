import { Buffer } from 'node:buffer'
import { expect, test } from 'vitest'
import { readZip } from './readZip'

// Independent fixtures produced by Python zipfile, not by the application or the reader.
const archives = [
  'UEsDBBQAAAAAAAAAIVx5UngoFAAAABQAAAANAAAAZnJhbWVfMDAxLnBuZ2tub3duIFBORyB0ZXN0IGJ5dGVzUEsBAhQDFAAAAAAAAAAhXHlSeCgUAAAAFAAAAA0AAAAAAAAAAAAAAIABAAAAAGZyYW1lXzAwMS5wbmdQSwUGAAAAAAEAAQA7AAAAPwAAAAAA',
  'UEsDBBQAAAAIAAAAIVx5UngoFAAAABQAAAANAAAAZnJhbWVfMDAxLnBuZ8vOyy/PUwjwc1coSS0uUUiqBFIAUEsBAhQDFAAAAAgAAAAhXHlSeCgUAAAAFAAAAA0AAAAAAAAAAAAAAIABAAAAAGZyYW1lXzAwMS5wbmdQSwUGAAAAAAEAAQA7AAAAPwAAAAAA',
]

test.each(archives)('ZIP test reader decodes STORE/DEFLATE with CRC validation: %#', (encoded) => {
  const entries = readZip(Buffer.from(encoded, 'base64'))
  expect([...entries.keys()]).toEqual(['frame_001.png'])
  expect(new TextDecoder().decode(entries.get('frame_001.png'))).toBe('known PNG test bytes')
})

test('ZIP test reader rejects corrupted contents', () => {
  const data = Buffer.from(archives[0], 'base64')
  data[43] ^= 1
  expect(() => readZip(data)).toThrow(/CRC/)
})
