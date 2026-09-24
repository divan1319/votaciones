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

const isModalOpen = ref(false);
const isSubmitting = ref(false);
const errorMsg = ref('');

// Opciones de selección para componentes USelect
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

// Zod schema para la nueva edición
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
  <div>
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-48 rounded" />
      <div class="flex justify-between items-center">
        <div class="space-y-2">
          <USkeleton class="h-8 w-64 rounded-xl" />
          <USkeleton class="h-4 w-96 rounded" />
        </div>
        <USkeleton class="h-10 w-36 rounded-xl" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        <USkeleton v-for="i in 3" :key="i" class="h-64 rounded-3xl" />
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div v-else-if="contest">
      <!-- Breadcrumb -->
      <div class="mb-6 flex items-center gap-2 text-xs text-slate-400">
        <NuxtLink to="/admin/contests" class="hover:text-emerald-400 transition flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3 h-3" />
          Concursos
        </NuxtLink>
        <span>/</span>
        <span class="text-slate-200 font-medium">{{ contest.name }}</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
            <UIcon name="lucide:calendar" class="w-3.5 h-3.5 text-amber-400" />
            <span>Ediciones del Certamen</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">{{ contest.name }}</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">{{ contest.description || 'Gestión de ediciones anuales, fases eliminatorias y participantes' }}</p>
        </div>

        <UButton
          color="primary"
          icon="lucide:plus"
          size="md"
          @click="openCreateModal"
        >
          Nueva Edición
        </UButton>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="!contest.editions || contest.editions.length === 0"
        class="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-sm"
      >
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <UIcon name="lucide:calendar" class="w-8 h-8" />
        </div>
        <h3 class="text-lg font-bold text-white">No hay ediciones configuradas</h3>
        <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
          Crea la primera edición (ej. {{ new Date().getFullYear() }}) para definir participantes, jueces, escalas y rondas.
        </p>
        <UButton color="primary" icon="lucide:plus" size="md" @click="openCreateModal">
          Crear Primera Edición
        </UButton>
      </div>

      <!-- EDITIONS GRID -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="ed in contest.editions"
          :key="ed.id"
          class="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-500/5 transition duration-200"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-4">
              <h2 class="text-2xl font-black text-white tracking-tight">Edición {{ ed.name }}</h2>
              <UBadge
                :color="ed.status === 'active' ? 'success' : ed.status === 'finished' ? 'neutral' : 'warning'"
                variant="subtle"
                size="sm"
              >
                {{ ed.status === 'active' ? 'En Curso' : ed.status === 'finished' ? 'Finalizada' : 'Borrador' }}
              </UBadge>
            </div>

            <div class="space-y-2 text-xs text-slate-400 mb-6 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
              <div class="flex justify-between items-center">
                <span>Método de Puntaje:</span>
                <span class="text-slate-200 font-semibold capitalize">{{ ed.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Acumulado entre rondas:</span>
                <span class="text-slate-200 font-semibold">{{ ed.accumulateRounds ? 'Sí (Promedio)' : 'No (Desde cero)' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Escala Calificación:</span>
                <span class="text-emerald-400 font-mono font-bold">[{{ ed.scaleMin }} - {{ ed.scaleMax }}]</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Alcance Criterios:</span>
                <span class="text-slate-200 font-medium">{{ ed.criteriaScope === 'edition' ? 'General' : 'Por Ronda' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span>Alcance Jueces:</span>
                <span class="text-slate-200 font-medium">{{ ed.judgesScope === 'edition' ? 'General' : 'Por Ronda' }}</span>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <NuxtLink
              v-if="ed.status === 'finished' && ed.resultsPublic"
              :to="`/results/${contestId}/${ed.id}`"
              target="_blank"
              class="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <UIcon name="lucide:external-link" class="w-3.5 h-3.5" />
              Página Pública
            </NuxtLink>
            <span v-else class="text-xs text-slate-500">
              {{ ed.resultsPublic ? 'Resultados Públicos' : 'Resultados Privados' }}
            </span>

            <NuxtLink :to="`/admin/editions/${ed.id}`">
              <UButton variant="ghost" color="primary" size="sm" trailing-icon="lucide:chevron-right">
                Administrar
              </UButton>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- MODAL CREAR EDICIÓN CON UFORM Y ZOD -->
      <UModal v-model:open="isModalOpen" title="Configurar Nueva Edición">
        <template #body>
          <div class="p-6">
            <div v-if="errorMsg" class="mb-5">
              <UAlert
                color="error"
                variant="subtle"
                title="Error al crear edición"
                :description="errorMsg"
                icon="lucide:alert-circle"
                :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
                @close="errorMsg = ''"
              />
            </div>

            <UForm :schema="editionSchema" :state="form" class="space-y-4" @submit="handleCreateEdition">
              <UFormField label="Nombre / Año de la Edición" name="name" description="Ej. 2026, Gala Otoño 2026" required>
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

              <div class="pt-5 border-t border-slate-800 flex justify-end gap-3">
                <UButton variant="ghost" color="neutral" @click="isModalOpen = false">
                  Cancelar
                </UButton>
                <UButton type="submit" color="primary" :loading="isSubmitting" icon="lucide:check">
                  Crear e Ir a Edición
                </UButton>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
