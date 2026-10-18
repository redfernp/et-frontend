import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';

const builderClass = /^(?:fl-|tve[_-]|thrv_|tcb-)/;
export function hasBuilderMarkup(html = '') {
  return /class=["'][^"']*\b(?:fl-|tve[_-]|thrv_|tcb-)/i.test(html);
}

// One family-level cleanup, with no URL- or article-specific exceptions.
export function cleanupBuilderHtml(html) {
  const document = parseDocument(html);
  function clean(parent) {
    parent.children = (parent.children ?? []).flatMap(node => {
      if (node.children) clean(node);
      if (!node.attribs) return [node];
      delete node.attribs.style;
      const classes = (node.attribs.class ?? '').split(/\s+/);
      const builder = classes.some(name => builderClass.test(name));
      const retained = classes.filter(name => name && !builderClass.test(name));
      if (retained.length) node.attribs.class = retained.join(' ');
      else delete node.attribs.class;
      // Preserve anchor IDs and ACF slot markers even on builder wrappers.
      if (builder && ['div', 'span'].includes(node.name) && !node.attribs.id &&
          !Object.keys(node.attribs).some(key => key.startsWith('data-everytip-'))) {
        for (const child of node.children ?? []) child.parent = parent;
        return node.children ?? [];
      }
      return [node];
    });
  }
  clean(document);
  return sanitizeHtml(render(document), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'picture', 'source'],
    allowedAttributes: {
      '*': ['id', 'class', 'aria-label', 'data-everytip-*', 'data-layout', 'data-heading'],
      a: ['href', 'rel', 'target', 'title'],
      img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
      source: ['srcset', 'sizes', 'type', 'media'],
      th: ['scope', 'colspan', 'rowspan'], td: ['colspan', 'rowspan'],
    },
  });
}

export function launchHtml(html, sourceEndpoint) {
  html = html ?? '';
  const doc = parseDocument(hasBuilderMarkup(html) ? cleanupBuilderHtml(html) : html);
  const sourceHost = new URL(sourceEndpoint).hostname;
  function visit(node) {
    // Sitewide rule: affiliate links are rel="nofollow" only, never "sponsored".
    if (node.name === 'a' && node.attribs?.rel) node.attribs.rel = node.attribs.rel.split(/\s+/).filter((value) => value && value !== 'sponsored').join(' ') || 'nofollow';
    if (node.name === 'a' && node.attribs?.href) {
      try {
        const url = new URL(node.attribs.href, 'https://www.everytip.co.uk');
        if ([sourceHost, 'www.everytip.co.uk', 'everytip.co.uk'].includes(url.hostname)) {
          // Keep /go/ on the existing site until its redirect inventory is migrated.
          if (url.pathname.startsWith('/go/')) {
            node.attribs.href = `https://www.everytip.co.uk${url.pathname}${url.search}${url.hash}`;
            node.attribs.rel = [...new Set([...(node.attribs.rel ?? '').split(/\s+/).filter(Boolean), 'nofollow'])].join(' ');
          } else node.attribs.href = `${url.pathname}${url.search}${url.hash}`;
        }
      } catch { /* Preserve unparseable editorial links for the link audit. */ }
    }
    for (const child of node.children ?? []) visit(child);
  }
  visit(doc);
  return render(doc);
}
