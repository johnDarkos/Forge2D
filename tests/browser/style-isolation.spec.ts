import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { fixture } from './support'

const properties = [
  'box-sizing',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-decoration-line',
  'color',
  'background-color',
  'margin',
  'padding',
  'border',
  'border-radius',
] as const

const computed = (locator: Locator) =>
  locator.evaluate(
    (element, names) =>
      Object.fromEntries(
        names.map((name) => [name, getComputedStyle(element).getPropertyValue(name)]),
      ),
    [...properties],
  )

/** Элементы редактора, которые чаще всего задевают глобальные стили хоста. */
async function editorStyles(page: Page) {
  const editor = page.getByRole('main')
  const tools = editor.getByRole('complementary', { name: 'Editor tools' })
  return {
    root: await computed(editor),
    title: await computed(editor.getByRole('heading', { level: 1 })),
    eyebrow: await computed(editor.getByText('LOCAL SPRITE TOOL', { exact: true })),
    section: await computed(tools.getByRole('heading', { level: 2 }).first()),
    button: await computed(tools.getByRole('button', { name: 'Zoom in', exact: true })),
    number: await computed(tools.getByRole('spinbutton', { name: 'Frame width', exact: true })),
  }
}

test('editor and embedding host do not restyle each other', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Upload sprite sheet').setInputFiles(fixture('player.png'))
  await expect(page.getByText('player.png', { exact: true })).toBeVisible()
  const standalone = await editorStyles(page)

  await page.goto('/tests/fixtures/embedded.html')
  await expect(page.getByText('player.png', { exact: true })).toBeVisible()

  // Хост: его собственные правила применились и не перекрыты стилями редактора.
  const host = page.getByRole('banner', { name: 'Host chrome' })
  await expect(host.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '48px')
  await expect(host.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(128, 0, 128)')
  await expect(host.getByText('Host paragraph')).toHaveCSS('margin-top', '40px')
  await expect(host.getByText('Host paragraph')).toHaveCSS('font-style', 'italic')
  await expect(host.getByLabel('Host search')).toHaveCSS('background-color', 'rgb(0, 128, 0)')
  await expect(host.getByLabel('Host search')).toHaveCSS('box-sizing', 'content-box')
  const hostButton = page.getByRole('button', { name: 'Replace external image' })
  await expect(hostButton).toHaveCSS('background-color', 'rgb(220, 38, 38)')
  await expect(hostButton).toHaveCSS('border-radius', '0px')
  await expect(page.locator('body')).toHaveCSS('font-family', 'Georgia, serif')

  // Редактор: оформление не зависит от конфликтующего host.css.
  expect(await editorStyles(page)).toEqual(standalone)
  expect(standalone.title['font-size']).toBe('26px')
  expect(standalone.button['background-color']).toBe('rgb(48, 59, 83)')
  expect(standalone.root['text-transform']).toBe('none')
})
