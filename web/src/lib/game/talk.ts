/**
 * Côté client des dialogues : envoie la réplique du joueur et lit la réponse du PNJ
 * en streaming (Server-Sent Events), avec le même parseur que le chat du RAG.
 */
import { parseSSE } from "../../../../shared/sse";
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

/** Résultat d'une réplique : `cut` si le serveur signale qu'elle a été coupée en route. */
export interface TalkResult {
  cut: boolean;
}

export async function streamTalk(body: TalkRequest, handlers: TalkHandlers): Promise<TalkResult> {
  let cut = false;
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
      const d = data as { text?: string; action?: NpcAction; message?: string; cut?: boolean };
      if (event === "delta" && d.text) handlers.onDelta(d.text);
      else if (event === "action" && d.action) handlers.onAction(d.action);
      else if (event === "done" && d.cut) cut = true;
      else if (event === "error") throw new Error(d.message ?? "Erreur du PNJ");
    }
  }
  return { cut };
}

/** Ferme proprement une réplique coupée : on retire le mot entamé et on ajoute des points de suspension. */
export function closeCutLine(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed || /[.!?…»*]$/.test(trimmed)) return trimmed;
  const lastSpace = trimmed.lastIndexOf(" ");
  const base = lastSpace > trimmed.length - 15 && lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
  const closed = `${base.replace(/[\s,;:'’-]+$/, "")}…`;
  // Didascalie entamée (« *soupire en… ») : on referme l'astérisque
  return (closed.match(/\*/g)?.length ?? 0) % 2 ? `${closed}*` : closed;
}

/** Découpe une réplique en morceaux de texte et de didascalies (*entre astérisques*), pour les mettre en italique. */
export function splitStageDirections(text: string): { text: string; stage: boolean }[] {
  const parts: { text: string; stage: boolean }[] = [];
  const re = /\*([^*]+)\*?/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), stage: false });
    parts.push({ text: m[1], stage: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), stage: false });
  return parts;
}

/** L'énigme de la Sphinge : seule la question voyage, la réponse reste sur le serveur. */
export async function fetchRiddle(index: number): Promise<string> {
  const res = await fetch(`/api/game/riddle/${index}`);
  if (!res.ok) throw new Error("Énigme indisponible");
  const data = (await res.json()) as { question: string };
  return data.question;
}
