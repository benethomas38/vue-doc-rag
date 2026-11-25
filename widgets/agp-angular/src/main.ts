/**
 * Point d'entrée : transforme le composant Angular en Web Component <agp-assistant>.
 *
 * Pas de zone.js : la détection de changements passe par les signaux (zoneless).
 * Le code de la page hôte (Vue) n'est donc pas « patché » par Angular.
 */
import { provideZonelessChangeDetection } from "@angular/core";
import { createCustomElement } from "@angular/elements";
import { createApplication } from "@angular/platform-browser";
import { AgpAssistantComponent } from "./app/agp-assistant.component";

const TAG = "agp-assistant";

createApplication({ providers: [provideZonelessChangeDetection()] })
  .then((app) => {
    if (customElements.get(TAG)) return;
    customElements.define(TAG, createCustomElement(AgpAssistantComponent, { injector: app.injector }));
  })
  .catch((err) => console.error(err));
