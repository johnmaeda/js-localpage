import TurndownService from "turndown";
import { extractReadable } from "./readability.js";
import { cleanDom } from "./cleanup.js";

function createTurndownService(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Preserve form labels and button text
  td.addRule("buttons", {
    filter: ["button"],
    replacement: (_content, node) => {
      const el = node as unknown as HTMLElement;
      return `[${el.textContent?.trim() || "button"}]`;
    },
  });

  td.addRule("labels", {
    filter: ["label"],
    replacement: (content) => {
      return content.trim() ? `**${content.trim()}**: ` : "";
    },
  });

  // Preserve ARIA labels on important elements
  td.addRule("ariaLabels", {
    filter: (node) => {
      const el = node as unknown as HTMLElement;
      return !!(el.getAttribute && el.getAttribute("aria-label") && !el.textContent?.trim());
    },
    replacement: (_content, node) => {
      const el = node as unknown as HTMLElement;
      return `[${el.getAttribute("aria-label")}]`;
    },
  });

  return td;
}

export function htmlToMarkdown(html: string, url: string): string {
  // Try Readability first for best content extraction
  const readable = extractReadable(html, url);
  // Always get cleaned full DOM as baseline
  const fullClean = cleanDom(html, { removeNav: true });

  let sourceHtml: string;
  let title: string;

  if (readable && readable.content.length > 100) {
    // Use Readability only if it captured most of the visible content.
    // If the full cleaned DOM is significantly larger, Readability likely
    // missed sections (common on dashboards, multi-section pages).
    const readableTextLen = readable.textContent.length;
    const fullTextLen = fullClean.replace(/<[^>]+>/g, "").length;

    if (readableTextLen >= fullTextLen * 0.6) {
      sourceHtml = readable.content;
      title = readable.title;
    } else {
      // Readability missed too much content — use full DOM
      sourceHtml = fullClean;
      title = readable.title;
    }
  } else {
    // Fallback to cleaned full DOM
    sourceHtml = fullClean;
    title = "";

    // Try to extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
  }

  const td = createTurndownService();
  let markdown = td.turndown(sourceHtml);

  // Prepend title
  if (title) {
    markdown = `# ${title}\n\n${markdown}`;
  }

  // Clean up excessive whitespace
  markdown = markdown
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return markdown;
}
