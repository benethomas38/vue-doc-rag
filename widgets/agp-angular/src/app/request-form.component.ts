import { Component, ElementRef, afterRenderEffect, input, model, output, viewChild } from "@angular/core";

/** Le champ de saisie : Entrée envoie, Maj+Entrée fait un retour à la ligne. */
@Component({
  selector: "agp-request-form",
  template: `
    <form class="ask" (submit)="$event.preventDefault(); send.emit()">
      <textarea
        #textarea
        rows="1"
        [value]="value()"
        [placeholder]="placeholder()"
        [attr.aria-label]="placeholder()"
        (input)="value.set(textarea.value)"
        (keydown)="onKeydown($event)"
      ></textarea>
      <button type="submit" [disabled]="disabled() || !value().trim()" aria-label="Envoyer">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M4 12h14M12 5l7 7-7 7"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </form>
  `,
  styles: `
    .ask {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 8px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
    }
    .ask:focus-within {
      border-color: var(--accent);
    }
    textarea {
      flex: 1;
      resize: none;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--text);
      font: inherit;
      line-height: 1.5;
      padding: 8px;
      max-height: 200px;
    }
    button {
      flex: none;
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 10px;
      background: var(--accent);
      color: var(--on-accent);
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
    }
    button:hover:not(:disabled) {
      transform: translateX(1px);
    }
    button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  `,
})
export class RequestFormComponent {
  readonly value = model.required<string>();
  readonly disabled = input(false);
  readonly placeholder = input("Décris l'événement à organiser…");
  readonly send = output<void>();

  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>("textarea");

  constructor() {
    // La zone de texte grandit avec le contenu (jusqu'à la limite fixée en CSS)
    afterRenderEffect(() => {
      this.value();
      const el = this.textarea().nativeElement;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }

  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.send.emit();
    }
  }

  focus(): void {
    const el = this.textarea().nativeElement;
    el.focus();
    // Curseur en fin de texte (utile quand « Modifier » pré-remplit la demande)
    el.setSelectionRange(el.value.length, el.value.length);
  }
}
