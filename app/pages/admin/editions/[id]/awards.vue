<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const editionId = route.params.id as string;

useHead({
  title: 'Premios Especiales y Métricas',
});

const { data: awardsList, status, refresh } = await useFetch(`/api/admin/editions/${editionId}/awards`);
const { data: edition } = await useFetch(`/api/admin/editions/${editionId}`);

const isCreateModalOpen = ref(false);
const errorMsg = ref('');
const successMsg = ref('');
const isSubmitting = ref(false);

const awardTypeOptions = [
  { label: 'Por Criterios de Calificación (Promedio)', value: 'criterion' },
  { label: 'Por Métrica Manual (Likes / Voto Popular)', value: 'metric' },
  { label: 'Elección Discrecional de Organizadores', value: 'manual' },
];

const awardSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type: z.enum(['criterion', 'metric', 'manual']),
  metricLabel: z.string().optional(),
  winnersCount: z.number().min(1, 'Mínimo 1 ganadora'),
});

type AwardSchema = z.output<typeof awardSchema>;

const formState = reactive<AwardSchema>({
  name: '',
  type: 'criterion',
  metricLabel: 'Votos',
  winnersCount: 1,
});

const selectedCriteria = ref<string[]>([]);

function openCreateModal() {
  formState.name = '';
  formState.type = 'criterion';
  formState.metricLabel = 'Votos';
  formState.winnersCount = 1;
  selectedCriteria.value = [];
  errorMsg.value = '';
  isCreateModalOpen.value = true;
}

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

async function handleCreateAward(event: FormSubmitEvent<AwardSchema>) {
  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    await $fetch(`/api/admin/editions/${editionId}/awards`, {
      method: 'POST',
      body: {
        name: event.data.name,
        type: event.data.type,
        metricLabel: event.data.type === 'metric' ? event.data.metricLabel : undefined,
        winnersCount: Number(event.data.winnersCount),
        criterionIds: event.data.type === 'criterion' ? selectedCriteria.value : undefined,
      },
    });

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
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-40 rounded-none" />
      <div class="flex justify-between items-center">
        <USkeleton class="h-8 w-60 rounded-none" />
        <USkeleton class="h-10 w-44 rounded-none" />
      </div>
      <div class="space-y-4 pt-4">
        <USkeleton v-for="i in 2" :key="i" class="h-64 rounded-none" />
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div v-else class="space-y-6">
      <!-- Carbon Breadcrumb -->
      <div class="flex items-center gap-2 text-xs font-mono text-[#8d8d8d]">
        <NuxtLink :to="`/admin/editions/${editionId}`" class="hover:underline text-[#c6c6c6] flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3.5 h-3.5" />
          <span>Volver a Edición</span>
        </NuxtLink>
        <span>/</span>
        <span class="text-white font-medium">Premios Especiales & Métricas</span>
      </div>

      <!-- Header Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#393939] pb-6">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider text-[#d4bbff] font-semibold mb-1">
            Reconocimientos Complementarios
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Premios Especiales</h1>
          <p class="text-xs sm:text-sm text-[#c6c6c6] mt-1 font-mono">
            Métricas de votación externa, acumulación de criterios o designación discrecional
          </p>
        </div>

        <button
          @click="openCreateModal"
          class="h-10 px-4 bg-[#0f62fe] hover:bg-[#0353e9] active:bg-[#002d9c] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition self-start sm:self-auto cursor-pointer"
        >
          <UIcon name="lucide:plus" class="w-4 h-4" />
          <span>Nuevo Premio Especial</span>
        </button>
      </div>

      <!-- Notifications -->
      <div v-if="errorMsg" class="p-3.5 bg-[#750e13]/20 border-l-4 border-[#da1e28] text-xs text-[#ff8389] flex items-center justify-between">
        <span>{{ errorMsg }}</span>
        <button @click="errorMsg = ''" class="text-[#ff8389] hover:text-white">✕</button>
      </div>

      <div v-if="successMsg" class="p-3.5 bg-[#0e6027]/20 border-l-4 border-[#24a148] text-xs text-[#42be65] flex items-center justify-between">
        <span>{{ successMsg }}</span>
        <button @click="successMsg = ''" class="text-[#42be65] hover:text-white">✕</button>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="!awardsList || awardsList.length === 0"
        class="carbon-tile p-12 text-center"
      >
        <div class="w-12 h-12 bg-[#1c1c1c] border border-[#393939] text-[#d4bbff] flex items-center justify-center mx-auto mb-3">
          <UIcon name="lucide:award" class="w-6 h-6" />
        </div>
        <h3 class="text-base font-bold text-white">No hay premios especiales configurados</h3>
        <p class="text-xs text-[#8d8d8d] max-w-sm mx-auto mt-1 mb-6 font-mono">
          Crea galardones complementarios como "Miss Fotogénica", "Mejor Rostro" o votaciones de redes sociales.
        </p>
        <button
          @click="openCreateModal"
          class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
        >
          <UIcon name="lucide:plus" class="w-3.5 h-3.5" />
          <span>Crear Primer Premio Especial</span>
        </button>
      </div>

      <!-- Awards List (Carbon Tiles) -->
      <div v-else class="space-y-6">
        <div
          v-for="aw in awardsList"
          :key="aw.award.id"
          class="carbon-tile p-6 space-y-6"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#393939] pb-4">
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-bold text-white">{{ aw.award.name }}</h2>
                <span class="carbon-tag carbon-tag-purple uppercase">
                  {{ aw.award.type === 'criterion' ? 'Por Criterios' : aw.award.type === 'metric' ? 'Por Métrica' : 'Elección Manual' }}
                </span>
              </div>
              <p class="text-xs text-[#8d8d8d] font-mono mt-1">
                {{ aw.award.type === 'criterion' ? 'Promedio ponderado de criterios seleccionados' : aw.award.type === 'metric' ? `Mayor valor de la métrica: ${aw.award.metricLabel || 'Puntos'}` : 'Designación directa de organizadores' }}
              </p>
            </div>

            <!-- Ganadora designada -->
            <div v-if="aw.winners.length > 0" class="flex items-center gap-2 px-3 py-1.5 bg-[#1c1c1c] border border-[#f1c21b]/40">
              <UIcon name="lucide:crown" class="w-4 h-4 text-[#f1c21b]" />
              <div class="text-xs font-mono">
                <span class="text-[#8d8d8d]">Galardonada:</span>
                <span class="text-[#f1c21b] font-bold ml-1.5">{{ aw.winners.map((w: any) => w.name).join(', ') }}</span>
              </div>
            </div>
          </div>

          <!-- Metric Input Grid if type === 'metric' -->
          <div v-if="aw.award.type === 'metric'" class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-mono uppercase tracking-wider text-[#c6c6c6]">
                Valores numéricos de la métrica ({{ aw.award.metricLabel || 'Puntos' }}):
              </h3>
              <button
                v-if="edition?.participants && edition.participants.length > 0"
                @click="saveMetrics(aw.award.id)"
                :disabled="isSubmitting"
                class="h-7 px-3 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <UIcon name="lucide:save" class="w-3 h-3" />
                <span>Guardar Métricas</span>
              </button>
            </div>

            <div v-if="!edition?.participants || edition.participants.length === 0" class="p-4 bg-[#1c1c1c] border border-[#333333] text-xs text-[#8d8d8d] font-mono">
              Registra participantes en la edición para cargar las métricas.
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div
                v-for="p in edition.participants"
                :key="p.id"
                class="p-2.5 bg-[#1c1c1c] border border-[#393939] flex items-center justify-between gap-2"
              >
                <div class="min-w-0">
                  <span class="text-[11px] font-mono font-bold text-[#78a9ff] block">#{{ p.code }}</span>
                  <span class="text-xs font-medium text-white block truncate">{{ p.name }}</span>
                </div>
                <div class="w-28 flex-shrink-0">
                  <UInput
                    :model-value="getMetricValue(aw.award.id, p.id)"
                    @update:model-value="updateMetricValue(aw.award.id, p.id, $event)"
                    type="number"
                    size="xs"
                    class="w-full font-mono text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Rankings Table -->
          <div v-if="aw.rankings.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-xs min-w-[500px]">
              <thead class="carbon-table-header">
                <tr>
                  <th class="px-5 py-2.5">Puesto</th>
                  <th class="px-5 py-2.5">Participante</th>
                  <th class="px-5 py-2.5">Puntaje / Métrica</th>
                  <th class="px-5 py-2.5">Estado</th>
                  <th class="px-5 py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#333333]">
                <tr v-for="r in aw.rankings" :key="r.participantId" :class="r.isWinner ? 'bg-[#f1c21b]/10' : ''" class="hover:bg-[#2e2e2e]">
                  <td class="px-5 py-2.5 font-mono font-bold text-white">#{{ r.rank }}</td>
                  <td class="px-5 py-2.5 font-medium text-white">
                    <span>{{ r.name }}</span>
                    <span class="font-mono text-[#8d8d8d] ml-1.5">({{ r.code }})</span>
                  </td>
                  <td class="px-5 py-2.5 font-mono font-bold text-[#78a9ff]">{{ Number(r.score).toFixed(2) }}</td>
                  <td class="px-5 py-2.5">
                    <span class="carbon-tag" :class="r.isWinner ? 'carbon-tag-warm' : 'carbon-tag-gray'">
                      {{ r.isWinner ? 'GANADORA' : 'PARTICIPANTE' }}
                    </span>
                  </td>
                  <td class="px-5 py-2.5 text-right">
                    <button
                      @click="setManualWinner(aw.award.id, r.participantId)"
                      class="h-6 px-2 text-xs font-mono text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252] inline-flex items-center gap-1"
                    >
                      <UIcon name="lucide:crown" class="w-3 h-3 text-[#f1c21b]" />
                      <span>Asignar Ganadora</span>
                    </button>
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
          <div class="p-6 bg-[#262626]">
            <UForm :schema="awardSchema" :state="formState" class="space-y-4" @submit="handleCreateAward">
              <UFormField label="Nombre del Galardón" name="name" description="Ej. Miss Fotogénica, Miss Simpatía" required>
                <UInput v-model="formState.name" placeholder="Nombre del premio" class="w-full" size="md" />
              </UFormField>

              <UFormField label="Tipo de Premio" name="type" description="Criterio de cálculo o selección">
                <USelect v-model="formState.type" :items="awardTypeOptions" class="w-full" />
              </UFormField>

              <UFormField v-if="formState.type === 'metric'" label="Etiqueta de la Métrica" name="metricLabel" description="Ej. Likes en Instagram, Votos del Público">
                <UInput v-model="formState.metricLabel" placeholder="Votos" class="w-full" size="md" />
              </UFormField>

              <div v-if="formState.type === 'criterion'" class="space-y-2">
                <label class="block text-xs font-mono uppercase tracking-wider text-[#c6c6c6]">
                  Vincular Criterios (Promedio acumulado)
                </label>
                <div class="space-y-2 max-h-48 overflow-y-auto p-3 bg-[#1c1c1c] border border-[#393939]">
                  <div v-for="c in edition?.criteria" :key="c.id" class="flex items-center gap-2">
                    <UCheckbox
                      :id="`crit-${c.id}`"
                      :model-value="selectedCriteria.includes(c.id)"
                      @update:model-value="(checked: boolean) => {
                        if (checked) {
                          if (!selectedCriteria.includes(c.id)) selectedCriteria.push(c.id);
                        } else {
                          selectedCriteria = selectedCriteria.filter(id => id !== c.id);
                        }
                      }"
                      :label="`${c.name} (${Number(c.weight)}%)`"
                    />
                  </div>
                  <p v-if="!edition?.criteria || edition.criteria.length === 0" class="text-xs text-[#8d8d8d] font-mono">
                    No hay criterios registrados en la edición.
                  </p>
                </div>
              </div>

              <div class="pt-5 border-t border-[#393939] flex justify-end gap-2">
                <button type="button" @click="isCreateModalOpen = false" class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]">
                  Cancelar
                </button>
                <button type="submit" :disabled="isSubmitting" class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50">
                  <UIcon name="lucide:check" class="w-3.5 h-3.5" />
                  <span>Crear Premio</span>
                </button>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
