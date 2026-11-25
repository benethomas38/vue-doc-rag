import { Component, ElementRef, afterRenderEffect, inject, signal, viewChild } from "@angular/core";
import { AgentService } from "./agent.service";
import type { Draft } from "./agent-state";
import { AgentStepComponent } from "./agent-step.component";
import { DemoAgendaComponent } from "./demo-agenda.component";
import { DraftCardComponent } from "./draft-card.component";
import { RequestFormComponent } from "./request-form.component";

/**
 * <agp-assistant> : le chat de l'agent et l'agenda de démo.
 * C'est ce composant qu'Angular Elements transforme en Web Component (voir main.ts).
 */
@Component({
  selector: "agp-assistant-root",
  imports: [AgentStepComponent, DraftCardComponent, DemoAgendaComponent, RequestFormComponent],
  providers: [AgentService],
  templateUrl: "./agp-assistant.component.html",
  styleUrl: "./agp-assistant.component.css",
})
export class AgpAssistantComponent {
  protected readonly agent = inject(AgentService);
  protected readonly request = signal("");

  private readonly form = viewChild.required(RequestFormComponent);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>("list");

  protected readonly examples = [
    "Organise un jam samedi à 14 h à la Bastille, 30 places, ouvert aux débutants.",
    "Une initiation pour les 8-12 ans mercredi prochain à 15 h au parc Mistral.",
    "Entraînement en salle jeudi à 19 h pour les confirmés.",
    "Sortie au campus le 12 décembre, de 10 h à midi.",
  ];

  constructor() {
    // Suit l'agent pendant qu'il travaille (dans la fenêtre du chat, pas toute la page)
    afterRenderEffect(() => {
      this.agent.turns();
      const el = this.list().nativeElement;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }

  protected submit(text = this.request()): void {
    const r = text.trim();
    if (!r || this.agent.loading()) return;
    this.request.set("");
    void this.agent.run(r);
  }

  protected edit(draft: Draft): void {
    this.request.set(`Modifie la fiche « ${draft.titre} » : `);
    this.form().focus();
  }

  protected newChat(): void {
    this.agent.reset();
    this.form().focus();
  }
}
