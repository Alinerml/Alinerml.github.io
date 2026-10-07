document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); location.href = '/search/'
  }
})
document.addEventListener('click', async event => {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest<HTMLButtonElement>('button[data-copy], button.copy[data-code]')
  if (!button) return
  if (button.matches('.copy[data-code]')) {
    try {
      await navigator.clipboard.writeText(button.dataset.code ?? '')
      button.classList.add('copied')
      button.setAttribute('aria-label', '已复制代码')
      setTimeout(() => {
        button.classList.remove('copied')
        button.setAttribute('aria-label', '复制代码')
      }, Number(button.dataset.copyTimeout) || 2000)
    } catch { button.setAttribute('aria-label', '复制失败，请手动选择代码') }
  } else {
    const original = button.textContent
    try { await navigator.clipboard.writeText(button.dataset.copy ?? ''); button.textContent = '已复制' }
    catch { button.textContent = '请选择文字手动复制' }
    setTimeout(() => { button.textContent = original }, 2400)
  }
})
