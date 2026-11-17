import { marked } from "marked";
import DOMPurify from "dompurify";
import { linkCitations, type Source } from "./citations";

/**
 * Markdown de Claude → HTML sûr à afficher avec v-html.
 * DOMPurify passe en dernier : tout HTML injecté dans la réponse est neutralisé.
 */
export function renderAnswer(text: string, sources: Source[]): string {
  if (!text) return "";
  const html = marked.parse(text, { async: false, gfm: true }) as string;
  return DOMPurify.sanitize(linkCitations(html, sources), { ADD_ATTR: ["target"] });
}
