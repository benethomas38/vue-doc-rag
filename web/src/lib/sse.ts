export interface SSEEvent {
  event: string;
  data: unknown;
}

/**
 * Découpe un flux Server-Sent Events en événements.
 * Les morceaux reçus du réseau peuvent couper un événement en deux :
 * la partie incomplète est renvoyée dans `rest` pour être complétée au prochain morceau.
 */
export function parseSSE(buffer: string): { events: SSEEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: SSEEvent[] = [];

  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length) events.push({ event, data: JSON.parse(data.join("\n")) });
  }

  return { events, rest };
}
