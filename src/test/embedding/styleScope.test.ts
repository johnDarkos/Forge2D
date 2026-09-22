// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

/** Селекторы всех правил, кроме at-rule вроде `@media`. */
function selectors(css: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...withoutComments.matchAll(/([^{}]+)\{/g)]
    .map(([, prelude]) => prelude.trim())
    .filter((prelude) => !prelude.startsWith('@'))
    .flatMap((prelude) => prelude.split(',').map((selector) => selector.trim()))
}

test('every Sprite Editor rule is scoped to the editor root', () => {
  const unscoped = selectors(read('widgets/sprite-editor/ui/SpriteEditor.css')).filter(
    (selector) => !/^\.sprite-editor(?=$|[\s:])/.test(selector),
  )
  expect(unscoped).toEqual([])
})

test('standalone shell styles only the document, not editor markup', () => {
  expect(new Set(selectors(read('index.css')))).toEqual(new Set([':root', 'body']))
})
