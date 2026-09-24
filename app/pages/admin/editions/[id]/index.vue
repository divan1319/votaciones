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

useHead({
  title: () => edition.value ? `Edición ${edition.value.name} · ${edition.value.contest?.name}` : 'Gestión de Edición',
});

const activeTab = ref('rounds');
const errorMsg = ref('');
const successMsg = ref('');
const loadingAction = ref(false);

// Modales
const isAddRoundModalOpen = ref(false);
const isAddParticipantModalOpen = ref(false);
const isAddCriterionModalOpen = ref(false);
const isAddJudgeModalOpen = ref(false);

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

const createdJudgeInfo = ref<{ email: string; pass: string } | null>(null);

const totalCriteriaWeight = computed(() => {
  if (!edition.value?.criteria) return 0;
  return edition.value.criteria.reduce((acc: number, c: any) => acc + Number(c.weight), 0);
});

const isCriteriaWeightValid = computed(() => {
  return Math.abs(totalCriteriaWeight.value - 100) < 0.01;
});

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
  if (!confirm('¿Estás seguro de finalizar la edición? Se cerrará el certamen de forma oficial.')) return;
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
  <div class="space-y-6">
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-60 rounded-none" />
      <USkeleton class="h-32 w-full rounded-none" />
      <div class="flex gap-2">
        <USkeleton v-for="i in 5" :key="i" class="h-10 w-28 rounded-none" />
      </div>
      <USkeleton class="h-64 w-full rounded-none" />
    </div>

    <!-- MAIN HUB -->
    <div v-else-if="edition" class="space-y-6">
      <!-- Carbon Breadcrumb -->
      <div class="flex items-center gap-2 text-xs font-mono text-[#8d8d8d]">
        <NuxtLink to="/admin/contests" class="hover:underline text-[#c6c6c6]">Concursos</NuxtLink>
        <span>/</span>
        <NuxtLink :to="`/admin/contests/${edition.contestId}`" class="hover:underline text-[#c6c6c6]">{{ edition.contest?.name }}</NuxtLink>
        <span>/</span>
        <span class="text-white font-medium">Edición {{ edition.name }}</span>
      </div>

      <!-- Edition Header Toolbar Banner -->
      <div class="carbon-tile p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div class="flex flex-wrap items-center gap-3 mb-2">
            <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {{ edition.contest?.name }} &bull; Edición {{ edition.name }}
            </h1>
            <span
              class="carbon-tag"
              :class="edition.status === 'active' ? 'carbon-tag-green' : edition.status === 'finished' ? 'carbon-tag-gray' : 'carbon-tag-warm'"
            >
              {{ edition.status === 'active' ? 'EDICIÓN ACTIVA' : edition.status === 'finished' ? 'FINALIZADA' : 'BORRADOR' }}
            </span>
          </div>

          <div class="flex flex-wrap gap-4 text-xs font-mono text-[#8d8d8d] mt-3">
            <div>
              <span>PUNTAJE: </span>
              <strong class="text-white uppercase">{{ edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong>
            </div>
            <span>&bull;</span>
            <div>
              <span>ACUMULADO: </span>
              <strong class="text-white">{{ edition.accumulateRounds ? 'Sí (Promedio)' : 'No (Desde cero)' }}</strong>
            </div>
            <span>&bull;</span>
            <div>
              <span>ESCALA: </span>
              <strong class="text-[#78a9ff]">[{{ edition.scaleMin }} &ndash; {{ edition.scaleMax }} pts]</strong>
            </div>
            <span>&bull;</span>
            <div>
              <span>BOLETÍN: </span>
              <strong class="text-white">{{ edition.resultsPublic ? 'PÚBLICO' : 'PRIVADO' }}</strong>
            </div>
          </div>
        </div>

        <!-- Life-Cycle Action Buttons in Carbon Style -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="edition.status === 'draft'"
            @click="activateEdition"
            :disabled="loadingAction"
            class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <UIcon name="lucide:play" class="w-3.5 h-3.5" />
            <span>Activar Edición</span>
          </button>

          <button
            v-if="edition.status === 'active'"
            @click="finishEdition"
            :disabled="loadingAction"
            class="h-9 px-4 bg-[#750e13] hover:bg-[#da1e28] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <UIcon name="lucide:check-circle" class="w-3.5 h-3.5" />
            <span>Finalizar Certamen</span>
          </button>

          <button
            @click="togglePublicResults"
            :disabled="loadingAction"
            class="h-9 px-4 bg-[#262626] hover:bg-[#393939] border border-[#525252] text-[#c6c6c6] hover:text-white text-xs font-semibold tracking-wider flex items-center gap-1.5 transition cursor-pointer"
          >
            <UIcon :name="edition.resultsPublic ? 'lucide:eye-off' : 'lucide:eye'" class="w-3.5 h-3.5 text-[#78a9ff]" />
            <span>{{ edition.resultsPublic ? 'Ocultar Boletín' : 'Hacer Público' }}</span>
          </button>

          <NuxtLink
            v-if="edition.status === 'finished' && edition.resultsPublic"
            :to="`/results/${edition.contestId}/${edition.id}`"
            target="_blank"
          >
            <button class="h-9 px-4 bg-[#0e6027] hover:bg-[#24a148] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition">
              <UIcon name="lucide:external-link" class="w-3.5 h-3.5" />
              <span>Ver Boletín Público</span>
            </button>
          </NuxtLink>
        </div>
      </div>

      <!-- Carbon Notifications (Alerts) -->
      <div v-if="errorMsg" class="p-3.5 bg-[#750e13]/20 border-l-4 border-[#da1e28] text-xs text-[#ff8389] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="lucide:alert-circle" class="w-4 h-4 flex-shrink-0" />
          <span>{{ errorMsg }}</span>
        </div>
        <button @click="errorMsg = ''" class="text-[#ff8389] hover:text-white">✕</button>
      </div>

      <div v-if="successMsg" class="p-3.5 bg-[#0e6027]/20 border-l-4 border-[#24a148] text-xs text-[#42be65] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="lucide:check-circle" class="w-4 h-4 flex-shrink-0" />
          <span>{{ successMsg }}</span>
        </div>
        <button @click="successMsg = ''" class="text-[#42be65] hover:text-white">✕</button>
      </div>

      <!-- Judge Credentials Alert -->
      <div v-if="createdJudgeInfo" class="p-4 bg-[#1c1c1c] border-l-4 border-[#f1c21b] text-xs text-[#c6c6c6] flex items-center justify-between">
        <div class="space-y-1">
          <strong class="text-[#f1c21b] block uppercase font-mono tracking-wider">
            ¡Cuenta de Juez Creada! Entrega estas credenciales:
          </strong>
          <p class="font-mono text-xs">
            Usuario: <span class="text-white font-bold">{{ createdJudgeInfo.email }}</span> |
            Contraseña temporal: <span class="text-[#f1c21b] font-bold">{{ createdJudgeInfo.pass }}</span>
          </p>
        </div>
        <button @click="createdJudgeInfo = null" class="text-[#c6c6c6] hover:text-white">✕</button>
      </div>

      <!-- Criteria Balance Banner in Criteria View -->
      <div v-if="activeTab === 'criteria'">
        <div
          v-if="!isCriteriaWeightValid"
          class="p-3.5 bg-[#f1c21b]/10 border-l-4 border-[#f1c21b] text-xs text-[#f1c21b] flex items-center gap-2 font-mono"
        >
          <UIcon name="lucide:alert-triangle" class="w-4 h-4 flex-shrink-0" />
          <span>ADVERTENCIA: La suma actual es {{ totalCriteriaWeight }}%. Debe ser exactamente 100% para que las evaluaciones sean válidas.</span>
        </div>
        <div
          v-else
          class="p-3.5 bg-[#0e6027]/10 border-l-4 border-[#24a148] text-xs text-[#42be65] flex items-center gap-2 font-mono"
        >
          <UIcon name="lucide:check-circle" class="w-4 h-4 flex-shrink-0" />
          <span>Ponderación balanceada al 100%. Regla matemática de criterios cumplida.</span>
        </div>
      </div>

      <!-- Carbon Flat Tabs Bar -->
      <div class="flex border-b border-[#393939] overflow-x-auto bg-[#161616]">
        <button
          @click="activeTab = 'rounds'"
          class="carbon-tab"
          :class="activeTab === 'rounds' ? 'carbon-tab-active' : ''"
        >
          <UIcon name="lucide:layers" class="w-4 h-4" />
          <span>Rondas ({{ edition.rounds?.length || 0 }})</span>
        </button>

        <button
          @click="activeTab = 'participants'"
          class="carbon-tab"
          :class="activeTab === 'participants' ? 'carbon-tab-active' : ''"
        >
          <UIcon name="lucide:users" class="w-4 h-4" />
          <span>Participantes ({{ edition.participants?.length || 0 }})</span>
        </button>

        <button
          @click="activeTab = 'criteria'"
          class="carbon-tab"
          :class="activeTab === 'criteria' ? 'carbon-tab-active' : ''"
        >
          <UIcon name="lucide:list-checks" class="w-4 h-4" />
          <span>Criterios ({{ edition.criteria?.length || 0 }})</span>
          <span
            class="carbon-tag ml-1"
            :class="isCriteriaWeightValid ? 'carbon-tag-green' : 'carbon-tag-warm'"
          >
            {{ totalCriteriaWeight }}%
          </span>
        </button>

        <button
          @click="activeTab = 'judges'"
          class="carbon-tab"
          :class="activeTab === 'judges' ? 'carbon-tab-active' : ''"
        >
          <UIcon name="lucide:user-check" class="w-4 h-4" />
          <span>Jueces ({{ edition.judges?.length || 0 }})</span>
        </button>

        <button
          @click="activeTab = 'awards'"
          class="carbon-tab"
          :class="activeTab === 'awards' ? 'carbon-tab-active' : ''"
        >
          <UIcon name="lucide:award" class="w-4 h-4" />
          <span>Premios Especiales ({{ edition.awards?.length || 0 }})</span>
        </button>
      </div>

      <!-- TAB 1: RONDAS -->
      <div v-if="activeTab === 'rounds'" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 class="text-base font-bold text-white uppercase tracking-wider font-mono">Fases Eliminatorias</h2>
            <p class="text-xs text-[#8d8d8d]">Ejecución secuencial según posición designada</p>
          </div>
          <button
            @click="isAddRoundModalOpen = true"
            class="h-8 px-3 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <UIcon name="lucide:plus" class="w-3.5 h-3.5" />
            <span>Añadir Ronda</span>
          </button>
        </div>

        <div v-if="!edition.rounds || edition.rounds.length === 0" class="carbon-tile p-8 text-center text-xs text-[#8d8d8d] font-mono">
          No hay rondas configuradas en esta edición. Añade la primera fase.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="r in edition.rounds"
            :key="r.id"
            class="carbon-tile p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 bg-[#161616] border border-[#525252] flex items-center justify-center font-mono font-bold text-sm text-[#78a9ff] flex-shrink-0">
                {{ r.position }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-white">{{ r.name }}</h3>
                  <span
                    class="carbon-tag"
                    :class="r.status === 'open' ? 'carbon-tag-green' : r.status === 'closed' ? 'carbon-tag-gray' : 'carbon-tag-warm'"
                  >
                    {{ r.status === 'open' ? 'ABIERTA' : r.status === 'closed' ? 'CERRADA' : 'PENDIENTE' }}
                  </span>
                </div>
                <div class="text-xs font-mono text-[#8d8d8d] mt-1 flex flex-wrap gap-4">
                  <span>Modo Avance: <strong class="text-white">{{ r.advanceMode === 'top_n' ? `Top ${r.advanceValue}` : `Mínimo ${r.advanceValue} pts` }}</strong></span>
                  <span>Participantes: <strong class="text-white">{{ r.roundParticipants?.length || 0 }}</strong></span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                v-if="r.status === 'pending'"
                @click="openRound(r.id)"
                :disabled="loadingAction"
                class="h-8 px-3 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
              >
                <UIcon name="lucide:play" class="w-3 h-3" />
                <span>Abrir Votación</span>
              </button>

              <NuxtLink :to="`/admin/rounds/${r.id}/monitor`">
                <button
                  class="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer"
                  :class="r.status === 'open' ? 'bg-[#0e6027] hover:bg-[#24a148] text-white border-transparent' : 'bg-[#262626] hover:bg-[#393939] text-[#c6c6c6] border-[#525252]'"
                >
                  <UIcon name="lucide:activity" class="w-3.5 h-3.5" />
                  <span>{{ r.status === 'open' ? 'Monitor en Vivo' : 'Ver Resultados' }}</span>
                </button>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: PARTICIPANTES -->
      <div v-if="activeTab === 'participants'" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 class="text-base font-bold text-white uppercase tracking-wider font-mono">Participantes Registradas</h2>
            <p class="text-xs text-[#8d8d8d]">Nómina oficial de aspirantes en la edición</p>
          </div>
          <button
            @click="isAddParticipantModalOpen = true"
            class="h-8 px-3 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <UIcon name="lucide:plus" class="w-3.5 h-3.5" />
            <span>Registrar Participante</span>
          </button>
        </div>

        <div class="carbon-tile overflow-x-auto">
          <table class="w-full text-left text-xs min-w-[500px]">
            <thead class="carbon-table-header">
              <tr>
                <th class="px-5 py-3">Código</th>
                <th class="px-5 py-3">Nombre Completo</th>
                <th class="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#333333]">
              <tr v-for="p in edition.participants" :key="p.id" class="hover:bg-[#2e2e2e] transition">
                <td class="px-5 py-3 font-mono font-bold text-[#78a9ff]">#{{ p.code }}</td>
                <td class="px-5 py-3 font-medium text-white">{{ p.name }}</td>
                <td class="px-5 py-3 text-right">
                  <button
                    @click="deleteParticipant(p.id)"
                    class="p-1 text-[#ff8389] hover:bg-[#750e13]/30 transition"
                    title="Eliminar participante"
                  >
                    <UIcon name="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </td>
              </tr>
              <tr v-if="!edition.participants || edition.participants.length === 0">
                <td colspan="3" class="px-5 py-8 text-center text-[#8d8d8d] font-mono">
                  No hay participantes registradas en esta edición.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: CRITERIOS -->
      <div v-if="activeTab === 'criteria'" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 class="text-base font-bold text-white uppercase tracking-wider font-mono">Criterios de Evaluación</h2>
            <p class="text-xs text-[#8d8d8d]">Ponderaciones que componen el 100% de la calificación</p>
          </div>
          <button
            @click="isAddCriterionModalOpen = true"
            class="h-8 px-3 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <UIcon name="lucide:plus" class="w-3.5 h-3.5" />
            <span>Añadir Criterio</span>
          </button>
        </div>

        <div class="carbon-tile overflow-x-auto">
          <table class="w-full text-left text-xs min-w-[500px]">
            <thead class="carbon-table-header">
              <tr>
                <th class="px-5 py-3">Criterio</th>
                <th class="px-5 py-3">Ponderación (%)</th>
                <th class="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#333333]">
              <tr v-for="c in edition.criteria" :key="c.id" class="hover:bg-[#2e2e2e] transition">
                <td class="px-5 py-3 font-medium text-white">{{ c.name }}</td>
                <td class="px-5 py-3 font-mono font-bold text-[#78a9ff]">{{ Number(c.weight) }}%</td>
                <td class="px-5 py-3 text-right">
                  <button
                    @click="deleteCriterion(c.id)"
                    class="p-1 text-[#ff8389] hover:bg-[#750e13]/30 transition"
                    title="Eliminar criterio"
                  >
                    <UIcon name="lucide:trash-2" class="w-4 h-4" />
                  </button>
                </td>
              </tr>
              <tr v-if="!edition.criteria || edition.criteria.length === 0">
                <td colspan="3" class="px-5 py-8 text-center text-[#8d8d8d] font-mono">
                  No hay criterios registrados. La suma debe dar 100%.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 4: JUECES -->
      <div v-if="activeTab === 'judges'" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 class="text-base font-bold text-white uppercase tracking-wider font-mono">Jueces Calificadores</h2>
            <p class="text-xs text-[#8d8d8d]">Cuentas autorizadas para emitir calificaciones</p>
          </div>
          <button
            @click="isAddJudgeModalOpen = true"
            class="h-8 px-3 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <UIcon name="lucide:user-plus" class="w-3.5 h-3.5" />
            <span>Registrar Juez</span>
          </button>
        </div>

        <div class="carbon-tile overflow-x-auto">
          <table class="w-full text-left text-xs min-w-[500px]">
            <thead class="carbon-table-header">
              <tr>
                <th class="px-5 py-3">Nombre</th>
                <th class="px-5 py-3">Usuario / Correo Electrónico</th>
                <th class="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#333333]">
              <tr v-for="j in edition.judges" :key="j.id" class="hover:bg-[#2e2e2e] transition">
                <td class="px-5 py-3 font-medium text-white">{{ j.name }}</td>
                <td class="px-5 py-3 font-mono text-[#c6c6c6]">{{ j.email }}</td>
                <td class="px-5 py-3 text-right">
                  <button
                    @click="unassignJudge(j.id)"
                    class="p-1 text-[#ff8389] hover:bg-[#750e13]/30 transition"
                    title="Desvincular juez"
                  >
                    <UIcon name="lucide:user-x" class="w-4 h-4" />
                  </button>
                </td>
              </tr>
              <tr v-if="!edition.judges || edition.judges.length === 0">
                <td colspan="3" class="px-5 py-8 text-center text-[#8d8d8d] font-mono">
                  No hay jueces vinculados a esta edición.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 5: PREMIOS ESPECIALES -->
      <div v-if="activeTab === 'awards'" class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h2 class="text-base font-bold text-white uppercase tracking-wider font-mono">Premios Especiales</h2>
            <p class="text-xs text-[#8d8d8d]">Galardones independientes de la ganadora del certamen</p>
          </div>
          <NuxtLink :to="`/admin/editions/${edition.id}/awards`">
            <button class="h-8 px-3 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition">
              <UIcon name="lucide:external-link" class="w-3.5 h-3.5" />
              <span>Matriz de Premios & Métricas</span>
            </button>
          </NuxtLink>
        </div>

        <div v-if="!edition.awards || edition.awards.length === 0" class="carbon-tile p-8 text-center text-xs text-[#8d8d8d] font-mono">
          No hay premios especiales configurados.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="aw in edition.awards" :key="aw.id" class="carbon-tile p-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-bold text-white">{{ aw.name }}</h3>
                <span class="carbon-tag carbon-tag-purple uppercase">{{ aw.type }}</span>
              </div>
              <p class="text-xs text-[#8d8d8d] font-mono mb-4">
                {{ aw.type === 'criterion' ? 'Promedio ponderado de criterios' : aw.type === 'metric' ? `Métrica manual (${aw.metricLabel || 'Puntos'})` : 'Elección discrecional' }}
              </p>
            </div>
            <NuxtLink :to="`/admin/editions/${edition.id}/awards`">
              <button class="h-7 px-2.5 text-xs text-[#78a9ff] hover:text-white hover:bg-[#393939] border border-[#525252] flex items-center gap-1">
                <span>Ver Resultados</span>
                <UIcon name="lucide:chevron-right" class="w-3 h-3" />
              </button>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- MODALES CARBON CON ZOD -->
      <!-- Modal Ronda -->
      <UModal v-model:open="isAddRoundModalOpen" title="Añadir Nueva Ronda">
        <template #body>
          <div class="p-6 bg-[#262626]">
            <UForm :schema="roundSchema" :state="roundState" class="space-y-4" @submit="handleCreateRound">
              <UFormField label="Nombre de la Ronda" name="name" description="Ej. Semifinal, Traje de Noche, Gran Final" required>
                <UInput v-model="roundState.name" placeholder="Nombre de la ronda" class="w-full" size="md" />
              </UFormField>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="Modo de Avance" name="advanceMode" description="Criterio de clasificación">
                  <USelect v-model="roundState.advanceMode" :items="advanceModeOptions" class="w-full" />
                </UFormField>

                <UFormField label="Valor de Avance" name="advanceValue" description="Cantidad clasificados o puntaje">
                  <UInput v-model.number="roundState.advanceValue" type="number" step="0.5" class="w-full" />
                </UFormField>
              </div>

              <div class="pt-5 border-t border-[#393939] flex justify-end gap-2">
                <button type="button" @click="isAddRoundModalOpen = false" class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]">
                  Cancelar
                </button>
                <button type="submit" class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="lucide:check" class="w-3.5 h-3.5" />
                  <span>Crear Ronda</span>
                </button>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>

      <!-- Modal Participante -->
      <UModal v-model:open="isAddParticipantModalOpen" title="Registrar Participante">
        <template #body>
          <div class="p-6 bg-[#262626]">
            <UForm :schema="participantSchema" :state="participantState" class="space-y-4" @submit="handleCreateParticipant">
              <UFormField label="Código o Número" name="code" description="Identificador único (ej. 01, C-05)" required>
                <UInput v-model="participantState.code" placeholder="01" class="w-full" size="md" />
              </UFormField>

              <UFormField label="Nombre Completo" name="name" description="Nombre y Apellidos del concursante" required>
                <UInput v-model="participantState.name" placeholder="Nombre y Apellidos" class="w-full" size="md" />
              </UFormField>

              <div class="pt-5 border-t border-[#393939] flex justify-end gap-2">
                <button type="button" @click="isAddParticipantModalOpen = false" class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]">
                  Cancelar
                </button>
                <button type="submit" class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="lucide:check" class="w-3.5 h-3.5" />
                  <span>Registrar Participante</span>
                </button>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>

      <!-- Modal Criterio -->
      <UModal v-model:open="isAddCriterionModalOpen" title="Añadir Criterio de Evaluación">
        <template #body>
          <div class="p-6 bg-[#262626]">
            <UForm :schema="criterionSchema" :state="criterionState" class="space-y-4" @submit="handleCreateCriterion">
              <UFormField label="Nombre del Criterio" name="name" description="Ej. Pasarela, Belleza Integral, Entrevista" required>
                <UInput v-model="criterionState.name" placeholder="Nombre del criterio" class="w-full" size="md" />
              </UFormField>

              <UFormField label="Ponderación (%)" name="weight" description="Porcentaje sobre la calificación final (1 a 100%)" required>
                <UInput v-model.number="criterionState.weight" type="number" min="1" max="100" class="w-full" size="md" />
              </UFormField>

              <div class="pt-5 border-t border-[#393939] flex justify-end gap-2">
                <button type="button" @click="isAddCriterionModalOpen = false" class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]">
                  Cancelar
                </button>
                <button type="submit" class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="lucide:check" class="w-3.5 h-3.5" />
                  <span>Añadir Criterio</span>
                </button>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>

      <!-- Modal Juez -->
      <UModal v-model:open="isAddJudgeModalOpen" title="Registrar o Asignar Juez">
        <template #body>
          <div class="p-6 bg-[#262626]">
            <UForm :schema="judgeSchema" :state="judgeState" class="space-y-4" @submit="handleCreateJudge">
              <UFormField label="Nombre del Juez" name="name" description="Nombre y título profesional" required>
                <UInput v-model="judgeState.name" placeholder="Lic. Carlos Méndez" class="w-full" size="md" />
              </UFormField>

              <UFormField label="Correo Electrónico" name="email" description="Usuario de acceso al sistema" required>
                <UInput v-model="judgeState.email" type="email" placeholder="juez1@concurso.com" class="w-full" size="md" />
              </UFormField>

              <UFormField label="Contraseña Temporal Generada" name="password" description="Contraseña asignada para la cabina" required>
                <UInput v-model="judgeState.password" class="w-full font-mono" size="md" />
              </UFormField>

              <div class="pt-5 border-t border-[#393939] flex justify-end gap-2">
                <button type="button" @click="isAddJudgeModalOpen = false" class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]">
                  Cancelar
                </button>
                <button type="submit" class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UIcon name="lucide:check" class="w-3.5 h-3.5" />
                  <span>Registrar Juez</span>
                </button>
              </div>
            </UForm>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
