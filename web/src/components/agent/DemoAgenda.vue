<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { shortDate } from "../../lib/agentLabels";

interface Entry {
  id: string;
  titre: string;
  date: string;
  debut: string;
  fin: string;
  lieu: string;
  source: "recurrent" | "publie";
}

const props = defineProps<{ session: string; version: number }>();

const entries = ref<Entry[]>([]);
const error = ref("");

async function load() {
  try {
    const res = await fetch(`/api/agent/agenda?session=${encodeURIComponent(props.session)}`);
    if (!res.ok) throw new Error();
    entries.value = (await res.json()).entries;
    error.value = "";
  } catch {
    error.value = "Agenda indisponible pour le moment.";
  }
}

watch(() => props.version, load, { immediate: true });

const byDay = computed(() => {
  const days = new Map<string, Entry[]>();
  for (const e of entries.value) days.set(e.date, [...(days.get(e.date) ?? []), e]);
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
});
</script>

<template>
  <aside class="agenda" aria-labelledby="agenda-title">
    <h3 id="agenda-title">Agenda de démo</h3>
    <p class="note">Fictif et propre à ton navigateur. Ce que tu publies n'apparaît que chez toi.</p>
    <p v-if="error" class="note">{{ error }}</p>
    <ol class="days">
      <li v-for="[date, list] in byDay" :key="date">
        <p class="day">{{ shortDate(date) }}</p>
        <ul>
          <li v-for="e in list" :key="e.id" :class="{ published: e.source === 'publie' }">
            <span class="time">{{ e.debut }}</span>
            <span>
              {{ e.titre }}
              <span class="where">{{ e.lieu }}</span>
            </span>
          </li>
        </ul>
      </li>
    </ol>
  </aside>
</template>

<style scoped>
.agenda {
  padding: 16px;
  border: 2px solid var(--ink);
  border-radius: 6px;
  background: var(--paper);
  max-height: min(720px, calc(100dvh - 120px));
  overflow-y: auto;
}
h3 {
  margin: 0 0 4px;
  font-size: 26px;
}
.note {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--muted);
}
.days,
.days ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.days > li {
  padding: 8px 0;
  border-top: 1px solid var(--border);
}
.day {
  margin: 0 0 4px;
  font-weight: 800;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--blue-deep);
}
.days ul li {
  display: flex;
  gap: 10px;
  padding: 3px 6px;
  margin: 0 -6px;
  border-radius: 4px;
  font-size: 15px;
  line-height: 1.35;
}
.time {
  flex: none;
  width: 3em;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.where {
  display: block;
  font-size: 13px;
  color: var(--muted);
}
.published {
  background: var(--teal-wash);
  animation: flash 1.2s ease-out;
}
@keyframes flash {
  from {
    background: var(--teal);
  }
}
</style>
