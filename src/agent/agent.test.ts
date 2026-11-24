import { describe, it, expect } from "vitest";
import { runAgent, MAX_TURNS, type AgentEvent, type CreateMessage } from "./agent.ts";
import { findSpots } from "./data.ts";
import { createStore } from "./store.ts";
import { runTool, type ToolContext } from "./tools.ts";
import type { Forecast } from "./weather.ts";

const SESSION = "test-session-0000000001";
const TODAY = "2026-11-24";

function context(forecast?: Forecast): ToolContext {
  return {
    sessionId: SESSION,
    today: TODAY,
    store: createStore(),
    forecast: async () =>
      forecast ?? { ok: true, date: "2026-11-28", ciel: "pluie", tempMin: 2, tempMax: 6, risquePluie: 80, ventMax: 20, conseil: "Pluie probable : surfaces glissantes, prévoir un repli en salle." },
  };
}

/** Un faux Claude qui rejoue un scénario écrit à l'avance, tour par tour. */
function scripted(turns: Array<Array<{ text?: string; tool?: [string, unknown] }>>) {
  const seen: unknown[] = [];
  let i = 0;
  const create: CreateMessage = async (params) => {
    seen.push(structuredClone(params.messages));
    const blocks = turns[Math.min(i++, turns.length - 1)];
    const content = blocks.map((b, k) =>
      b.tool
        ? { type: "tool_use" as const, id: `call_${i}_${k}`, name: b.tool[0], input: b.tool[1] }
        : { type: "text" as const, text: b.text!, citations: null },
    );
    return { content, stop_reason: content.some((c) => c.type === "tool_use") ? "tool_use" : "end_turn" } as Awaited<ReturnType<CreateMessage>>;
  };
  return { create, seen };
}

async function collect(gen: AsyncGenerator<AgentEvent>) {
  const events: AgentEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

describe("runAgent", () => {
  it("enchaîne les outils, crée un brouillon et ne publie rien", async () => {
    const ctx = context();
    const { create, seen } = scripted([
      [{ text: "Je regarde ça." }, { tool: ["resoudre_date", { expression: "samedi" }] }, { tool: ["chercher_spot", { recherche: "Bastille" }] }],
      [{ tool: ["verifier_agenda", { date: "2026-11-28" }] }, { tool: ["meteo", { date: "2026-11-28" }] }],
      [{
        tool: ["creer_brouillon", {
          titre: "Jam parkour à la Bastille", date: "2026-11-28", debut: "11:00", fin: "13:00",
          spot_id: "bastille", places: 30, niveau: "tous niveaux", description: "Jam ouverte à tous.", plan_b: "Gymnase",
        }],
      }],
      [{ text: "Brouillon prêt, relis-le puis clique sur Publier." }],
    ]);

    const events = await collect(runAgent({ create, model: "fake", request: "Jam samedi 11h à la Bastille, 30 places", ctx }));
    const steps = events.filter((e) => e.type === "step_end");
    expect(steps).toHaveLength(5);
    expect(steps.every((s) => s.data.ok)).toBe(true);

    const draft = events.find((e) => e.type === "draft");
    expect(draft?.type === "draft" && draft.data.draft.spot.nom).toBe("Fort de la Bastille");
    expect(events.at(-1)).toEqual({ type: "done", data: { turns: 4 } });

    // Le conflit avec la session du samedi 10 h-12 h est remonté au modèle
    const brouillon = steps[4].type === "step_end" ? (steps[4].data.output as { conflits: string[] }) : null;
    expect(brouillon?.conflits[0]).toMatch(/Session extérieure/);

    // Rien n'est publié tant que personne n'a cliqué
    expect(ctx.store.agendaFor(SESSION, "2026-11-28").every((e) => e.source === "recurrent")).toBe(true);

    // Chaque résultat d'outil est bien renvoyé au modèle au tour suivant
    const second = seen[1] as Array<{ role: string; content: unknown }>;
    expect(second.at(-1)?.role).toBe("user");
    expect(JSON.stringify(second.at(-1)?.content)).toContain("tool_result");
  });

  it("renvoie les erreurs d'outil au modèle pour qu'il se corrige", async () => {
    const { create, seen } = scripted([
      [{ tool: ["chercher_spot", { recherche: "la lune" }] }],
      [{ text: "Je ne connais pas ce lieu, lequel veux-tu ?" }],
    ]);
    const events = await collect(runAgent({ create, model: "fake", request: "jam sur la lune", ctx: context() }));
    expect(events.find((e) => e.type === "step_end")?.data).toMatchObject({ ok: false });
    const result = JSON.stringify((seen[1] as unknown[]).at(-1));
    expect(result).toContain('"is_error":true');
    expect(result).toContain("spotsDisponibles");
  });

  it("s'arrête au bout de MAX_TURNS tours", async () => {
    const { create } = scripted([[{ tool: ["resoudre_date", { expression: "demain" }] }]]);
    const events = await collect(runAgent({ create, model: "fake", request: "boucle", ctx: context() }));
    expect(events.filter((e) => e.type === "step_start")).toHaveLength(MAX_TURNS);
    expect(events.at(-1)).toEqual({ type: "done", data: { turns: MAX_TURNS } });
  });
});

describe("outils", () => {
  it("refuse un brouillon incohérent avec toutes les raisons", async () => {
    const r = await runTool("creer_brouillon", { titre: "X", date: "2026-11-01", debut: "25:00", fin: "10:00", spot_id: "mars", places: 9999, niveau: "", description: "ok" }, context());
    expect(r.ok).toBe(false);
    const msg = (r.output as { erreur: string }).erreur;
    for (const part of ["date est passée", "heure de début", "spot_id inconnu", "places", "niveau"]) expect(msg).toContain(part);
  });

  it("publie seulement via le store, une seule fois", async () => {
    const ctx = context();
    const r = await runTool("creer_brouillon", { titre: "Initiation", date: "2026-11-30", debut: "14:00", fin: "16:00", spot_id: "paul-mistral", places: 15, niveau: "débutants", description: "Découverte." }, ctx);
    const id = (r.output as { brouillon: { id: string } }).brouillon.id;
    expect(ctx.store.publish("autre-session-00000001", id)).toEqual({ erreur: "Brouillon introuvable ou expiré." });
    expect(ctx.store.publish(SESSION, id)).toMatchObject({ titre: "Initiation" });
    expect(ctx.store.publish(SESSION, id)).toEqual({ erreur: "Cet événement est déjà publié." });
    expect(ctx.store.agendaFor(SESSION, "2026-11-30").map((e) => e.source)).toEqual(["publie"]);
    expect(ctx.store.agendaFor("autre-session-00000001", "2026-11-30")).toEqual([]);
  });

  it("trouve les spots par mots entiers", () => {
    expect(findSpots("à la Bastille").map((s) => s.id)).toEqual(["bastille"]);
    expect(findSpots("parc Mistral").map((s) => s.id)).toEqual(["paul-mistral"]);
    expect(findSpots("en salle").map((s) => s.id)).toEqual(["salle"]);
    expect(findSpots("surface")).toEqual([]);
  });
});
