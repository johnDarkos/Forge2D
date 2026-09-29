import { RenderValidationError } from './RenderValidationError'

export interface TextureAsset {
  readonly id: string
  readonly name: string
  readonly uri: string
  readonly width: number
  readonly height: number
}

export interface TextureAssetInput {
  readonly id: string
  readonly name: string
  readonly uri: string
  readonly width: number
  readonly height: number
}

export interface TextureRegion {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

function text(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim())
    throw new RenderValidationError('invalid-texture', `${field} must be a non-empty string`)
  return value
}

function size(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || (value as number) <= 0)
    throw new RenderValidationError('invalid-texture', `${field} must be a positive safe integer`)
  return value as number
}

export function createTextureAsset(input: TextureAssetInput): TextureAsset {
  return Object.freeze({
    id: text(input.id, 'Texture id'),
    name: text(input.name, 'Texture name'),
    uri: text(input.uri, 'Texture URI'),
    width: size(input.width, 'Texture width'),
    height: size(input.height, 'Texture height'),
  })
}

export function createTextureRegion(input: TextureRegion, texture: TextureAsset): TextureRegion {
  const values = [input.x, input.y, input.width, input.height]
  if (
    !values.every(Number.isSafeInteger) ||
    input.x < 0 ||
    input.y < 0 ||
    input.width <= 0 ||
    input.height <= 0
  )
    throw new RenderValidationError(
      'invalid-region',
      'Texture region must use non-negative integer coordinates and positive integer size',
    )
  if (input.x + input.width > texture.width || input.y + input.height > texture.height)
    throw new RenderValidationError('invalid-region', 'Texture region exceeds texture bounds')
  return Object.freeze({ x: input.x, y: input.y, width: input.width, height: input.height })
}
