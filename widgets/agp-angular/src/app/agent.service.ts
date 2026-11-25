import { DestroyRef, Injectable, computed, inject, signal } from "@angular/core";
import { parseSSE } from "../../../../shared/sse";
import { applyEvent, failTurn, finishTurn, historyOf, updateDraft, type Draft, type Turn } from "./agent-state";

/** Identifiant aléatoire propre à l'onglet : ton agenda de démo n'est visible que par toi. */
function sessionId(): string {
  const key = "agp-agent-session";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const message = (err: unknown) => (err instanceof Error ? err.message : "Erreur inconnue");

/**
 * Le dialogue avec l'agent : envoie la demande, lit les étapes en streaming (SSE)
 * et tient l'état à jour dans des signaux. Une instance par composant <agp-assistant>.
 */
@Injectable()
export class AgentService {
  readonly session = sessionId();

  private readonly state = signal<Turn[]>([]);
  readonly turns = this.state.asReadonly();
  readonly loading = computed(() => this.state().some((t) => t.status === "running"));
  /** Incrémenté quand l'agenda a pu changer : le panneau d'agenda se recharge. */
  readonly agendaVersion = signal(0);

  private nextId = 1;
  private controller: AbortController | null = null;

  constructor() {
    // Élément retiré de la page : on coupe la requête en cours (et les appels à Claude côté serveur)
    inject(DestroyRef).onDestroy(() => this.controller?.abort());
  }

  async run(request: string): Promise<void> {
    const previous = historyOf(this.state());
    const userId = this.nextId++;
    const turnId = this.nextId++;
    this.state.update((turns) => [
      ...turns,
      { id: userId, role: "user", text: request, parts: [], status: "done" },
      { id: turnId, role: "assistant", text: "", parts: [], status: "running" },
    ]);

    this.controller = new AbortController();
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: this.session, request, history: previous }),
        signal: this.controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Erreur serveur (${res.status})`);
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseSSE(buffer + value);
        buffer = parsed.rest;
        for (const { event, data } of parsed.events) {
          this.state.update((turns) => applyEvent(turns, turnId, event, data));
        }
      }
      this.state.update((turns) => finishTurn(turns, turnId));
    } catch (err) {
      if (this.controller?.signal.aborted) return;
      this.state.update((turns) => failTurn(turns, turnId, message(err)));
    } finally {
      this.controller = null;
    }
    this.agendaVersion.update((v) => v + 1);
  }

  /** Le seul chemin vers la publication : un clic sur le bouton. */
  async publish(draft: Draft): Promise<void> {
    this.state.update((turns) => updateDraft(turns, draft.id, { publishing: true, publishError: undefined }));
    try {
      const res = await fetch("/api/agent/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: this.session, draftId: draft.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `Erreur serveur (${res.status})`);
      this.state.update((turns) => updateDraft(turns, draft.id, { published: true, publishing: false }));
      this.agendaVersion.update((v) => v + 1);
    } catch (err) {
      this.state.update((turns) => updateDraft(turns, draft.id, { publishing: false, publishError: message(err) }));
    }
  }

  reset(): void {
    this.state.set([]);
  }
}
