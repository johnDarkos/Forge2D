/** URL остаётся действительным до следующей задачи браузера после клика. */
export async function downloadBlob(blob: Blob, name: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  try {
    anchor.href = url
    anchor.download = name
    document.body.append(anchor)
    anchor.click()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}
