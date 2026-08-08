const ALLOWED_TAGS = new Set(['svg', 'defs', 'lineargradient', 'stop', 'path', 'polyline', 'circle', 'text', 'g'])
const ALLOWED_ATTRIBUTES = new Set(['width', 'height', 'viewbox', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'points', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'offset', 'stop-color', 'stop-opacity', 'font-size', 'font-family', 'text-anchor', 'id', 'xmlns'])

export function sanitizeSvg(svg: unknown): string {
  if (typeof svg !== 'string' || svg.length > 50_000 || typeof DOMParser === 'undefined') return ''

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (document.querySelector('parsererror') || document.documentElement.nodeName.toLowerCase() !== 'svg') return ''

  const elements = [document.documentElement, ...Array.from(document.documentElement.querySelectorAll('*'))]
  elements.forEach((element) => {
    if (!ALLOWED_TAGS.has(element.localName.toLowerCase())) {
      element.remove()
      return
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      const localFragmentUrl = /^url\(#[a-z0-9_.:-]+\)$/.test(value)
      if (!ALLOWED_ATTRIBUTES.has(name) || name.startsWith('on') || value.includes('expression(') || value.startsWith('javascript:') || value.startsWith('data:') || (value.includes('url(') && !localFragmentUrl) || value.startsWith('http:') || value.startsWith('https:')) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return new XMLSerializer().serializeToString(document.documentElement)
}
