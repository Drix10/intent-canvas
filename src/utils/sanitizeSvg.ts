const UNSAFE_TAGS = ['script', 'iframe', 'object', 'embed', 'style', 'foreignObject', 'image', 'use', 'a', 'link']

export function sanitizeSvg(svg: unknown): string {
  if (typeof svg !== 'string' || typeof DOMParser === 'undefined') return ''

  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (document.querySelector('parsererror') || document.documentElement.nodeName.toLowerCase() !== 'svg') return ''

  UNSAFE_TAGS.forEach((tag) => document.querySelectorAll(tag).forEach((node) => node.remove()))
  document.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || ['href', 'xlink:href', 'src', 'style'].includes(name) || value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return new XMLSerializer().serializeToString(document.documentElement)
}
