<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const editionId = route.params.id as string;

const { data: awardsList, refresh } = await useFetch(`/api/admin/editions/${editionId}/awards`);
const { data: edition } = await useFetch(`/api/admin/editions/${editionId}`);

const isCreateModalOpen = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const isSubmitting = ref(false);

const newAward = reactive({
  name: '',
  type: 'criterion' as 'criterion' | 'metric' | 'manual',
  metricLabel: 'Votos',
  winnersCount: 1,
  selectedCriteria: [] as string[],
});

// Valores de métricas temporales: awardId -> participantId -> number
const metricInputs = reactive<Record<string, Record<string, number>>>({});

function getMetricValue(awardId: string, participantId: string): number {
  if (!metricInputs[awardId]) {
    metricInputs[awardId] = {};
  }
  if (metricInputs[awardId][participantId] === undefined) {
    const awData = awardsList.value?.find((a: any) => a.award.id === awardId);
    const existing = awData?.rankings.find((r: any) => r.participantId === participantId);
    metricInputs[awardId][participantId] = existing ? existing.score : 0;
  }
  return metricInputs[awardId][participantId];
}

function updateMetricValue(awardId: string, participantId: string, val: any) {
  if (!metricInputs[awardId]) {
    metricInputs[awardId] = {};
  }
  metricInputs[awardId][participantId] = Number(val) || 0;
}

watchEffect(() => {
  if (awardsList.value && edition.value?.participants) {
    for (const item of awardsList.value) {
      if (item.award.type === 'metric') {
        if (!metricInputs[item.award.id]) {
          metricInputs[item.award.id] = {};
        }
        for (const p of edition.value.participants) {
          const existing = item.rankings.find((r: any) => r.participantId === p.id);
          if (metricInputs[item.award.id][p.id] === undefined) {
            metricInputs[item.award.id][p.id] = existing ? existing.score : 0;
          }
        }
      }
    }
  }
});

async function handleCreateAward() {
  if (!newAward.name) return;
  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    await $fetch(`/api/admin/editions/${editionId}/awards`, {
      method: 'POST',
      body: {
        name: newAward.name,
        type: newAward.type,
        metricLabel: newAward.type === 'metric' ? newAward.metricLabel : undefined,
        winnersCount: Number(newAward.winnersCount),
        criterionIds: newAward.type === 'criterion' ? newAward.selectedCriteria : undefined,
      },
    });

    newAward.name = '';
    newAward.selectedCriteria = [];
    isCreateModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    isSubmitting.value = false;
  }
}

async function saveMetrics(awardId: string) {
  isSubmitting.value = true;
  errorMsg.value = '';
  try {
    const list = Object.entries(metricInputs[awardId] || {}).map(([participantId, value]) => ({
      participantId,
      value: Number(value),
    }));

    await $fetch(`/api/admin/awards/${awardId}/metrics`, {
      method: 'PUT',
      body: { metrics: list },
    });

    successMsg.value = 'Métricas guardadas exitosamente.';
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    isSubmitting.value = false;
  }
}

async function setManualWinner(awardId: string, participantId: string) {
  try {
    await $fetch(`/api/admin/awards/${awardId}/winner`, {
      method: 'POST',
      body: { participantId },
    });
    successMsg.value = 'Ganadora asignada al premio especial.';
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs text-slate-400">
      <NuxtLink :to="`/admin/editions/${editionId}`" class="hover:text-emerald-400 transition flex items-center gap-1">
        <UIcon name="lucide:arrow-left" class="w-3 h-3" />
        Volver a Edición
      </NuxtLink>
      <span>/</span>
      <span class="text-slate-200">Premios Especiales</span>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">Premios Especiales</h1>
        <p class="text-sm text-slate-400 mt-1">Premios independientes de la ganadora principal del certamen</p>
      </div>

      <UButton color="primary" icon="lucide:plus" size="md" @click="isCreateModalOpen = true">
        Nuevo Premio Especial
      </UButton>
    </div>

    <div v-if="errorMsg" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm">
      {{ errorMsg }}
    </div>

    <div v-if="successMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm">
      {{ successMsg }}
    </div>

    <!-- Awards List -->
    <div class="space-y-8">
      <div
        v-for="aw in awardsList"
        :key="aw.award.id"
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-2xl font-bold text-white">{{ aw.award.name }}</h2>
              <UBadge color="primary" variant="subtle" size="sm" class="capitalize">
                {{ aw.award.type === 'criterion' ? 'Por Criterios' : aw.award.type === 'metric' ? 'Por Métrica (Redes)' : 'Elección Manual' }}
              </UBadge>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              {{ aw.award.type === 'criterion' ? 'Calculado como promedio de criterios seleccionados en todas las rondas' : aw.award.type === 'metric' ? `Mayor valor de métrica: ${aw.award.metricLabel || 'Puntos'}` : 'Decisión directa de organizadores' }}
            </p>
          </div>

          <!-- Ganador(es) actual(es) -->
          <div v-if="aw.winners.length > 0" class="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl">
            <UIcon name="lucide:crown" class="w-5 h-5 text-amber-400" />
            <div class="text-xs">
              <span class="text-slate-400">Galardonada:</span>
              <div class="text-amber-300 font-bold text-sm">
                {{ aw.winners.map(w => w.name).join(', ') }}
              </div>
            </div>
          </div>
        </div>

        <!-- Metric Table Input if type === 'metric' -->
        <div v-if="aw.award.type === 'metric'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-300">Cargar valores numéricos de la métrica ({{ aw.award.metricLabel || 'Likes/Votos' }}):</h3>
            <UButton
              v-if="edition?.participants && edition.participants.length > 0"
              color="primary"
              size="xs"
              icon="lucide:save"
              :loading="isSubmitting"
              @click="saveMetrics(aw.award.id)"
            >
              Guardar Métricas
            </UButton>
          </div>

          <!-- Estado si aún no hay participantes en la edición -->
          <div v-if="!edition?.participants || edition.participants.length === 0" class="p-6 bg-slate-800/40 rounded-2xl border border-slate-700/60 text-center space-y-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <UIcon name="lucide:users" class="w-5 h-5" />
            </div>
            <div>
              <h4 class="font-bold text-white text-sm">Aún no hay participantes registrados en esta edición</h4>
              <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Para ingresar los valores de esta métrica (likes, votos, etc.), primero debes registrar a las participantes en el panel de la edición.
              </p>
            </div>
            <NuxtLink :to="`/admin/editions/${editionId}`">
              <UButton color="primary" size="xs" icon="lucide:user-plus">
                Ir a Registrar Participantes
              </UButton>
            </NuxtLink>
          </div>

          <!-- Cuadrícula de inputs por participante -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="p in edition.participants"
              :key="p.id"
              class="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/70 flex items-center justify-between gap-3 hover:border-slate-600 transition"
            >
              <div class="min-w-0">
                <span class="text-xs font-mono font-bold text-emerald-400 block">#{{ p.code }}</span>
                <span class="text-sm font-semibold text-white block truncate">{{ p.name }}</span>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <input
                  :value="getMetricValue(aw.award.id, p.id)"
                  @input="updateMetricValue(aw.award.id, p.id, ($event.target as HTMLInputElement).value)"
                  type="number"
                  placeholder="0"
                  class="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-right text-sm font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Rankings Table -->
        <div v-if="aw.rankings.length > 0" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-800/40 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th class="px-4 py-3">Puesto</th>
                <th class="px-4 py-3">Participante</th>
                <th class="px-4 py-3">Puntaje / Métrica</th>
                <th class="px-4 py-3">Estado</th>
                <th class="px-4 py-3 text-right">Elegir Ganadora</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="r in aw.rankings" :key="r.participantId" :class="r.isWinner ? 'bg-amber-500/10' : ''">
                <td class="px-4 py-3 font-mono font-bold text-slate-300">#{{ r.rank }}</td>
                <td class="px-4 py-3">
                  <span class="font-medium text-white">{{ r.name }}</span>
                  <span class="font-mono text-xs text-slate-400 ml-2">({{ r.code }})</span>
                </td>
                <td class="px-4 py-3 font-mono font-bold text-emerald-400">{{ r.score.toFixed(2) }}</td>
                <td class="px-4 py-3">
                  <UBadge v-if="r.isWinner" color="warning" size="xs">Ganadora</UBadge>
                  <UBadge v-else color="neutral" size="xs" variant="subtle">Participante</UBadge>
                </td>
                <td class="px-4 py-3 text-right">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="lucide:crown"
                    @click="setManualWinner(aw.award.id, r.participantId)"
                  >
                    Asignar Ganadora
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL CREAR PREMIO -->
    <UModal v-model:open="isCreateModalOpen" title="Crear Premio Especial">
      <template #body>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre del Premio</label>
            <UInput v-model="newAward.name" placeholder="Ej. Miss Fotogénica, Miss Redes Sociales" class="w-full" required />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tipo de Premio</label>
            <select v-model="newAward.type" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
              <option value="criterion">Por Criterios de Calificación (Promedio)</option>
              <option value="metric">Por Métrica Manual (Ej. Likes / Voto Popular)</option>
              <option value="manual">Elección Discrecional de Organizadores</option>
            </select>
          </div>

          <div v-if="newAward.type === 'metric'">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Etiqueta de la Métrica</label>
            <UInput v-model="newAward.metricLabel" placeholder="Ej. Votos en Instagram" class="w-full" />
          </div>

          <div v-if="newAward.type === 'criterion'">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Vincular Criterios (Se promediarán)</label>
            <div class="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-800/50 rounded-xl border border-slate-700">
              <label v-for="c in edition?.criteria" :key="c.id" class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  :value="c.id"
                  v-model="newAward.selectedCriteria"
                  class="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>{{ c.name }} ({{ Number(c.weight) }}%)</span>
              </label>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">Cancelar</UButton>
            <UButton color="primary" :loading="isSubmitting" @click="handleCreateAward">Crear Premio</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
