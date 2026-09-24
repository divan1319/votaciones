<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const editionId = route.params.id as string;

const { data: edition, refresh } = await useFetch(`/api/admin/editions/${editionId}`);

const activeTab = ref('rounds');
const errorMsg = ref('');
const successMsg = ref('');
const loadingAction = ref(false);

// Modales
const isAddRoundModalOpen = ref(false);
const isAddParticipantModalOpen = ref(false);
const isAddCriterionModalOpen = ref(false);
const isAddJudgeModalOpen = ref(false);

// Formulario nueva ronda
const newRound = reactive({
  name: '',
  advanceMode: 'top_n' as 'top_n' | 'min_score',
  advanceValue: 3,
});

// Formulario nuevo participante
const newParticipant = reactive({
  name: '',
  code: '',
});

// Formulario nuevo criterio
const newCriterion = reactive({
  name: '',
  weight: 25,
});

// Formulario nuevo juez
const newJudge = reactive({
  name: '',
  email: '',
  password: 'Juez' + Math.floor(1000 + Math.random() * 9000) + '!',
});

// Mensaje de credenciales de juez creado
const createdJudgeInfo = ref<{ email: string; pass: string } | null>(null);

// Criterios suma
const totalCriteriaWeight = computed(() => {
  if (!edition.value?.criteria) return 0;
  return edition.value.criteria.reduce((acc: number, c: any) => acc + Number(c.weight), 0);
});

const isCriteriaWeightValid = computed(() => {
  return Math.abs(totalCriteriaWeight.value - 100) < 0.01;
});

// Acciones de ciclo de vida de la edición
async function activateEdition() {
  loadingAction.value = true;
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/editions/${editionId}/activate`, { method: 'POST' });
    successMsg.value = 'Edición activada con éxito.';
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    loadingAction.value = false;
  }
}

async function finishEdition() {
  if (!confirm('¿Estás seguro de finalizar la edición? Se cerrará el concurso de forma oficial.')) return;
  loadingAction.value = true;
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/editions/${editionId}/finish`, { method: 'POST' });
    successMsg.value = 'Edición finalizada oficialmente.';
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    loadingAction.value = false;
  }
}

async function togglePublicResults() {
  loadingAction.value = true;
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/editions/${editionId}/visibility`, {
      method: 'PUT',
      body: { resultsPublic: !edition.value?.resultsPublic },
    });
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    loadingAction.value = false;
  }
}

// Abrir ronda
async function openRound(roundId: string) {
  loadingAction.value = true;
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/rounds/${roundId}/open`, { method: 'POST' });
    successMsg.value = 'Ronda abierta para votación.';
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    loadingAction.value = false;
  }
}

// Crear Ronda
async function handleCreateRound() {
  if (!newRound.name) return;
  try {
    await $fetch(`/api/admin/editions/${editionId}/rounds`, {
      method: 'POST',
      body: {
        name: newRound.name,
        advanceMode: newRound.advanceMode,
        advanceValue: Number(newRound.advanceValue),
      },
    });
    newRound.name = '';
    isAddRoundModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

// Crear Participante
async function handleCreateParticipant() {
  if (!newParticipant.name || !newParticipant.code) return;
  try {
    await $fetch(`/api/admin/editions/${editionId}/participants`, {
      method: 'POST',
      body: {
        name: newParticipant.name,
        code: newParticipant.code,
      },
    });
    newParticipant.name = '';
    newParticipant.code = '';
    isAddParticipantModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

// Crear Criterio
async function handleCreateCriterion() {
  if (!newCriterion.name) return;
  try {
    await $fetch(`/api/admin/editions/${editionId}/criteria`, {
      method: 'POST',
      body: {
        name: newCriterion.name,
        weight: Number(newCriterion.weight),
      },
    });
    newCriterion.name = '';
    isAddCriterionModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

// Crear Juez
async function handleCreateJudge() {
  if (!newJudge.name || !newJudge.email) return;
  try {
    const res = await $fetch(`/api/admin/editions/${editionId}/judges`, {
      method: 'POST',
      body: {
        name: newJudge.name,
        email: newJudge.email,
        password: newJudge.password,
      },
    });

    createdJudgeInfo.value = {
      email: res.email,
      pass: res.tempPassword,
    };

    newJudge.name = '';
    newJudge.email = '';
    newJudge.password = 'Juez' + Math.floor(1000 + Math.random() * 9000) + '!';
    isAddJudgeModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

async function deleteCriterion(id: string) {
  if (!confirm('¿Eliminar este criterio?')) return;
  try {
    await $fetch(`/api/admin/criteria/${id}`, { method: 'DELETE' });
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

async function deleteParticipant(id: string) {
  if (!confirm('¿Eliminar este participante?')) return;
  try {
    await $fetch(`/api/admin/participants/${id}`, { method: 'DELETE' });
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

async function unassignJudge(judgeId: string) {
  if (!confirm('¿Desvincular a este juez de la edición?')) return;
  try {
    await $fetch(`/api/admin/editions/${editionId}/judges/${judgeId}`, { method: 'DELETE' });
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}
</script>

<template>
  <div v-if="edition" class="space-y-6">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-xs text-slate-400">
      <NuxtLink to="/admin/contests" class="hover:text-emerald-400 transition">Concursos</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/admin/contests/${edition.contestId}`" class="hover:text-emerald-400 transition">{{ edition.contest?.name }}</NuxtLink>
      <span>/</span>
      <span class="text-slate-200 font-medium">Edición {{ edition.name }}</span>
    </div>

    <!-- Edition Header Banner -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div>
        <div class="flex items-center gap-3 mb-2">
          <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {{ edition.contest?.name }} &bull; Edición {{ edition.name }}
          </h1>
          <UBadge
            :color="edition.status === 'active' ? 'success' : edition.status === 'finished' ? 'neutral' : 'warning'"
            variant="subtle"
            size="md"
          >
            {{ edition.status === 'active' ? 'Edición Activa' : edition.status === 'finished' ? 'Finalizada' : 'En Borrador' }}
          </UBadge>
        </div>

        <div class="flex flex-wrap gap-4 text-xs text-slate-400 mt-3">
          <div class="flex items-center gap-1.5">
            <UIcon name="lucide:calculator" class="w-4 h-4 text-emerald-400" />
            <span>Puntaje: <strong class="text-slate-200 capitalize">{{ edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="lucide:layers" class="w-4 h-4 text-emerald-400" />
            <span>Acumulado: <strong class="text-slate-200">{{ edition.accumulateRounds ? 'Sí (Promedio)' : 'No (Cada ronda parte de cero)' }}</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="lucide:sliders" class="w-4 h-4 text-emerald-400" />
            <span>Escala: <strong class="text-slate-200">[{{ edition.scaleMin }} a {{ edition.scaleMax }}]</strong></span>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="lucide:globe" class="w-4 h-4 text-emerald-400" />
            <span>Resultados: <strong class="text-slate-200">{{ edition.resultsPublic ? 'Públicos' : 'Privados' }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-3">
        <UButton
          v-if="edition.status === 'draft'"
          color="primary"
          icon="lucide:play"
          size="md"
          :loading="loadingAction"
          @click="activateEdition"
        >
          Activar Edición
        </UButton>

        <UButton
          v-if="edition.status === 'active'"
          color="error"
          variant="outline"
          icon="lucide:check-circle"
          size="md"
          :loading="loadingAction"
          @click="finishEdition"
        >
          Finalizar Certamen
        </UButton>

        <UButton
          variant="outline"
          color="neutral"
          :icon="edition.resultsPublic ? 'lucide:eye-off' : 'lucide:eye'"
          size="md"
          :loading="loadingAction"
          @click="togglePublicResults"
        >
          {{ edition.resultsPublic ? 'Ocultar al Público' : 'Hacer Público' }}
        </UButton>

        <NuxtLink
          v-if="edition.status === 'finished' && edition.resultsPublic"
          :to="`/results/${edition.contestId}/${edition.id}`"
          target="_blank"
        >
          <UButton color="success" icon="lucide:external-link" size="md">
            Ver Página Pública
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="errorMsg" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-400 text-sm">
      <div class="flex items-center gap-2">
        <UIcon name="lucide:alert-circle" class="w-5 h-5 flex-shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>
      <UButton variant="ghost" color="rose" size="xs" icon="lucide:x" @click="errorMsg = ''" />
    </div>

    <div v-if="successMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-emerald-400 text-sm">
      <div class="flex items-center gap-2">
        <UIcon name="lucide:check-circle" class="w-5 h-5 flex-shrink-0" />
        <span>{{ successMsg }}</span>
      </div>
      <UButton variant="ghost" color="emerald" size="xs" icon="lucide:x" @click="successMsg = ''" />
    </div>

    <!-- Judge Credentials Created Alert -->
    <div v-if="createdJudgeInfo" class="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-200 text-sm flex items-center justify-between">
      <div>
        <h4 class="font-bold flex items-center gap-2">
          <UIcon name="lucide:key" class="w-4 h-4 text-amber-400" />
          ¡Cuenta de Juez Registrada! Entrega estas credenciales:
        </h4>
        <p class="mt-1 font-mono text-xs">
          Usuario: <strong class="text-white">{{ createdJudgeInfo.email }}</strong> |
          Contraseña temporal: <strong class="text-amber-300">{{ createdJudgeInfo.pass }}</strong>
        </p>
      </div>
      <UButton variant="ghost" color="emerald" size="xs" icon="lucide:x" @click="createdJudgeInfo = null" />
    </div>

    <!-- Tabs Navigation -->
    <div class="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
      <button
        @click="activeTab = 'rounds'"
        class="px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap"
        :class="activeTab === 'rounds' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <UIcon name="lucide:layers" class="w-4 h-4" />
        Rondas ({{ edition.rounds?.length || 0 }})
      </button>

      <button
        @click="activeTab = 'participants'"
        class="px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap"
        :class="activeTab === 'participants' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <UIcon name="lucide:users" class="w-4 h-4" />
        Participantes ({{ edition.participants?.length || 0 }})
      </button>

      <button
        @click="activeTab = 'criteria'"
        class="px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap"
        :class="activeTab === 'criteria' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <UIcon name="lucide:list-checks" class="w-4 h-4" />
        Criterios ({{ edition.criteria?.length || 0 }})
        <UBadge :color="isCriteriaWeightValid ? 'success' : 'warning'" size="xs" variant="subtle">
          {{ totalCriteriaWeight }}%
        </UBadge>
      </button>

      <button
        @click="activeTab = 'judges'"
        class="px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap"
        :class="activeTab === 'judges' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <UIcon name="lucide:user-check" class="w-4 h-4" />
        Jueces ({{ edition.judges?.length || 0 }})
      </button>

      <button
        @click="activeTab = 'awards'"
        class="px-4 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition whitespace-nowrap"
        :class="activeTab === 'awards' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
      >
        <UIcon name="lucide:award" class="w-4 h-4" />
        Premios Especiales ({{ edition.awards?.length || 0 }})
      </button>
    </div>

    <!-- TAB 1: RONDAS -->
    <div v-if="activeTab === 'rounds'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white">Rondas de la Edición</h2>
          <p class="text-xs text-slate-400">Las rondas se ejecutan secuencialmente según su posición</p>
        </div>
        <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddRoundModalOpen = true">
          Añadir Ronda
        </UButton>
      </div>

      <div class="space-y-4">
        <div
          v-for="r in edition.rounds"
          :key="r.id"
          class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition"
        >
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-emerald-400 flex-shrink-0">
              {{ r.position }}
            </div>
            <div>
              <div class="flex items-center gap-3">
                <h3 class="text-xl font-bold text-white">{{ r.name }}</h3>
                <UBadge
                  :color="r.status === 'open' ? 'success' : r.status === 'closed' ? 'neutral' : 'warning'"
                  variant="subtle"
                  size="sm"
                >
                  {{ r.status === 'open' ? 'Abierta para Votar' : r.status === 'closed' ? 'Cerrada' : 'Pendiente' }}
                </UBadge>
              </div>
              <div class="flex flex-wrap gap-4 text-xs text-slate-400 mt-2">
                <span>Modo de Avance: <strong class="text-slate-200">{{ r.advanceMode === 'top_n' ? `Top ${r.advanceValue}` : `Puntaje mín: ${r.advanceValue}` }}</strong></span>
                <span v-if="r.closedWithMissingJudges" class="text-amber-400 font-semibold flex items-center gap-1">
                  <UIcon name="lucide:alert-triangle" class="w-3.5 h-3.5" />
                  Cerrada con jueces ausentes
                </span>
                <span v-if="r.closedAt">Cerrada el: {{ new Date(r.closedAt).toLocaleTimeString() }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <UButton
              v-if="r.status === 'pending'"
              color="primary"
              size="sm"
              icon="lucide:play"
              :loading="loadingAction"
              @click="openRound(r.id)"
            >
              Abrir Ronda
            </UButton>

            <NuxtLink :to="`/admin/rounds/${r.id}/monitor`">
              <UButton
                :variant="r.status === 'open' ? 'solid' : 'outline'"
                :color="r.status === 'open' ? 'primary' : 'neutral'"
                size="sm"
                icon="lucide:activity"
              >
                {{ r.status === 'closed' ? 'Ver Resultados' : 'Monitor en Vivo' }}
              </UButton>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: PARTICIPANTES -->
    <div v-if="activeTab === 'participants'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white">Participantes Registrados</h2>
          <p class="text-xs text-slate-400">Compiten en la edición y clasifican entre rondas</p>
        </div>
        <UButton color="primary" size="sm" icon="lucide:user-plus" @click="isAddParticipantModalOpen = true">
          Registrar Participante
        </UButton>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-6 py-4">Código / #</th>
              <th class="px-6 py-4">Nombre Completo</th>
              <th class="px-6 py-4">Estado</th>
              <th class="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-for="p in edition.participants" :key="p.id" class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-mono font-bold text-emerald-400">{{ p.code }}</td>
              <td class="px-6 py-4 font-medium text-white">{{ p.name }}</td>
              <td class="px-6 py-4">
                <UBadge
                  :color="p.status === 'winner' ? 'primary' : p.status === 'eliminated' ? 'error' : 'success'"
                  variant="subtle"
                  size="xs"
                >
                  {{ p.status === 'winner' ? 'Ganadora' : p.status === 'eliminated' ? 'Eliminada' : 'Activa' }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-right">
                <UButton variant="ghost" color="error" size="xs" icon="lucide:trash" @click="deleteParticipant(p.id)" />
              </td>
            </tr>
            <tr v-if="!edition.participants || edition.participants.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-slate-500">
                No hay participantes registrados todavía.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: CRITERIOS -->
    <div v-if="activeTab === 'criteria'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white">Criterios de Calificación</h2>
          <p class="text-xs text-slate-400">La suma total de ponderaciones debe ser exactamente 100%</p>
        </div>
        <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddCriterionModalOpen = true">
          Añadir Criterio
        </UButton>
      </div>

      <!-- Sum indicator bar -->
      <div class="p-4 bg-slate-900 border rounded-2xl flex items-center justify-between gap-4" :class="isCriteriaWeightValid ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-amber-500/40 bg-amber-950/20'">
        <div class="flex items-center gap-3">
          <UIcon :name="isCriteriaWeightValid ? 'lucide:check-circle' : 'lucide:alert-circle'" class="w-6 h-6" :class="isCriteriaWeightValid ? 'text-emerald-400' : 'text-amber-400'" />
          <div>
            <div class="text-sm font-bold" :class="isCriteriaWeightValid ? 'text-emerald-300' : 'text-amber-300'">
              {{ isCriteriaWeightValid ? 'Configuración de criterios válida (Suma: 100%)' : `Suma de ponderaciones actual: ${totalCriteriaWeight}% (Debe ser 100%)` }}
            </div>
            <div class="text-xs text-slate-400">No se podrá abrir ninguna ronda hasta que los criterios sumen exactamente 100%.</div>
          </div>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-6 py-4">Nombre del Criterio</th>
              <th class="px-6 py-4">Ponderación (%)</th>
              <th class="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-for="c in edition.criteria" :key="c.id" class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-medium text-white">{{ c.name }}</td>
              <td class="px-6 py-4 font-mono font-bold text-emerald-400">{{ Number(c.weight) }}%</td>
              <td class="px-6 py-4 text-right">
                <UButton variant="ghost" color="error" size="xs" icon="lucide:trash" @click="deleteCriterion(c.id)" />
              </td>
            </tr>
            <tr v-if="!edition.criteria || edition.criteria.length === 0">
              <td colspan="3" class="px-6 py-8 text-center text-slate-500">
                No hay criterios configurados aún.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 4: JUECES -->
    <div v-if="activeTab === 'judges'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white">Panel de Jueces Calificadores</h2>
          <p class="text-xs text-slate-400">Genera o asigna jueces para calificar el certamen</p>
        </div>
        <UButton color="primary" size="sm" icon="lucide:user-plus" @click="isAddJudgeModalOpen = true">
          Crear / Asignar Juez
        </UButton>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th class="px-6 py-4">Nombre</th>
              <th class="px-6 py-4">Correo Electrónico</th>
              <th class="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-for="j in edition.judges" :key="j.id" class="hover:bg-slate-800/30 transition">
              <td class="px-6 py-4 font-medium text-white">{{ j.name }}</td>
              <td class="px-6 py-4 font-mono text-slate-300">{{ j.email }}</td>
              <td class="px-6 py-4 text-right">
                <UButton variant="ghost" color="error" size="xs" icon="lucide:user-x" @click="unassignJudge(j.id)" />
              </td>
            </tr>
            <tr v-if="!edition.judges || edition.judges.length === 0">
              <td colspan="3" class="px-6 py-8 text-center text-slate-500">
                No hay jueces asignados a esta edición.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 5: PREMIOS ESPECIALES -->
    <div v-if="activeTab === 'awards'" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white">Premios Especiales</h2>
          <p class="text-xs text-slate-400">Premios independientes del ganador del certamen (por criterio, métricas de redes o manuales)</p>
        </div>
        <NuxtLink :to="`/admin/editions/${edition.id}/awards`">
          <UButton color="primary" size="sm" icon="lucide:external-link">
            Gestionar Premios y Métricas
          </UButton>
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="aw in edition.awards" :key="aw.id" class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-bold text-white">{{ aw.name }}</h3>
            <UBadge color="neutral" size="xs" variant="subtle" class="capitalize">{{ aw.type }}</UBadge>
          </div>
          <p class="text-xs text-slate-400 mb-4">
            Tipo: {{ aw.type === 'criterion' ? 'Promedio de Criterios Vinculados' : aw.type === 'metric' ? `Métrica Manual (${aw.metricLabel || 'Puntos'})` : 'Elección Discrecional' }}
          </p>
          <NuxtLink :to="`/admin/editions/${edition.id}/awards`">
            <UButton variant="ghost" color="primary" size="xs" trailing-icon="lucide:chevron-right">
              Ver Resultados y Ganadores
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- MODAL AÑADIR RONDA -->
    <UModal v-model:open="isAddRoundModalOpen" title="Añadir Nueva Ronda">
      <template #body>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre de la Ronda</label>
            <UInput v-model="newRound.name" placeholder="Ej. Semifinal, Traje de Noche" class="w-full" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Modo de Avance</label>
              <select v-model="newRound.advanceMode" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100">
                <option value="top_n">Top N (Puestos fijos)</option>
                <option value="min_score">Puntaje Mínimo</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Valor de Avance</label>
              <UInput v-model.number="newRound.advanceValue" type="number" step="0.5" class="w-full" />
            </div>
          </div>
          <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="isAddRoundModalOpen = false">Cancelar</UButton>
            <UButton color="primary" @click="handleCreateRound">Crear Ronda</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL REGISTRAR PARTICIPANTE -->
    <UModal v-model:open="isAddParticipantModalOpen" title="Registrar Participante">
      <template #body>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Código / Número</label>
            <UInput v-model="newParticipant.code" placeholder="Ej. 01, C-05" class="w-full" required />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre Completo</label>
            <UInput v-model="newParticipant.name" placeholder="Nombre y Apellidos" class="w-full" required />
          </div>
          <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="isAddParticipantModalOpen = false">Cancelar</UButton>
            <UButton color="primary" @click="handleCreateParticipant">Registrar</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL AÑADIR CRITERIO -->
    <UModal v-model:open="isAddCriterionModalOpen" title="Añadir Criterio de Calificación">
      <template #body>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre del Criterio</label>
            <UInput v-model="newCriterion.name" placeholder="Ej. Pasarela, Belleza Integral, Entrevista" class="w-full" required />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Ponderación (%)</label>
            <UInput v-model.number="newCriterion.weight" type="number" min="1" max="100" class="w-full" required />
          </div>
          <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="isAddCriterionModalOpen = false">Cancelar</UButton>
            <UButton color="primary" @click="handleCreateCriterion">Añadir Criterio</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- MODAL CREAR / ASIGNAR JUEZ -->
    <UModal v-model:open="isAddJudgeModalOpen" title="Registrar o Asignar Juez">
      <template #body>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre del Juez</label>
            <UInput v-model="newJudge.name" placeholder="Ej. Lic. Carlos Méndez" class="w-full" required />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Correo Electrónico (Usuario de acceso)</label>
            <UInput v-model="newJudge.email" type="email" placeholder="juez1@concurso.com" class="w-full" required />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Contraseña Temporal Generada</label>
            <UInput v-model="newJudge.password" class="w-full font-mono" required />
          </div>
          <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="isAddJudgeModalOpen = false">Cancelar</UButton>
            <UButton color="primary" @click="handleCreateJudge">Registrar y Asignar</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
