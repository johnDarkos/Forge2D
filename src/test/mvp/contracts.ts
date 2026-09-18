import type { ComponentType } from 'react'

export type { SpriteFrame as Frame, GenerateFrames } from '@/entities/sprite'
export type { ExportFrame } from '@/features/export-sprites'
import type { GenerateFrames } from '@/entities/sprite'
import type { ExportFrame } from '@/features/export-sprites'

// Lazy discovery keeps typecheck valid before implementation without substituting a fake SUT.
const modules = import.meta.glob([
  '../../entities/sprite/index.ts',
  '../../features/export-sprites/index.ts',
])
const apps = import.meta.glob('../../app/App.tsx')

async function requiredModule(path: string, loaders: Record<string, () => Promise<unknown>>) {
  const load = loaders[path]
  if (!load) throw new Error(`MVP not implemented: ${path}`)
  return (await load()) as Record<string, unknown>
}

export async function getGenerateFrames() {
  const module = await requiredModule('../../entities/sprite/index.ts', modules)
  if (typeof module.generateFrames !== 'function') throw new Error('Export named generateFrames')
  return module.generateFrames as GenerateFrames
}

export async function getExportFrame() {
  const module = await requiredModule('../../features/export-sprites/index.ts', modules)
  if (typeof module.exportFrame !== 'function') throw new Error('Export named exportFrame')
  return module.exportFrame as ExportFrame
}

export async function getApp() {
  const module = await requiredModule('../../app/App.tsx', apps)
  if (typeof module.default !== 'function') throw new Error('Export default App')
  return module.default as ComponentType
}
