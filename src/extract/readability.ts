import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export interface ReadabilityResult {
  title: string;
  content: string; // simplified HTML
  textContent: string;
  excerpt: string;
}

export function extractReadable(html: string, url: string): ReadabilityResult | null {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) return null;

  return {
    title: article.title ?? "",
    content: article.content ?? "",
    textContent: article.textContent ?? "",
    excerpt: article.excerpt ?? "",
  };
}
