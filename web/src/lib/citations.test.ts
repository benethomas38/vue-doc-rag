import { describe, it, expect } from "vitest";
import { linkCitations } from "./citations";

const sources = [
  { n: 1, title: "Computed > Caching", url: "https://vuejs.org/guide/essentials/computed" },
  { n: 2, title: "Reactivity", url: "https://vuejs.org/guide/essentials/reactivity-fundamentals" },
];

describe("linkCitations", () => {
  it("remplace [n] par un lien vers la source", () => {
    const html = linkCitations("<p>Mis en cache [1][2].</p>", sources);
    expect(html).toContain('href="https://vuejs.org/guide/essentials/computed"');
    expect(html).toContain(">1</a><a");
    expect(html).not.toContain("[1]");
  });

  it("laisse intactes les citations sans source connue", () => {
    expect(linkCitations("<p>Voir [7].</p>", sources)).toBe("<p>Voir [7].</p>");
  });

  it("ne touche pas aux index de tableau dans le code", () => {
    const html = "<p>Exemple [1] :</p><pre><code>items[1]</code></pre><p><code>a[2]</code></p>";
    const out = linkCitations(html, sources);
    expect(out).toContain("<pre><code>items[1]</code></pre>");
    expect(out).toContain("<code>a[2]</code>");
    expect(out).toContain('class="cite"');
  });

  it("échappe les guillemets dans le titre", () => {
    const out = linkCitations("<p>[1]</p>", [{ n: 1, title: 'Le "piège"', url: "https://x" }]);
    expect(out).toContain('title="Le &quot;piège&quot;"');
  });
});
