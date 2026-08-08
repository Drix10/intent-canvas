const ALLOWED_TAGS = new Set(['svg', 'defs', 'lineargradient', 'stop', 'path', 'polyline', 'circle', 'text', 'g'])

export function sanitizeSvg(svg: unknown): string {
  if (typeof svg !== 'string' || svg.length > 50_000 || typeof DOMParser === 'undefined') return ''

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (document.querySelector('parsererror') || document.documentElement.nodeName.toLowerCase() !== 'svg') return ''

  document.documentElement.querySelectorAll('*').forEach((element) => {
    if (!ALLOWED_TAGS.has(element.localName.toLowerCase())) {
      element.remove()
      return
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || ['href', 'xlink:href', 'src', 'style'].includes(name) || value.startsWith('javascript:') || value.startsWith('data:')) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return new XMLSerializer().serializeToString(document.documentElement)
}
