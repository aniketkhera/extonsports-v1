// Tiny Markdown → email-safe HTML compiler. We avoid pulling in
// markdown-it (full parser) since our composer only needs the basics
// + image syntax + YouTube auto-link cards. The output is wrapped in
// the master email template at send time, so we only emit *inline-
// styled fragment HTML* here — no <html>, <head>, or <body>.
//
// Supported:
//   # H1, ## H2, ### H3
//   **bold**, *italic*
//   - bullet, - bullet      (unordered list)
//   1. numbered             (ordered list)
//   [text](url)             (link)
//   ![alt](url)             (image — emits a centered <img>)
//   YouTube URL on its own line → renders a thumbnail+link card
//   Plain paragraphs separated by blank lines
//   Horizontal rule via `---`
//
// HTML escaping is done up-front; we then re-introduce known-safe
// inline elements. No raw HTML pass-through — by design — to keep
// email rendering predictable.

const YOUTUBE_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&][^\s]*)?$/i
const VIMEO_RE   = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:\/[\w]+)?(?:\?[^\s]*)?$/i

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Inline-style helpers — email clients ignore most CSS in <style>
// blocks, so all styling has to be inlined per element.
const STYLES = {
  p:      'margin:0 0 18px 0;font-size:16px;line-height:1.65;color:#222;',
  h1:     'margin:32px 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;color:#0D0D0D;line-height:1.2;',
  h2:     'margin:28px 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:21px;font-weight:800;color:#0D0D0D;line-height:1.25;',
  h3:     'margin:24px 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#0D0D0D;line-height:1.3;',
  ul:     'margin:0 0 18px 0;padding:0 0 0 22px;font-size:16px;line-height:1.65;color:#222;',
  ol:     'margin:0 0 18px 0;padding:0 0 0 22px;font-size:16px;line-height:1.65;color:#222;',
  li:     'margin:0 0 6px 0;',
  a:      'color:#F37A4A;text-decoration:underline;',
  hr:     'border:none;border-top:1px solid #E8D5C8;margin:28px 0;',
  imgWrap:'margin:18px 0;text-align:center;',
  img:    'max-width:100%;height:auto;border-radius:8px;display:inline-block;',
  videoCard:    'display:block;margin:18px 0;border:1px solid #E8D5C8;border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;background:#FDF4EE;',
  videoThumb:   'display:block;width:100%;max-width:560px;height:auto;',
  videoCaption: 'padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#666;',
}

// Inline pass: bold, italic, links. Applied after HTML escaping.
function renderInline(text: string): string {
  let out = escapeHtml(text)
  // Links: [label](url) — accept http(s) or mailto only, ignore javascript:.
  out = out.replace(/\[([^\]]+)\]\(((?:https?:|mailto:)[^)\s]+)\)/g, (_m, label, url) =>
    `<a href="${url}" style="${STYLES.a}" target="_blank" rel="noopener">${label}</a>`
  )
  // Bold (greedy enough to handle ** at end of phrase).
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic — same caveat. We use single-* AFTER double-* is consumed.
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  return out
}

function youtubeCard(videoId: string, originalUrl: string): string {
  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  const watch = `https://www.youtube.com/watch?v=${videoId}`
  return [
    `<a href="${watch}" target="_blank" rel="noopener" style="${STYLES.videoCard}">`,
    `<img src="${thumb}" alt="Watch on YouTube" style="${STYLES.videoThumb}" />`,
    `<div style="${STYLES.videoCaption}">▶  Watch on YouTube</div>`,
    `</a>`,
    `<!-- ${escapeHtml(originalUrl)} -->`,
  ].join('')
}

function vimeoCard(videoId: string, originalUrl: string): string {
  const watch = `https://vimeo.com/${videoId}`
  return [
    `<a href="${watch}" target="_blank" rel="noopener" style="${STYLES.videoCard}">`,
    `<div style="${STYLES.videoCaption}">▶  Watch on Vimeo — ${watch}</div>`,
    `</a>`,
    `<!-- ${escapeHtml(originalUrl)} -->`,
  ].join('')
}

// Block-level dispatcher. Greedy line scanner.
export function markdownToEmailHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Blank line — skip.
    if (!trimmed) { i++; continue }

    // Horizontal rule.
    if (/^---+$/.test(trimmed)) {
      out.push(`<hr style="${STYLES.hr}" />`)
      i++; continue
    }

    // Heading.
    let m: RegExpMatchArray | null
    if ((m = trimmed.match(/^(#{1,3})\s+(.+)$/))) {
      const level = m[1].length
      const tag = `h${level}` as 'h1' | 'h2' | 'h3'
      out.push(`<${tag} style="${STYLES[tag]}">${renderInline(m[2])}</${tag}>`)
      i++; continue
    }

    // Image alone on a line: ![alt](url)
    if ((m = trimmed.match(/^!\[([^\]]*)\]\((https?:[^)\s]+)\)$/))) {
      const alt = escapeHtml(m[1])
      const src = m[2]
      out.push(`<div style="${STYLES.imgWrap}"><img src="${src}" alt="${alt}" style="${STYLES.img}" /></div>`)
      i++; continue
    }

    // Standalone video URL → card.
    if ((m = trimmed.match(YOUTUBE_RE))) {
      out.push(youtubeCard(m[1], trimmed))
      i++; continue
    }
    if ((m = trimmed.match(VIMEO_RE))) {
      out.push(vimeoCard(m[1], trimmed))
      i++; continue
    }

    // Unordered list.
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li style="${STYLES.li}">${renderInline(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ul style="${STYLES.ul}">${items.join('')}</ul>`)
      continue
    }

    // Ordered list.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li style="${STYLES.li}">${renderInline(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ol style="${STYLES.ol}">${items.join('')}</ol>`)
      continue
    }

    // Default: paragraph. Greedy until blank line / next block.
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|---+$|[-*]\s|\d+\.\s|!\[)/.test(lines[i].trim())) {
      // Bail on standalone video URLs too.
      if (YOUTUBE_RE.test(lines[i].trim()) || VIMEO_RE.test(lines[i].trim())) break
      para.push(lines[i])
      i++
    }
    out.push(`<p style="${STYLES.p}">${renderInline(para.join(' ').trim())}</p>`)
  }

  return out.join('\n')
}
