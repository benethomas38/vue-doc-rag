/**
 * <audio-visualizer> : le visualiseur React, emballé dans un Web Component.
 *
 * La page Vue ne connaît que cette balise. Elle importe ce fichier au moment d'ouvrir la page,
 * ce qui charge React dans un morceau de JS à part et enregistre l'élément.
 */
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AudioVisualizer } from "./AudioVisualizer";

export const TAG = "audio-visualizer";

class AudioVisualizerElement extends HTMLElement {
  private root: Root | null = null;

  connectedCallback() {
    this.root ??= createRoot(this);
    this.root.render(
      <StrictMode>
        <AudioVisualizer />
      </StrictMode>,
    );
  }

  disconnectedCallback() {
    // Un élément déplacé dans la page est détaché puis rattaché aussitôt : on attend
    // la fin de la tâche en cours avant de démonter (et de couper le son).
    queueMicrotask(() => {
      if (this.isConnected) return;
      this.root?.unmount();
      this.root = null;
    });
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, AudioVisualizerElement);
