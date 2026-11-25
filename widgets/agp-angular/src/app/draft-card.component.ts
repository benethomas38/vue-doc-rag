import { Component, input, output } from "@angular/core";
import type { Draft } from "./agent-state";

/** La fiche préparée par l'agent. Seul le bouton « Publier » la publie, jamais le modèle. */
@Component({
  selector: "agp-draft-card",
  template: `
    @let d = draft();
    <article
      class="card"
      [class.card--published]="d.published"
      [class.card--old]="d.superseded"
      [attr.aria-label]="'Fiche : ' + d.titre"
    >
      @if (d.superseded) {
        <p class="badge badge--old">Ancienne version, remplacée plus bas</p>
      } @else {
        <p class="badge" [class.badge--ok]="d.published">
          {{ d.published ? "Publié dans ton agenda de démo" : "Brouillon, pas encore publié" }}
        </p>
      }
      <h3>{{ d.titre }}</h3>

      <dl class="facts">
        <div>
          <dt>Quand</dt>
          <dd>{{ d.jour }}, {{ d.debut }}-{{ d.fin }}</dd>
        </div>
        <div>
          <dt>Où</dt>
          <dd>
            {{ d.spot.nom }}
            <span class="sub">{{ d.spot.rendezVous }}</span>
          </dd>
        </div>
        <div>
          <dt>Places</dt>
          <dd>{{ d.places }}</dd>
        </div>
        <div>
          <dt>Niveau</dt>
          <dd>{{ d.niveau }}</dd>
        </div>
      </dl>

      <p class="desc">{{ d.description }}</p>
      @if (d.planB) {
        <p class="planb"><strong>Plan B :</strong> {{ d.planB }}</p>
      }
      @if (d.publishError) {
        <p class="error" role="alert">{{ d.publishError }}</p>
      }

      @if (!d.published && !d.superseded) {
        <div class="actions">
          <button class="btn btn--primary" [disabled]="!!d.publishing" (click)="publish.emit()">
            {{ d.publishing ? "Publication…" : "Publier" }}
          </button>
          <button class="btn" [disabled]="!!d.publishing" (click)="edit.emit()">Modifier</button>
        </div>
      }
    </article>
  `,
  styleUrl: "./draft-card.component.css",
})
export class DraftCardComponent {
  readonly draft = input.required<Draft>();
  readonly publish = output<void>();
  readonly edit = output<void>();
}
