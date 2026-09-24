<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const contestId = route.params.id as string;

const { data: contest, status, refresh } = await useFetch(`/api/admin/contests/${contestId}`);

useHead({
  title: () => contest.value ? `${contest.value.name} — Ediciones` : 'Detalle de Concurso',
});

const isModalOpen = ref(false);
const isSubmitting = ref(false);
const errorMsg = ref('');

const scoringMethodOptions = [
  { label: 'Promedio entre Jueces', value: 'average' },
  { label: 'Suma entre Jueces', value: 'sum' },
];

const accumulateOptions = [
  { label: 'No (Cada ronda parte de cero)', value: 'false' },
  { label: 'Sí (Promedio acumulado de rondas)', value: 'true' },
];

const criteriaScopeOptions = [
  { label: 'Generales de la Edición', value: 'edition' },
  { label: 'Específicos por Ronda', value: 'round' },
];

const judgesScopeOptions = [
  { label: 'Generales de la Edición', value: 'edition' },
  { label: 'Específicos por Ronda', value: 'round' },
];

const advanceModeOptions = [
  { label: 'Top N (Puestos fijos)', value: 'top_n' },
  { label: 'Puntaje Mínimo requerido', value: 'min_score' },
];

const editionSchema = z.object({
  name: z.string().min(1, 'El nombre o año de la edición es requerido'),
  scoringMethod: z.enum(['average', 'sum']),
  accumulateRounds: z.string(),
  criteriaScope: z.enum(['edition', 'round']),
  judgesScope: z.enum(['edition', 'round']),
  scaleMin: z.number().min(0, 'Mínimo 0'),
  scaleMax: z.number().min(1, 'Máximo mayor a 0'),
  advanceMode: z.enum(['top_n', 'min_score']),
  advanceValue: z.number().min(0.1, 'Debe ser mayor a 0'),
}).refine(data => data.scaleMax > data.scaleMin, {
  message: 'La escala máxima debe ser mayor a la mínima',
  path: ['scaleMax'],
});

type EditionSchema = z.output<typeof editionSchema>;

const form = reactive<EditionSchema>({
  name: `${new Date().getFullYear()}`,
  scoringMethod: 'average',
  accumulateRounds: 'false',
  criteriaScope: 'edition',
  judgesScope: 'edition',
  scaleMin: 1,
  scaleMax: 10,
  advanceMode: 'top_n',
  advanceValue: 1,
});

function openCreateModal() {
  form.name = `${new Date().getFullYear()}`;
  form.scoringMethod = 'average';
  form.accumulateRounds = 'false';
  form.criteriaScope = 'edition';
  form.judgesScope = 'edition';
  form.scaleMin = 1;
  form.scaleMax = 10;
  form.advanceMode = 'top_n';
  form.advanceValue = 1;
  errorMsg.value = '';
  isModalOpen.value = true;
}

async function handleCreateEdition(event: FormSubmitEvent<EditionSchema>) {
  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    const res = await $fetch(`/api/admin/contests/${contestId}/editions`, {
      method: 'POST',
      body: {
        name: event.data.name,
        scoringMethod: event.data.scoringMethod,
        accumulateRounds: event.data.accumulateRounds === 'true',
        criteriaScope: event.data.criteriaScope,
        judgesScope: event.data.judgesScope,
        scaleMin: Number(event.data.scaleMin),
        scaleMax: Number(event.data.scaleMax),
        advanceMode: event.data.advanceMode,
        advanceValue: Number(event.data.advanceValue),
      },
    });

    isModalOpen.value = false;
    await refresh();
    await navigateTo(`/admin/editions/${res.edition.id}`);
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Error al crear la edición';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-48 rounded-none" />
      <div class="flex justify-between items-center">
        <div class="space-y-2">
          <USkeleton class="h-8 w-64 rounded-none" />
          <USkeleton class="h-4 w-96 rounded-none" />
        </div>
        <USkeleton class="h-10 w-36 rounded-none" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
        <USkeleton v-for="i in 3" :key="i" class="h-64 rounded-none" />
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div v-else-if="contest" class="space-y-6">
      <!-- Carbon Breadcrumb -->
      <div class="flex items-center gap-2 text-xs font-mono text-[#8d8d8d]">
        <NuxtLink to="/admin/contests" class="hover:underline text-[#c6c6c6] flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3.5 h-3.5" />
          <span>Concursos</span>
        </NuxtLink>
        <span>/</span>
        <span class="text-white font-medium">{{ contest.name }}</span>
      </div>

      <!-- Carbon Header Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#393939] pb-6">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-wider text-[#78a9ff] font-semibold mb-1">
            Certamen Maestro
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">{{ contest.name }}</h1>
          <p class="text-xs sm:text-sm text-[#c6c6c6] mt-1 font-mono">
            {{ contest.description || 'Gestión de ediciones anuales, fases eliminatorias y participantes' }}
          </p>
        </div>

        <button
          @click="openCreateModal"
          class="h-10 px-4 bg-[#0f62fe] hover:bg-[#0353e9] active:bg-[#002d9c] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition self-start sm:self-auto cursor-pointer"
        >
          <UIcon name="lucide:plus" class="w-4 h-4" />
          <span>Nueva Edición</span>
        </button>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="!contest.editions || contest.editions.length === 0"
        class="carbon-tile p-12 text-center"
      >
        <div class="w-12 h-12 bg-[#1c1c1c] border border-[#393939] text-[#78a9ff] flex items-center justify-center mx-auto mb-3">
          <UIcon name="lucide:calendar" class="w-6 h-6" />
        </div>
        <h3 class="text-base font-bold text-white">No hay ediciones configuradas</h3>
        <p class="text-xs text-[#8d8d8d] max-w-sm mx-auto mt-1 mb-6 font-mono">
          Crea la primera edición (ej. {{ new Date().getFullYear() }}) para definir participantes, jueces, escalas y rondas.
        </p>
        <button
          @click="openCreateModal"
          class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
        >
          <UIcon name="lucide:plus" class="w-3.5 h-3.5" />
          <span>Crear Primera Edición</span>
        </button>
      </div>

      <!-- EDITIONS GRID (Carbon Tiles) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="ed in contest.editions"
          :key="ed.id"
          class="carbon-tile p-6 flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-4 border-b border-[#393939] pb-3">
              <h2 class="text-xl font-bold text-white tracking-tight">Edición {{ ed.name }}</h2>
              <span
                class="carbon-tag"
                :class="ed.status === 'active' ? 'carbon-tag-green' : ed.status === 'finished' ? 'carbon-tag-gray' : 'carbon-tag-warm'"
              >
                {{ ed.status === 'active' ? 'EN CURSO' : ed.status === 'finished' ? 'FINALIZADA' : 'BORRADOR' }}
              </span>
            </div>

            <div class="space-y-2 text-xs font-mono text-[#8d8d8d] mb-6">
              <div class="flex justify-between items-center py-1 border-b border-[#333333]">
                <span>Método de Puntaje:</span>
                <span class="text-white font-semibold uppercase">{{ ed.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-[#333333]">
                <span>Acumulado Rondas:</span>
                <span class="text-white font-medium">{{ ed.accumulateRounds ? 'Sí (Promedio)' : 'No (Desde cero)' }}</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-[#333333]">
                <span>Escala Permitida:</span>
                <span class="text-[#78a9ff] font-bold">[{{ ed.scaleMin }} &ndash; {{ ed.scaleMax }} pts]</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-[#333333]">
                <span>Criterios / Jueces:</span>
                <span class="text-[#c6c6c6]">{{ ed.criteriaScope === 'edition' ? 'General' : 'Por Ronda' }} / {{ ed.judgesScope === 'edition' ? 'General' : 'Por Ronda' }}</span>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-[#393939] flex items-center justify-between text-xs">
            <NuxtLink
              v-if="ed.status === 'finished' && ed.resultsPublic"
              :to="`/results/${contestId}/${ed.id}`"
              target="_blank"
              class="text-[#78a9ff] hover:underline font-mono text-[11px] flex items-center gap-1"
            >
              <UIcon name="lucide:external-link" class="w-3.5 h-3.5" />
              <span>Boletín Público</span>
            </NuxtLink>
            <span v-else class="text-[11px] font-mono text-[#8d8d8d]">
              {{ ed.resultsPublic ? 'PÚBLICO' : 'PRIVADO' }}
            </span>

            <NuxtLink :to="`/admin/editions/${ed.id}`">
              <button class="h-8 px-3 text-xs font-semibold bg-[#262626] hover:bg-[#393939] border border-[#525252] text-[#78a9ff] hover:text-white flex items-center gap-1.5 transition">
                <span>Gestionar Edición</span>
                <UIcon name="lucide:chevron-right" class="w-3.5 h-3.5" />
              </button>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- MODAL CREAR EDICIÓN (Carbon Modal) -->
      <UModal v-model:open="isModalOpen" title="Configurar Nueva Edición">
        <template #body>
          <div class="p-6 bg-[#262626]">
            <div v-if="errorMsg" class="mb-4 p-3 bg-[#750e13]/20 border-l-4 border-[#da1e28] text-xs text-[#ff8389]">
              {{ errorMsg }}
            </div>

            <UForm :schema="editionSchema" :state="form" class="space-y-4" @submit="handleCreateEdition">
              <UFormField label="Nombre / Año de la Edición" name="name" description="Ej. 2026, Otoño 2026" required>
                <UInput v-model="form.name" placeholder="2026" class="w-full" size="md" icon="lucide:calendar" />
              </UFormField>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="Método de Puntaje" name="scoringMethod" description="Cálculo entre jueces">
                  <USelect v-model="form.scoringMethod" :items="scoringMethodOptions" class="w-full" />
                </UFormField>

                <UFormField label="Acumular Rondas" name="accumulateRounds" description="Arrastre de puntos previos">
                  <USelect v-model="form.accumulateRounds" :items="accumulateOptions" class="w-full" />
                </UFormField>

                <UFormField label="Escala Mínima" name="scaleMin" description="Puntaje menor asignable">
                  <UInput v-model.number="form.scaleMin" type="number" step="0.5" class="w-full" />
                </UFormField>

                <UFormField label="Escala Máxima" name="scaleMax" description="Puntaje mayor asignable">
                  <UInput v-model.number="form.scaleMax" type="number" step="0.5" class="w-full" />
                </UFormField>

                <UFormField label="Alcance de Criterios" name="criteriaScope" description="Generales o por ronda">
                  <USelect v-model="form.criteriaScope" :items="criteriaScopeOptions" class="w-full" />
                </UFormField>

                <UFormField label="Alcance de Jueces" name="judgesScope" description="Generales o por ronda">
                  <USelect v-model="form.judgesScope" :items="judgesScopeOptions" class="w-full" />
                </UFormField>
              </div>

              <div class="pt-5 border-t border-[#393939] flex justify-end gap-2">
                <button
                  type="button"
                  @click="isModalOpen = false"
                  class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="isSubmitting"
                  class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UIcon v-if="isSubmitting" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                  <UIcon v-else name="lucide:check" class="w-3.5 h-3.5" />
                  <span>Crear e Ir a Edición</span>
                </button>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
