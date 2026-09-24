<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const editionId = route.params.id as string;

const { data: edition, status, refresh } = await useFetch(`/api/admin/editions/${editionId}`);

const activeTab = ref('rounds');
const errorMsg = ref('');
const successMsg = ref('');
const loadingAction = ref(false);

// Modales
const isAddRoundModalOpen = ref(false);
const isAddParticipantModalOpen = ref(false);
const isAddCriterionModalOpen = ref(false);
const isAddJudgeModalOpen = ref(false);

// Opciones de avance
const advanceModeOptions = [
  { label: 'Top N (Puestos fijos)', value: 'top_n' },
  { label: 'Puntaje Mínimo requerido', value: 'min_score' },
];

// ZOD SCHEMAS & FORMS
const roundSchema = z.object({
  name: z.string().min(1, 'El nombre de la ronda es obligatorio'),
  advanceMode: z.enum(['top_n', 'min_score']),
  advanceValue: z.number().min(0.1, 'Debe ser mayor a 0'),
});
type RoundSchema = z.output<typeof roundSchema>;
const roundState = reactive<RoundSchema>({
  name: '',
  advanceMode: 'top_n',
  advanceValue: 3,
});

const participantSchema = z.object({
  code: z.string().min(1, 'El código o número es obligatorio'),
  name: z.string().min(1, 'El nombre completo es obligatorio'),
});
type ParticipantSchema = z.output<typeof participantSchema>;
const participantState = reactive<ParticipantSchema>({
  code: '',
  name: '',
});

const criterionSchema = z.object({
  name: z.string().min(1, 'El nombre del criterio es obligatorio'),
  weight: z.number().min(1, 'Mínimo 1%').max(100, 'Máximo 100%'),
});
type CriterionSchema = z.output<typeof criterionSchema>;
const criterionState = reactive<CriterionSchema>({
  name: '',
  weight: 25,
});

const judgeSchema = z.object({
  name: z.string().min(1, 'El nombre del juez es obligatorio'),
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
type JudgeSchema = z.output<typeof judgeSchema>;
const judgeState = reactive<JudgeSchema>({
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

// Handlers de modales con Zod FormSubmitEvent
async function handleCreateRound(event: FormSubmitEvent<RoundSchema>) {
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/editions/${editionId}/rounds`, {
      method: 'POST',
      body: {
        name: event.data.name,
        advanceMode: event.data.advanceMode,
        advanceValue: Number(event.data.advanceValue),
      },
    });
    roundState.name = '';
    isAddRoundModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

async function handleCreateParticipant(event: FormSubmitEvent<ParticipantSchema>) {
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/editions/${editionId}/participants`, {
      method: 'POST',
      body: {
        name: event.data.name,
        code: event.data.code,
      },
    });
    participantState.name = '';
    participantState.code = '';
    isAddParticipantModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

async function handleCreateCriterion(event: FormSubmitEvent<CriterionSchema>) {
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/editions/${editionId}/criteria`, {
      method: 'POST',
      body: {
        name: event.data.name,
        weight: Number(event.data.weight),
      },
    });
    criterionState.name = '';
    isAddCriterionModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  }
}

async function handleCreateJudge(event: FormSubmitEvent<JudgeSchema>) {
  errorMsg.value = '';
  try {
    const res = await $fetch(`/api/admin/editions/${editionId}/judges`, {
      method: 'POST',
      body: {
        name: event.data.name,
        email: event.data.email,
        password: event.data.password,
      },
    });

    createdJudgeInfo.value = {
      email: res.email,
      pass: res.tempPassword,
    };

    judgeState.name = '';
    judgeState.email = '';
    judgeState.password = 'Juez' + Math.floor(1000 + Math.random() * 9000) + '!';
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
  <div>
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-60 rounded" />
      <USkeleton class="h-40 w-full rounded-3xl" />
      <div class="flex gap-4">
        <USkeleton v-for="i in 5" :key="i" class="h-10 w-28 rounded-xl" />
      </div>
      <USkeleton class="h-72 w-full rounded-3xl" />
    </div>

    <!-- MAIN HUB -->
    <div v-else-if="edition" class="space-y-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <NuxtLink to="/admin/contests" class="hover:text-emerald-400 transition">Concursos</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/admin/contests/${edition.contestId}`" class="hover:text-emerald-400 transition">{{ edition.contest?.name }}</NuxtLink>
        <span>/</span>
        <span class="text-slate-200 font-medium">Edición {{ edition.name }}</span>
      </div>

      <!-- Edition Header Banner -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl backdrop-blur-md">
        <div>
          <div class="flex flex-wrap items-center gap-3 mb-2">
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
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
              <span>Acumulado: <strong class="text-slate-200">{{ edition.accumulateRounds ? 'Sí (Promedio)' : 'No (Desde cero)' }}</strong></span>
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
              Ver Resultados Oficiales
            </UButton>
          </NuxtLink>
        </div>
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

      <!-- Judge Credentials Alert -->
      <div v-if="createdJudgeInfo">
        <UAlert
          color="warning"
          variant="subtle"
          title="¡Cuenta de Juez Registrada! Entrega estas credenciales:"
          :description="`Usuario: ${createdJudgeInfo.email} | Contraseña temporal: ${createdJudgeInfo.pass}`"
          icon="lucide:key"
          :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
          @close="createdJudgeInfo = null"
        />
      </div>

      <!-- Criteria Balance Alert in Criteria View or Top -->
      <div v-if="activeTab === 'criteria'">
        <UAlert
          v-if="!isCriteriaWeightValid"
          color="warning"
          variant="subtle"
          title="Ponderación Desbalanceada"
          :description="`La suma actual de los criterios es ${totalCriteriaWeight}%. Debe ser exactamente 100% para que las evaluaciones sean matemáticamente precisas.`"
          icon="lucide:alert-triangle"
        />
        <UAlert
          v-else
          color="success"
          variant="subtle"
          title="Ponderación Perfecta"
          description="La suma de ponderaciones está balanceada exactamente al 100%."
          icon="lucide:check-circle"
        />
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
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white">Rondas de la Edición</h2>
            <p class="text-xs text-slate-400">Las rondas se ejecutan secuencialmente según su posición</p>
          </div>
          <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddRoundModalOpen = true">
            Añadir Ronda
          </UButton>
        </div>

        <!-- Empty State Rondas -->
        <div
          v-if="!edition.rounds || edition.rounds.length === 0"
          class="text-center py-12 px-4 bg-slate-900/40 border border-slate-800 rounded-3xl"
        >
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <UIcon name="lucide:layers" class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-white">No hay rondas configuradas</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Añade al menos una ronda (ej. "Final" o "Semifinal") para poder recibir calificaciones de los jueces.
          </p>
          <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddRoundModalOpen = true">
            Añadir Primera Ronda
          </UButton>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="r in edition.rounds"
            :key="r.id"
            class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-700 transition"
          >
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-emerald-400 flex-shrink-0">
                {{ r.position }}
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2.5">
                  <h3 class="text-xl font-bold text-white">{{ r.name }}</h3>
                  <UBadge
                    :color="r.status === 'open' ? 'success' : r.status === 'closed' ? 'neutral' : 'warning'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ r.status === 'open' ? 'Abierta para Votar' : r.status === 'closed' ? 'Cerrada' : 'Pendiente' }}
                  </UBadge>
                </div>
                <div class="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                  <span>Modo Avance: <strong class="text-slate-200">{{ r.advanceMode === 'top_n' ? `Top ${r.advanceValue}` : `Mínimo ${r.advanceValue} pts` }}</strong></span>
                  <span>Participantes: <strong class="text-slate-200">{{ r.roundParticipants?.length || 0 }}</strong></span>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UButton
                v-if="r.status === 'pending'"
                color="primary"
                size="sm"
                icon="lucide:play"
                :loading="loadingAction"
                @click="openRound(r.id)"
              >
                Abrir Votación
              </UButton>

              <NuxtLink :to="`/admin/rounds/${r.id}/monitor`">
                <UButton
                  :color="r.status === 'open' ? 'success' : 'neutral'"
                  :variant="r.status === 'open' ? 'solid' : 'outline'"
                  size="sm"
                  icon="lucide:activity"
                >
                  {{ r.status === 'open' ? 'Monitor en Vivo' : 'Ver Resultados' }}
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: PARTICIPANTES -->
      <div v-if="activeTab === 'participants'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white">Participantes Registrados</h2>
            <p class="text-xs text-slate-400">Candidatas o participantes asignados a esta edición</p>
          </div>
          <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddParticipantModalOpen = true">
            Registrar Participante
          </UButton>
        </div>

        <!-- Empty State Participantes -->
        <div
          v-if="!edition.participants || edition.participants.length === 0"
          class="text-center py-12 px-4 bg-slate-900/40 border border-slate-800 rounded-3xl"
        >
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <UIcon name="lucide:users" class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-white">No hay participantes registrados</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Registra los participantes con su código y nombre completo para habilitar la calificación.
          </p>
          <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddParticipantModalOpen = true">
            Registrar Primer Participante
          </UButton>
        </div>

        <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
          <table class="w-full text-left text-sm min-w-[500px]">
            <thead class="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th class="px-6 py-4">Código</th>
                <th class="px-6 py-4">Nombre Completo</th>
                <th class="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="p in edition.participants" :key="p.id" class="hover:bg-slate-800/30 transition">
                <td class="px-6 py-4 font-mono font-bold text-emerald-400">{{ p.code }}</td>
                <td class="px-6 py-4 font-semibold text-white">{{ p.name }}</td>
                <td class="px-6 py-4 text-right">
                  <UButton variant="ghost" color="error" size="xs" icon="lucide:trash-2" @click="deleteParticipant(p.id)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: CRITERIOS -->
      <div v-if="activeTab === 'criteria'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white">Criterios de Evaluación</h2>
            <p class="text-xs text-slate-400">Aspectos a evaluar con sus respectivas ponderaciones porcentuales</p>
          </div>
          <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddCriterionModalOpen = true">
            Añadir Criterio
          </UButton>
        </div>

        <!-- Empty State Criterios -->
        <div
          v-if="!edition.criteria || edition.criteria.length === 0"
          class="text-center py-12 px-4 bg-slate-900/40 border border-slate-800 rounded-3xl"
        >
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <UIcon name="lucide:list-checks" class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-white">No hay criterios de evaluación</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Añade criterios como "Pasarela", "Belleza Integral" o "Entrevista" cuya suma dé 100%.
          </p>
          <UButton color="primary" size="sm" icon="lucide:plus" @click="isAddCriterionModalOpen = true">
            Añadir Primer Criterio
          </UButton>
        </div>

        <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
          <table class="w-full text-left text-sm min-w-[500px]">
            <thead class="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th class="px-6 py-4">Nombre del Criterio</th>
                <th class="px-6 py-4">Ponderación (%)</th>
                <th class="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="c in edition.criteria" :key="c.id" class="hover:bg-slate-800/30 transition">
                <td class="px-6 py-4 font-semibold text-white">{{ c.name }}</td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-400">{{ Number(c.weight) }}%</td>
                <td class="px-6 py-4 text-right">
                  <UButton variant="ghost" color="error" size="xs" icon="lucide:trash-2" @click="deleteCriterion(c.id)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 4: JUECES -->
      <div v-if="activeTab === 'judges'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white">Jueces Calificadores</h2>
            <p class="text-xs text-slate-400">Jueces autorizados para acceder y calificar esta edición</p>
          </div>
          <UButton color="primary" size="sm" icon="lucide:user-plus" @click="isAddJudgeModalOpen = true">
            Registrar / Asignar Juez
          </UButton>
        </div>

        <!-- Empty State Jueces -->
        <div
          v-if="!edition.judges || edition.judges.length === 0"
          class="text-center py-12 px-4 bg-slate-900/40 border border-slate-800 rounded-3xl"
        >
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <UIcon name="lucide:user-check" class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-white">No hay jueces asignados</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Registra jueces calificadores para que puedan acceder a la cabina con sus credenciales seguras.
          </p>
          <UButton color="primary" size="sm" icon="lucide:user-plus" @click="isAddJudgeModalOpen = true">
            Registrar Primer Juez
          </UButton>
        </div>

        <div v-else class="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
          <table class="w-full text-left text-sm min-w-[500px]">
            <thead class="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th class="px-6 py-4">Nombre</th>
                <th class="px-6 py-4">Correo Electrónico</th>
                <th class="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="j in edition.judges" :key="j.id" class="hover:bg-slate-800/30 transition">
                <td class="px-6 py-4 font-semibold text-white">{{ j.name }}</td>
                <td class="px-6 py-4 font-mono text-slate-300 text-xs">{{ j.email }}</td>
                <td class="px-6 py-4 text-right">
                  <UButton variant="ghost" color="error" size="xs" icon="lucide:user-x" @click="unassignJudge(j.id)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 5: PREMIOS ESPECIALES -->
      <div v-if="activeTab === 'awards'" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white">Premios Especiales</h2>
            <p class="text-xs text-slate-400">Premios independientes de la ganadora principal del certamen</p>
          </div>
          <NuxtLink :to="`/admin/editions/${edition.id}/awards`">
            <UButton color="primary" size="sm" icon="lucide:external-link">
              Gestionar Premios y Métricas
            </UButton>
          </NuxtLink>
        </div>

        <div
          v-if="!edition.awards || edition.awards.length === 0"
          class="text-center py-12 px-4 bg-slate-900/40 border border-slate-800 rounded-3xl"
        >
          <div class="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <UIcon name="lucide:award" class="w-7 h-7" />
          </div>
          <h3 class="text-base font-bold text-white">No hay premios especiales configurados</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Crea premios especiales como "Miss Fotogénica", "Mejor Rostro" o premios por métricas de redes sociales.
          </p>
          <NuxtLink :to="`/admin/editions/${edition.id}/awards`">
            <UButton color="primary" size="sm" icon="lucide:plus">
              Crear Primer Premio Especial
            </UButton>
          </NuxtLink>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="aw in edition.awards" :key="aw.id" class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-bold text-white">{{ aw.name }}</h3>
                <UBadge color="neutral" size="xs" variant="subtle" class="capitalize">{{ aw.type }}</UBadge>
              </div>
              <p class="text-xs text-slate-400 mb-4">
                Tipo: {{ aw.type === 'criterion' ? 'Promedio de Criterios Vinculados' : aw.type === 'metric' ? `Métrica Manual (${aw.metricLabel || 'Puntos'})` : 'Elección Discrecional' }}
              </p>
            </div>
            <NuxtLink :to="`/admin/editions/${edition.id}/awards`">
              <UButton variant="ghost" color="primary" size="xs" trailing-icon="lucide:chevron-right">
                Ver Resultados y Ganadores
              </UButton>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- MODAL AÑADIR RONDA (UForm + Zod) -->
      <UModal v-model:open="isAddRoundModalOpen" title="Añadir Nueva Ronda">
        <template #body>
          <div class="p-6">
            <UForm :schema="roundSchema" :state="roundState" class="space-y-4" @submit="handleCreateRound">
              <UFormField label="Nombre de la Ronda" name="name" description="Ej. Semifinal, Traje de Noche, Gran Final" required>
                <UInput v-model="roundState.name" placeholder="Nombre de la ronda" class="w-full" size="md" icon="lucide:layers" />
              </UFormField>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="Modo de Avance" name="advanceMode" description="Criterio de clasificación">
                  <USelect v-model="roundState.advanceMode" :items="advanceModeOptions" class="w-full" />
                </UFormField>

                <UFormField label="Valor de Avance" name="advanceValue" description="Cantidad clasificados o puntaje">
                  <UInput v-model.number="roundState.advanceValue" type="number" step="0.5" class="w-full" />
                </UFormField>
              </div>

              <div class="pt-5 border-t border-slate-800 flex justify-end gap-3">
                <UButton variant="ghost" color="neutral" @click="isAddRoundModalOpen = false">Cancelar</UButton>
                <UButton type="submit" color="primary" icon="lucide:check">Crear Ronda</UButton>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>

      <!-- MODAL REGISTRAR PARTICIPANTE (UForm + Zod) -->
      <UModal v-model:open="isAddParticipantModalOpen" title="Registrar Participante">
        <template #body>
          <div class="p-6">
            <UForm :schema="participantSchema" :state="participantState" class="space-y-4" @submit="handleCreateParticipant">
              <UFormField label="Código o Número" name="code" description="Identificador único en el certamen (ej. 01, C-05)" required>
                <UInput v-model="participantState.code" placeholder="01" class="w-full" size="md" icon="lucide:hash" />
              </UFormField>

              <UFormField label="Nombre Completo" name="name" description="Nombre y Apellidos del concursante" required>
                <UInput v-model="participantState.name" placeholder="Nombre y Apellidos" class="w-full" size="md" icon="lucide:user" />
              </UFormField>

              <div class="pt-5 border-t border-slate-800 flex justify-end gap-3">
                <UButton variant="ghost" color="neutral" @click="isAddParticipantModalOpen = false">Cancelar</UButton>
                <UButton type="submit" color="primary" icon="lucide:check">Registrar Participante</UButton>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>

      <!-- MODAL AÑADIR CRITERIO (UForm + Zod) -->
      <UModal v-model:open="isAddCriterionModalOpen" title="Añadir Criterio de Evaluación">
        <template #body>
          <div class="p-6">
            <UForm :schema="criterionSchema" :state="criterionState" class="space-y-4" @submit="handleCreateCriterion">
              <UFormField label="Nombre del Criterio" name="name" description="Ej. Pasarela, Belleza Integral, Entrevista" required>
                <UInput v-model="criterionState.name" placeholder="Nombre del criterio" class="w-full" size="md" icon="lucide:list-checks" />
              </UFormField>

              <UFormField label="Ponderación (%)" name="weight" description="Porcentaje sobre la calificación final (1 a 100%)" required>
                <UInput v-model.number="criterionState.weight" type="number" min="1" max="100" class="w-full" size="md" icon="lucide:percent" />
              </UFormField>

              <div class="pt-5 border-t border-slate-800 flex justify-end gap-3">
                <UButton variant="ghost" color="neutral" @click="isAddCriterionModalOpen = false">Cancelar</UButton>
                <UButton type="submit" color="primary" icon="lucide:check">Añadir Criterio</UButton>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>

      <!-- MODAL CREAR / ASIGNAR JUEZ (UForm + Zod) -->
      <UModal v-model:open="isAddJudgeModalOpen" title="Registrar o Asignar Juez">
        <template #body>
          <div class="p-6">
            <UForm :schema="judgeSchema" :state="judgeState" class="space-y-4" @submit="handleCreateJudge">
              <UFormField label="Nombre del Juez" name="name" description="Nombre y título profesional" required>
                <UInput v-model="judgeState.name" placeholder="Lic. Carlos Méndez" class="w-full" size="md" icon="lucide:user" />
              </UFormField>

              <UFormField label="Correo Electrónico" name="email" description="Será su usuario de acceso al sistema" required>
                <UInput v-model="judgeState.email" type="email" placeholder="juez1@concurso.com" class="w-full" size="md" icon="lucide:mail" />
              </UFormField>

              <UFormField label="Contraseña Temporal Generada" name="password" description="El juez podrá iniciar sesión con esta contraseña" required>
                <UInput v-model="judgeState.password" class="w-full font-mono" size="md" icon="lucide:key" />
              </UFormField>

              <div class="pt-5 border-t border-slate-800 flex justify-end gap-3">
                <UButton variant="ghost" color="neutral" @click="isAddJudgeModalOpen = false">Cancelar</UButton>
                <UButton type="submit" color="primary" icon="lucide:check">Registrar y Asignar</UButton>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
