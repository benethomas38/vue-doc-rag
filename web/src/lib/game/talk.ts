/**
 * Côté client des dialogues : envoie la réplique du joueur et lit la réponse du PNJ
 * en streaming (Server-Sent Events), avec le même parseur que le chat du RAG.
 */
import { parseSSE } from "../sse";
import type { GameSummary, NpcAction } from "./engine";
import type { NpcId } from "./data/world";
import type { ItemDef } from "./data/items";

/** Une ligne du dialogue affichée à l'écran. */
export interface DialogLine {
  id: number;
  who: "hero" | "npc" | "system";
  text: string;
  streaming?: boolean;
}

/** Lignes de la boutique de Grizzle. */
export interface ShopRow {
  index: number;
  def: ItemDef;
  price: number;
  sold: boolean;
}

export interface SellRow {
  index: number;
  def: ItemDef;
  price: number;
}

export interface TalkHistoryItem {
  role: "user" | "assistant";
  text: string;
}

export interface TalkRequest {
  npc: NpcId;
  message: string;
  history: TalkHistoryItem[];
  game: GameSummary;
  mood: Record<string, unknown>;
}

export interface TalkHandlers {
  onDelta: (text: string) => void;
  onAction: (action: NpcAction) => void;
  signal?: AbortSignal;
}

export async function streamTalk(body: TalkRequest, handlers: TalkHandlers): Promise<void> {
  const res = await fetch("/api/game/talk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: handlers.signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Erreur serveur (${res.status})`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseSSE(buffer + value);
    buffer = parsed.rest;
    for (const { event, data } of parsed.events) {
      const d = data as { text?: string; action?: NpcAction; message?: string };
      if (event === "delta" && d.text) handlers.onDelta(d.text);
      else if (event === "action" && d.action) handlers.onAction(d.action);
      else if (event === "error") throw new Error(d.message ?? "Erreur du PNJ");
    }
  }
}

/** L'énigme de la Sphinge : seule la question voyage, la réponse reste sur le serveur. */
export async function fetchRiddle(index: number): Promise<string> {
  const res = await fetch(`/api/game/riddle/${index}`);
  if (!res.ok) throw new Error("Énigme indisponible");
  const data = (await res.json()) as { question: string };
  return data.question;
}
