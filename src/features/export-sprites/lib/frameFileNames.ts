import type { ExportFrameItem } from '../model/types'

/** Плоские имена PNG без перезаписи, в том числе на нечувствительной к регистру ФС. */
export function frameFileNames(frames: readonly ExportFrameItem[]): string[] {
  const used = new Set<string>()
  return frames.map((frame) => {
    const fallback = `frame_${String(frame.displayNumber).padStart(3, '0')}`
    let base =
      Array.from(frame.name ?? fallback, (character) =>
        character.charCodeAt(0) < 32 ? '_' : character,
      )
        .join('')
        .replace(/[\\/:*?"<>|]/g, '_')
        .trim()
        .replace(/\.png$/i, '')
        .replace(/^[. ]+|[. ]+$/g, '')
        .slice(0, 80)
        .replace(/[. ]+$/g, '') || fallback
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base)) base = `_${base}`
    let name = `${base}.png`
    let suffix = 2
    while (used.has(name.toLowerCase())) name = `${base}_${suffix++}.png`
    used.add(name.toLowerCase())
    return name
  })
}
