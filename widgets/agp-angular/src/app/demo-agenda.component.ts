import { Component, computed, effect, input, signal, untracked } from "@angular/core";
import { shortDate } from "../../../../shared/agentLabels";

interface Entry {
  id: string;
  titre: string;
  date: string;
  debut: string;
  fin: string;
  lieu: string;
  source: "recurrent" | "publie";
}

/** L'agenda de démo du visiteur, rechargé quand l'agent ou le bouton « Publier » a pu le changer. */
@Component({
  selector: "agp-demo-agenda",
  template: `
    <aside class="agenda" aria-labelledby="agenda-title">
      <h3 id="agenda-title">Agenda de démo</h3>
      <p class="note">Fictif et propre à ton navigateur. Ce que tu publies n'apparaît que chez toi.</p>
      @if (error()) {
        <p class="note">{{ error() }}</p>
      }
      <ol class="days">
        @for (day of byDay(); track day.date) {
          <li>
            <p class="day">{{ shortDate(day.date) }}</p>
            <ul>
              @for (e of day.entries; track e.id) {
                <li [class.published]="e.source === 'publie'">
                  <span class="time">{{ e.debut }}</span>
                  <span>
                    {{ e.titre }}
                    <span class="where">{{ e.lieu }}</span>
                  </span>
                </li>
              }
            </ul>
          </li>
        }
      </ol>
    </aside>
  `,
  styleUrl: "./demo-agenda.component.css",
})
export class DemoAgendaComponent {
  readonly session = input.required<string>();
  readonly version = input(0);

  protected readonly entries = signal<Entry[]>([]);
  protected readonly error = signal("");
  protected readonly shortDate = shortDate;

  protected readonly byDay = computed(() => {
    const days = new Map<string, Entry[]>();
    for (const e of this.entries()) days.set(e.date, [...(days.get(e.date) ?? []), e]);
    return [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => ({ date, entries }));
  });

  constructor() {
    // Recharge à chaque nouvelle version (et au premier affichage)
    effect(() => {
      this.version();
      const session = this.session();
      untracked(() => void this.load(session));
    });
  }

  private async load(session: string): Promise<void> {
    try {
      const res = await fetch(`/api/agent/agenda?session=${encodeURIComponent(session)}`);
      if (!res.ok) throw new Error();
      this.entries.set((await res.json()).entries);
      this.error.set("");
    } catch {
      this.error.set("Agenda indisponible pour le moment.");
    }
  }
}
