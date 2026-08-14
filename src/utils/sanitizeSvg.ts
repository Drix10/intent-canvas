const ALLOWED_TAGS = new Set(['svg', 'defs', 'lineargradient', 'stop', 'path', 'polyline', 'circle', 'text', 'g'])
const ALLOWED_ATTRIBUTES = new Set(['width', 'height', 'viewbox', 'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'points', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'offset', 'stop-color', 'stop-opacity', 'font-size', 'font-family', 'text-anchor', 'id', 'xmlns'])
const SAFE_ID = /^[A-Za-z0-9_.:-]{1,80}$/

export function sanitizeSvg(svg: unknown): string {
  if (typeof svg !== 'string' || svg.length > 50_000 || typeof DOMParser === 'undefined') return ''

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (document.querySelector('parsererror') || document.documentElement.nodeName.toLowerCase() !== 'svg') return ''

  const elements = [document.documentElement, ...Array.from(document.documentElement.querySelectorAll('*'))]
  const ids = new Set<string>()
  elements.forEach((element) => {
    if (!ALLOWED_TAGS.has(element.localName.toLowerCase())) {
      element.remove()
      return
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      const localFragmentUrl = /^url\(#[a-z0-9_.:-]+\)$/.test(value)
       if (name === 'id' && SAFE_ID.test(attribute.value)) ids.add(attribute.value)
       if (!ALLOWED_ATTRIBUTES.has(name) || name.startsWith('on') || (name === 'id' && !SAFE_ID.test(attribute.value)) || value.includes('expression(') || value.startsWith('javascript:') || value.startsWith('data:') || (value.includes('url(') && !localFragmentUrl) || value.startsWith('http:') || value.startsWith('https:')) {
         element.removeAttribute(attribute.name)
       }
    })
  })

  elements.forEach((element) => Array.from(element.attributes).forEach((attribute) => {
    const value = attribute.value.trim().toLowerCase()
    const match = /^url\(#([a-z0-9_.:-]+)\)$/.exec(value)
    if (match && !ids.has(match[1])) element.removeAttribute(attribute.name)
  }))

  return new XMLSerializer().serializeToString(document.documentElement)
}
