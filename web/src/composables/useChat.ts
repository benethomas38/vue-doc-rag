import { computed, ref } from "vue";
import { parseSSE } from "../../../shared/sse";
import type { Source } from "../lib/citations";

export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  status: "streaming" | "done" | "error";
  allSources: Source[]; // passages envoyés à Claude (pour rendre les [n] cliquables)
  sources: Source[];    // sources réellement citées (affichées sous la réponse)
  error?: string;
}

let nextId = 1;

export function useChat() {
  const messages = ref<Message[]>([]);
  const loading = computed(() => messages.value.some((m) => m.status === "streaming"));

  function add(role: Message["role"], text: string, status: Message["status"]): Message {
    messages.value.push({ id: nextId++, role, text, status, allSources: [], sources: [] });
    // On renvoie l'élément du tableau réactif : le modifier met l'affichage à jour
    return messages.value[messages.value.length - 1];
  }

  async function ask(question: string) {
    add("user", question, "done");
    const msg = add("assistant", "", "streaming");

    try {
      const res = await fetch("/api/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Erreur serveur (${res.status})`);
      }

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      let finished = false; // le serveur termine toujours par "done" : sans lui, la réponse a été coupée
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseSSE(buffer + value);
        buffer = parsed.rest;

        for (const { event, data } of parsed.events) {
          const d = data as { text?: string; sources?: Source[]; message?: string };
          if (event === "sources") msg.allSources = d.sources ?? [];
          else if (event === "delta") msg.text += d.text ?? "";
          else if (event === "done") {
            msg.sources = d.sources ?? [];
            finished = true;
          } else if (event === "error") throw new Error(d.message);
        }
      }
      if (!finished) throw new Error("La connexion a été coupée avant la fin de la réponse. Réessaie dans un instant.");
      msg.status = "done";
    } catch (err) {
      msg.status = "error";
      msg.error = err instanceof Error ? err.message : "Erreur inconnue";
    }
  }

  function reset() {
    messages.value = [];
  }

  return { messages, loading, ask, reset };
}
