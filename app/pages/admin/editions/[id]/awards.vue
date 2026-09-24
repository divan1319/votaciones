<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const editionId = route.params.id as string;

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

// Valores de métricas reactivas: awardId -> participantId -> number
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
  <div>
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-40 rounded" />
      <div class="flex justify-between items-center">
        <USkeleton class="h-8 w-60 rounded-xl" />
        <USkeleton class="h-10 w-44 rounded-xl" />
      </div>
      <div class="space-y-6 pt-4">
        <USkeleton v-for="i in 2" :key="i" class="h-64 rounded-3xl" />
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div v-else class="space-y-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <NuxtLink :to="`/admin/editions/${editionId}`" class="hover:text-emerald-400 transition flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3 h-3" />
          Volver a Edición
        </NuxtLink>
        <span>/</span>
        <span class="text-slate-200 font-medium">Premios Especiales</span>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 mb-1">
            <UIcon name="lucide:award" class="w-3.5 h-3.5" />
            <span>Métricas & Galardones Especiales</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Premios Especiales</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">Premios independientes del ganador de la corona del certamen</p>
        </div>

        <UButton color="primary" icon="lucide:plus" size="md" @click="openCreateModal">
          Nuevo Premio Especial
        </UButton>
      </div>

      <!-- Alerts with UAlert -->
      <div v-if="errorMsg">
        <UAlert
          color="error"
          variant="subtle"
          title="Error en la operación"
          :description="errorMsg"
          icon="lucide:alert-circle"
          :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
          @close="errorMsg = ''"
        />
      </div>

      <div v-if="successMsg">
        <UAlert
          color="success"
          variant="subtle"
          title="Operación exitosa"
          :description="successMsg"
          icon="lucide:check-circle"
          :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
          @close="successMsg = ''"
        />
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="!awardsList || awardsList.length === 0"
        class="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl"
      >
        <div class="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
          <UIcon name="lucide:award" class="w-8 h-8" />
        </div>
        <h3 class="text-lg font-bold text-white">No hay premios especiales configurados</h3>
        <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
          Crea galardones como "Miss Fotogénica", "Mejor Rostro" o premios impulsados por votos en redes sociales.
        </p>
        <UButton color="primary" icon="lucide:plus" size="md" @click="openCreateModal">
          Crear Primer Premio Especial
        </UButton>
      </div>

      <!-- Awards List -->
      <div v-else class="space-y-8">
        <div
          v-for="aw in awardsList"
          :key="aw.award.id"
          class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-xl sm:text-2xl font-black text-white">{{ aw.award.name }}</h2>
                <UBadge color="primary" variant="subtle" size="sm" class="capitalize">
                  {{ aw.award.type === 'criterion' ? 'Por Criterios' : aw.award.type === 'metric' ? 'Por Métrica (Redes)' : 'Elección Manual' }}
                </UBadge>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                {{ aw.award.type === 'criterion' ? 'Calculado como promedio ponderado de los criterios vinculados' : aw.award.type === 'metric' ? `Mayor valor de la métrica: ${aw.award.metricLabel || 'Puntos'}` : 'Decisión directa de organizadores o jurado' }}
              </p>
            </div>

            <!-- Ganador(es) actual(es) -->
            <div v-if="aw.winners.length > 0" class="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-2xl flex-shrink-0">
              <UIcon name="lucide:crown" class="w-5 h-5 text-amber-400" />
              <div class="text-xs">
                <span class="text-slate-400">Galardonada:</span>
                <div class="text-amber-300 font-bold text-sm">
                  {{ aw.winners.map((w: any) => w.name).join(', ') }}
                </div>
              </div>
            </div>
          </div>

          <!-- Metric Table Input if type === 'metric' -->
          <div v-if="aw.award.type === 'metric'" class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 class="text-sm font-semibold text-slate-300">
                Valores numéricos de la métrica ({{ aw.award.metricLabel || 'Likes/Votos' }}):
              </h3>
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
                  Para ingresar valores de métricas (votos populares, redes), primero debes registrar a las participantes en el panel de la edición.
                </p>
              </div>
              <NuxtLink :to="`/admin/editions/${editionId}`">
                <UButton color="primary" size="xs" icon="lucide:user-plus">
                  Ir a Registrar Participantes
                </UButton>
              </NuxtLink>
            </div>

            <!-- Cuadrícula de inputs por participante usando UInput -->
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
                <div class="w-32 flex-shrink-0">
                  <UInput
                    :model-value="getMetricValue(aw.award.id, p.id)"
                    @update:model-value="updateMetricValue(aw.award.id, p.id, $event)"
                    type="number"
                    size="sm"
                    class="w-full font-mono font-bold text-right"
                    icon="lucide:hash"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Rankings Table -->
          <div v-if="aw.rankings.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-sm min-w-[550px]">
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
                    <span class="font-semibold text-white">{{ r.name }}</span>
                    <span class="font-mono text-xs text-slate-400 ml-2">({{ r.code }})</span>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-emerald-400">{{ Number(r.score).toFixed(2) }}</td>
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

      <!-- MODAL CREAR PREMIO CON UFORM Y ZOD -->
      <UModal v-model:open="isCreateModalOpen" title="Crear Premio Especial">
        <template #body>
          <div class="p-6">
            <UForm :schema="awardSchema" :state="formState" class="space-y-4" @submit="handleCreateAward">
              <UFormField label="Nombre del Premio" name="name" description="Ej. Miss Fotogénica, Miss Elegancia, Voto Popular" required>
                <UInput v-model="formState.name" placeholder="Nombre del galardón" class="w-full" size="md" icon="lucide:award" />
              </UFormField>

              <UFormField label="Tipo de Premio" name="type" description="Criterio de cálculo o selección">
                <USelect v-model="formState.type" :items="awardTypeOptions" class="w-full" />
              </UFormField>

              <UFormField v-if="formState.type === 'metric'" label="Etiqueta de la Métrica" name="metricLabel" description="Ej. Votos en Instagram, Me gusta">
                <UInput v-model="formState.metricLabel" placeholder="Votos" class="w-full" size="md" />
              </UFormField>

              <div v-if="formState.type === 'criterion'" class="space-y-2">
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Vincular Criterios (Se promediarán)
                </label>
                <div class="space-y-2.5 max-h-48 overflow-y-auto p-3 bg-slate-800/50 rounded-2xl border border-slate-700">
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
                  <p v-if="!edition?.criteria || edition.criteria.length === 0" class="text-xs text-slate-400 italic">
                    No hay criterios registrados en la edición.
                  </p>
                </div>
              </div>

              <div class="pt-5 border-t border-slate-800 flex justify-end gap-3">
                <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">Cancelar</UButton>
                <UButton type="submit" color="primary" :loading="isSubmitting" icon="lucide:check">Crear Premio</UButton>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
