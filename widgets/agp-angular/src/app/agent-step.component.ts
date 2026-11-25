import { Component, computed, input } from "@angular/core";
import { JsonPipe } from "@angular/common";
import { stepInput, stepLabel, stepOutput } from "../../../../shared/agentLabels";
import type { Step } from "./agent-state";

/** Une étape = un appel d'outil. Dépliée, elle montre l'appel exact et la réponse brute. */
@Component({
  selector: "agp-step",
  imports: [JsonPipe],
  template: `
    <details class="step" [class]="'step--' + step().status">
      <summary>
        <span class="icon" aria-hidden="true">
          @switch (step().status) {
            @case ("running") { <span class="spinner"></span> }
            @case ("ok") { ✓ }
            @default { ! }
          }
        </span>
        <span class="body">
          <span class="line">
            <strong>{{ label() }}</strong>
            <span class="input">{{ inputText() }}</span>
          </span>
          <span class="output">{{ summary() }}</span>
        </span>
      </summary>
      <div class="raw">
        <p class="raw__title"><code>{{ step().name }}</code>, paramètres envoyés par Claude :</p>
        <pre>{{ step().input | json }}</pre>
        @if (step().status !== "running") {
          <p class="raw__title">Réponse du serveur, renvoyée à Claude :</p>
          <pre>{{ step().output | json }}</pre>
        }
      </div>
    </details>
  `,
  styleUrl: "./agent-step.component.css",
})
export class AgentStepComponent {
  readonly step = input.required<Step>();

  protected readonly label = computed(() => stepLabel(this.step().name));
  protected readonly inputText = computed(() => stepInput(this.step().name, this.step().input));
  protected readonly summary = computed(() => {
    const s = this.step();
    return s.status === "running" ? "…" : stepOutput(s.name, s.status === "ok", s.output);
  });
}
