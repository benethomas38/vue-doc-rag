export interface Source {
  n: number;
  title: string;
  url: string;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Transforme les citations [1], [2]… du HTML en liens vers la doc officielle.
 * Ne touche pas au code : dans `items[1]`, le [1] reste un index de tableau.
 */
export function linkCitations(html: string, sources: Source[]): string {
  const byN = new Map(sources.map((s) => [s.n, s]));

  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/)
    .map((part, i) =>
      i % 2 === 1
        ? part // segment de code : inchangé
        : part.replace(/\[(\d+)\]/g, (match, n: string) => {
            const s = byN.get(Number(n));
            if (!s) return match;
            return `<a class="cite" href="${escapeAttr(s.url)}" title="${escapeAttr(s.title)}" target="_blank" rel="noopener">${n}</a>`;
          }),
    )
    .join("");
}
