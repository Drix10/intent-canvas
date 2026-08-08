import { useEffect, RefObject } from 'react'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function useDialog(ref: RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const previousActiveElement = document.activeElement as HTMLElement | null
    const appContent = document.querySelector<HTMLElement>('[data-app-content]')
    const previousAriaHidden = appContent?.getAttribute('aria-hidden')
    const previousInert = appContent?.inert ?? false
    if (appContent) {
      appContent.setAttribute('aria-hidden', 'true')
      appContent.inert = true
    }
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
    focusables()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusables()
      if (!elements.length) return
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement)
      const nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? elements.length - 1 : currentIndex - 1)
        : (currentIndex + 1) % elements.length
      event.preventDefault()
      elements[nextIndex].focus()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (appContent) {
        if (previousAriaHidden == null) appContent.removeAttribute('aria-hidden')
        else appContent.setAttribute('aria-hidden', previousAriaHidden)
        appContent.inert = previousInert
      }
      previousActiveElement?.focus?.()
    }
  }, [onClose, ref])
}
