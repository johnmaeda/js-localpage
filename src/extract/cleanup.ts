import { JSDOM } from "jsdom";

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "[hidden]",
  "[aria-hidden='true']",
  "[style*='display: none']",
  "[style*='display:none']",
  ".cookie-banner",
  ".cookie-consent",
  "#cookie-banner",
  ".ad",
  ".ads",
  ".advertisement",
  "[data-ad]",
  "[data-tracking]",
  "img[width='1']",
  "img[height='1']",
];

const NAV_SELECTORS = [
  "nav",
  "header",
  "footer",
  "[role='navigation']",
  "[role='banner']",
  "[role='contentinfo']",
];

export function cleanDom(html: string, options: { removeNav?: boolean } = {}): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Remove unwanted elements
  for (const selector of REMOVE_SELECTORS) {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    } catch {
      // Skip invalid selectors
    }
  }

  // Optionally remove navigation clutter
  if (options.removeNav) {
    for (const selector of NAV_SELECTORS) {
      try {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch {
        // Skip invalid selectors
      }
    }
  }

  return doc.body?.innerHTML || "";
}
