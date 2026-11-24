<script setup lang="ts">
import type { Draft } from "../../composables/useAgent";

defineProps<{ draft: Draft }>();
const emit = defineEmits<{ publish: []; edit: [] }>();
</script>

<template>
  <article class="card" :class="{ 'card--published': draft.published }" :aria-label="`Fiche : ${draft.titre}`">
    <p class="badge" :class="{ 'badge--ok': draft.published }">
      {{ draft.published ? "Publié dans ton agenda de démo" : "Brouillon, pas encore publié" }}
    </p>
    <h3>{{ draft.titre }}</h3>

    <dl class="facts">
      <div>
        <dt>Quand</dt>
        <dd>{{ draft.jour }}, {{ draft.debut }}-{{ draft.fin }}</dd>
      </div>
      <div>
        <dt>Où</dt>
        <dd>
          {{ draft.spot.nom }}
          <span class="sub">{{ draft.spot.rendezVous }}</span>
        </dd>
      </div>
      <div>
        <dt>Places</dt>
        <dd>{{ draft.places }}</dd>
      </div>
      <div>
        <dt>Niveau</dt>
        <dd>{{ draft.niveau }}</dd>
      </div>
    </dl>

    <p class="desc">{{ draft.description }}</p>
    <p v-if="draft.planB" class="planb"><strong>Plan B :</strong> {{ draft.planB }}</p>

    <p v-if="draft.publishError" class="error" role="alert">{{ draft.publishError }}</p>

    <div v-if="!draft.published" class="actions">
      <button class="btn btn--primary" :disabled="draft.publishing" @click="emit('publish')">
        {{ draft.publishing ? "Publication…" : "Publier" }}
      </button>
      <button class="btn" :disabled="draft.publishing" @click="emit('edit')">Modifier</button>
    </div>
  </article>
</template>

<style scoped>
.card {
  padding: 18px 20px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--paper);
}
.card--published {
  border-color: var(--teal);
}
.badge {
  display: inline-block;
  margin: 0 0 8px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #fff4d6;
  color: #7a4f00;
  font-size: 13px;
  font-weight: 700;
}
.badge--ok {
  background: var(--teal-wash);
  color: var(--blue-deep);
}
h3 {
  margin: 0 0 14px;
  font-size: 28px;
}
.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 20px;
  margin: 0 0 14px;
}
.facts dt {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
.facts dd {
  margin: 0;
  font-weight: 600;
}
.sub {
  display: block;
  font-weight: 400;
  font-size: 14px;
  color: var(--muted);
}
.desc {
  margin: 0 0 10px;
}
.planb {
  margin: 0 0 10px;
  padding: 8px 12px;
  border-left: 3px solid var(--blue);
  background: var(--bg-soft);
  font-size: 15px;
}
.error {
  margin: 0 0 10px;
  color: var(--danger);
  font-weight: 600;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
.btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
@media (max-width: 600px) {
  .facts {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
