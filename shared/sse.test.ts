import { describe, it, expect } from "vitest";
import { parseSSE } from "./sse";

describe("parseSSE", () => {
  it("lit plusieurs événements complets", () => {
    const { events, rest } = parseSSE(
      'event: delta\ndata: {"text":"Bon"}\n\nevent: delta\ndata: {"text":"jour"}\n\n',
    );
    expect(events).toEqual([
      { event: "delta", data: { text: "Bon" } },
      { event: "delta", data: { text: "jour" } },
    ]);
    expect(rest).toBe("");
  });

  it("garde un événement coupé en deux pour le morceau suivant", () => {
    const first = parseSSE('event: delta\ndata: {"text":"A"}\n\nevent: delta\ndata: {"te');
    expect(first.events).toHaveLength(1);
    expect(first.rest).toBe('event: delta\ndata: {"te');

    const second = parseSSE(first.rest + 'xt":"B"}\n\n');
    expect(second.events).toEqual([{ event: "delta", data: { text: "B" } }]);
  });

  it("accepte les fins de ligne Windows", () => {
    const { events } = parseSSE('event: done\r\ndata: {"sources":[]}\r\n\r\n');
    expect(events).toEqual([{ event: "done", data: { sources: [] } }]);
  });
});
