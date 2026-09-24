<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const contestId = route.params.id as string;

const { data: contest, refresh } = await useFetch(`/api/admin/contests/${contestId}`);

const isModalOpen = ref(false);
const isSubmitting = ref(false);
const errorMsg = ref('');

// Formulario de edición
const form = reactive({
  name: `${new Date().getFullYear()}`,
  scoringMethod: 'average' as 'average' | 'sum',
  accumulateRounds: false,
  criteriaScope: 'edition' as 'edition' | 'round',
  judgesScope: 'edition' as 'edition' | 'round',
  scaleMin: 1,
  scaleMax: 10,
  advanceMode: 'top_n' as 'top_n' | 'min_score',
  advanceValue: 1,
});

async function handleCreateEdition() {
  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    const res = await $fetch(`/api/admin/contests/${contestId}/editions`, {
      method: 'POST',
      body: {
        name: form.name,
        scoringMethod: form.scoringMethod,
        accumulateRounds: form.accumulateRounds,
        criteriaScope: form.criteriaScope,
        judgesScope: form.judgesScope,
        scaleMin: Number(form.scaleMin),
        scaleMax: Number(form.scaleMax),
        advanceMode: form.advanceMode,
        advanceValue: Number(form.advanceValue),
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
  <div v-if="contest">
    <div class="mb-6 flex items-center gap-2 text-xs text-slate-400">
      <NuxtLink to="/admin/contests" class="hover:text-emerald-400 transition flex items-center gap-1">
        <UIcon name="lucide:arrow-left" class="w-3 h-3" />
        Concursos
      </NuxtLink>
      <span>/</span>
      <span class="text-slate-200">{{ contest.name }}</span>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">{{ contest.name }}</h1>
        <p class="text-sm text-slate-400 mt-1">{{ contest.description || 'Gestión de ediciones anuales y rondas' }}</p>
      </div>

      <UButton
        color="primary"
        icon="lucide:plus"
        size="md"
        @click="isModalOpen = true"
      >
        Nueva Edición
      </UButton>
    </div>

    <!-- Editions List -->
    <div v-if="!contest.editions || contest.editions.length === 0" class="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
      <UIcon name="lucide:calendar" class="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-slate-300">No hay ediciones configuradas</h3>
      <p class="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
        Crea la primera edición (ej. {{ new Date().getFullYear() }}) para configurar participantes, jueces y criterios.
      </p>
      <UButton color="primary" icon="lucide:plus" size="sm" @click="isModalOpen = true">
        Crear Primera Edición
      </UButton>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="ed in contest.editions"
        :key="ed.id"
        class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition"
      >
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <h2 class="text-2xl font-bold text-white tracking-tight">Edición {{ ed.name }}</h2>
            <UBadge
              :color="ed.status === 'active' ? 'success' : ed.status === 'finished' ? 'neutral' : 'warning'"
              variant="subtle"
              size="sm"
            >
              {{ ed.status === 'active' ? 'En Curso' : ed.status === 'finished' ? 'Finalizada' : 'Borrador' }}
            </UBadge>
          </div>

          <div class="space-y-1.5 text-xs text-slate-400 mb-6">
            <div class="flex justify-between">
              <span>Método de Puntaje:</span>
              <span class="text-slate-200 font-medium capitalize">{{ ed.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Acumulado entre rondas:</span>
              <span class="text-slate-200 font-medium">{{ ed.accumulateRounds ? 'Sí (Promedio)' : 'No (Desde cero)' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Escala de Calificación:</span>
              <span class="text-slate-200 font-medium">[{{ ed.scaleMin }} - {{ ed.scaleMax }}]</span>
            </div>
            <div class="flex justify-between">
              <span>Alcance Criterios / Jueces:</span>
              <span class="text-slate-200 font-medium">{{ ed.criteriaScope === 'edition' ? 'General' : 'Por Ronda' }} / {{ ed.judgesScope === 'edition' ? 'General' : 'Por Ronda' }}</span>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
          <NuxtLink v-if="ed.status === 'finished' && ed.resultsPublic" :to="`/results/${contestId}/${ed.id}`" target="_blank" class="text-xs text-emerald-400 hover:underline flex items-center gap-1">
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

    <!-- Modal Crear Edición -->
    <UModal v-model:open="isModalOpen" title="Configurar Nueva Edición">
      <template #body>
        <div class="p-6 space-y-4">
          <div v-if="errorMsg" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            {{ errorMsg }}
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre / Año de la Edición</label>
              <UInput v-model="form.name" placeholder="Ej. 2026, Otoño 2026" class="w-full" required />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Método de Puntaje</label>
              <select v-model="form.scoringMethod" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="average">Promedio entre Jueces</option>
                <option value="sum">Suma entre Jueces</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Acumular Rondas</label>
              <select v-model="form.accumulateRounds" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option :value="false">No (Cada ronda parte de cero)</option>
                <option :value="true">Sí (Promedio de rondas jugadas)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Escala Mínima</label>
              <UInput v-model.number="form.scaleMin" type="number" step="0.5" class="w-full" />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Escala Máxima</label>
              <UInput v-model.number="form.scaleMax" type="number" step="0.5" class="w-full" />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Alcance de Criterios</label>
              <select v-model="form.criteriaScope" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="edition">Generales de la Edición</option>
                <option value="round">Específicos por Ronda</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Alcance de Jueces</label>
              <select v-model="form.judgesScope" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="edition">Generales de la Edición</option>
                <option value="round">Específicos por Ronda</option>
              </select>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="isModalOpen = false">Cancelar</UButton>
            <UButton color="primary" :loading="isSubmitting" @click="handleCreateEdition">Crear e Ir a Edición</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
