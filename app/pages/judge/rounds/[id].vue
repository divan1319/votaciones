<script setup lang="ts">
definePageMeta({
  layout: 'judge',
  middleware: 'judge',
});

const route = useRoute();
const roundId = route.params.id as string;

const { data: roundData, refresh: refreshRound } = await useFetch(`/api/judge/rounds/${roundId}`);
const { data: savedScores, refresh: refreshScores } = await useFetch(`/api/judge/rounds/${roundId}/scores`);

// Calificaciones locales reactivas: participantId -> criterionId -> number
const localScores = reactive<Record<string, Record<string, number>>>({});

// Participante seleccionado actualmente en la cabina
const selectedParticipantId = ref<string>('');

const isSavingDraft = ref(false);
const isSubmittingFinal = ref(false);
const isConfirmModalOpen = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Inicializar scores locales desde los guardados en BD
watchEffect(() => {
  if (roundData.value?.participants && roundData.value.participants.length > 0) {
    if (!selectedParticipantId.value) {
      selectedParticipantId.value = roundData.value.participants[0].id;
    }

    for (const p of roundData.value.participants) {
      if (!localScores[p.id]) {
        localScores[p.id] = {};
      }
      for (const c of roundData.value.criteria) {
        if (savedScores.value?.[p.id]?.[c.id] !== undefined) {
          localScores[p.id][c.id] = savedScores.value[p.id][c.id];
        } else if (localScores[p.id][c.id] === undefined) {
          // valor inicial sugerido: mínimo de escala
          localScores[p.id][c.id] = roundData.value.edition.scaleMin;
        }
      }
    }
  }
});

// Comprobar si un participante tiene todos los criterios calificados
function isParticipantComplete(participantId: string): boolean {
  if (!roundData.value?.criteria) return false;
  const pScores = localScores[participantId];
  if (!pScores) return false;

  for (const c of roundData.value.criteria) {
    const val = pScores[c.id];
    if (val === undefined || val === null || isNaN(val)) return false;
  }
  return true;
}

// Conteo total de participantes completados
const completedCount = computed(() => {
  if (!roundData.value?.participants) return 0;
  return roundData.value.participants.filter((p: any) => isParticipantComplete(p.id)).length;
});

const totalCount = computed(() => roundData.value?.participants?.length || 0);

const isAllComplete = computed(() => {
  return totalCount.value > 0 && completedCount.value === totalCount.value;
});

// Guardar borrador
async function saveDraft() {
  if (roundData.value?.isSubmitted) return;
  isSavingDraft.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const flatList: Array<{ participantId: string; criterionId: string; value: number }> = [];

    for (const [pId, critObj] of Object.entries(localScores)) {
      for (const [cId, val] of Object.entries(critObj)) {
        flatList.push({
          participantId: pId,
          criterionId: cId,
          value: Number(val),
        });
      }
    }

    await $fetch(`/api/judge/rounds/${roundId}/scores`, {
      method: 'PUT',
      body: { scores: flatList },
    });

    successMsg.value = 'Borrador guardado exitosamente.';
    await refreshScores();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    isSavingDraft.value = false;
  }
}

// Enviar definitivo
async function submitFinal() {
  if (!isAllComplete.value) {
    errorMsg.value = 'Debes calificar a todos los participantes antes de poder enviar.';
    isConfirmModalOpen.value = false;
    return;
  }

  isSubmittingFinal.value = true;
  errorMsg.value = '';

  try {
    // 1. Asegurar guardado previo
    await saveDraft();

    // 2. Enviar confirmación definitiva
    await $fetch(`/api/judge/rounds/${roundId}/submit`, {
      method: 'POST',
    });

    isConfirmModalOpen.value = false;
    successMsg.value = '¡Calificaciones enviadas con éxito! Han sido bloqueadas de forma inmutable.';
    await refreshRound();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    isSubmittingFinal.value = false;
  }
}
</script>

<template>
  <div v-if="roundData" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2 text-xs text-slate-400">
      <NuxtLink to="/judge" class="hover:text-emerald-400 transition flex items-center gap-1">
        <UIcon name="lucide:arrow-left" class="w-3 h-3" />
        Mis Rondas
      </NuxtLink>
      <span>/</span>
      <span class="text-slate-200">{{ roundData.round.name }}</span>
    </div>

    <!-- Banner de inmutabilidad si ya fue enviada -->
    <div v-if="roundData.isSubmitted" class="p-6 bg-emerald-950/60 border border-emerald-500/40 rounded-3xl text-emerald-200">
      <div class="flex items-start gap-4">
        <UIcon name="lucide:check-circle" class="w-8 h-8 text-emerald-400 flex-shrink-0" />
        <div>
          <h2 class="text-xl font-bold text-emerald-300">Calificaciones Enviadas y Bloqueadas</h2>
          <p class="text-sm text-emerald-200/90 mt-1">
            Has emitido tus votos para esta ronda el {{ new Date(roundData.submittedAt).toLocaleString() }}. En cumplimiento de la regla de inmutabilidad, tus calificaciones no pueden ser alteradas.
          </p>
        </div>
      </div>
    </div>

    <!-- Round Info Banner -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <span class="text-xs uppercase tracking-wider font-semibold text-emerald-400">
          {{ roundData.contest.name }} &bull; Edición {{ roundData.edition.name }}
        </span>
        <h1 class="text-3xl font-black text-white mt-1">{{ roundData.round.name }}</h1>
        <p class="text-xs text-slate-400 mt-1">
          Escala de evaluación: <strong class="text-slate-200">[{{ roundData.edition.scaleMin }} a {{ roundData.edition.scaleMax }}]</strong> &bull;
          Método del certamen: <strong class="capitalize text-slate-200">{{ roundData.edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong>
        </p>
      </div>

      <!-- Barra de progreso -->
      <div class="bg-slate-800/80 px-5 py-3 rounded-2xl border border-slate-700/60 text-right">
        <div class="text-xs text-slate-400 mb-1">Progreso de Calificación:</div>
        <div class="flex items-center gap-2">
          <span class="text-2xl font-black font-mono text-emerald-400">{{ completedCount }}</span>
          <span class="text-slate-500 font-bold">/</span>
          <span class="text-2xl font-black font-mono text-slate-300">{{ totalCount }}</span>
          <span class="text-xs text-slate-400 ml-1">participantes</span>
        </div>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="errorMsg" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center justify-between">
      <span>{{ errorMsg }}</span>
      <UButton variant="ghost" color="rose" size="xs" icon="lucide:x" @click="errorMsg = ''" />
    </div>

    <div v-if="successMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center justify-between">
      <span>{{ successMsg }}</span>
      <UButton variant="ghost" color="emerald" size="xs" icon="lucide:x" @click="successMsg = ''" />
    </div>

    <!-- Voting Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left Column: Participant Selector -->
      <div class="lg:col-span-4 space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Selecciona Participante</h3>
        <div class="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          <button
            v-for="p in roundData.participants"
            :key="p.id"
            @click="selectedParticipantId = p.id"
            class="w-full text-left p-4 rounded-2xl border transition flex items-center justify-between gap-3"
            :class="selectedParticipantId === p.id ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/5' : 'bg-slate-900 border-slate-800 hover:border-slate-700'"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-emerald-400">
                {{ p.code }}
              </div>
              <div>
                <h4 class="font-bold text-white text-sm">{{ p.name }}</h4>
                <p class="text-xs text-slate-400 font-mono">Código: {{ p.code }}</p>
              </div>
            </div>

            <UBadge
              :color="isParticipantComplete(p.id) ? 'success' : 'neutral'"
              variant="subtle"
              size="xs"
            >
              {{ isParticipantComplete(p.id) ? 'Listo' : 'Pendiente' }}
            </UBadge>
          </button>
        </div>
      </div>

      <!-- Right Column: Scoring Form for Selected Participant -->
      <div class="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
        <div v-if="selectedParticipantId && roundData.participants.find((p: any) => p.id === selectedParticipantId)">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <span class="text-xs font-mono font-bold text-emerald-400">
                PARTICIPANTE {{ roundData.participants.find((p: any) => p.id === selectedParticipantId)?.code }}
              </span>
              <h2 class="text-2xl font-extrabold text-white mt-0.5">
                {{ roundData.participants.find((p: any) => p.id === selectedParticipantId)?.name }}
              </h2>
            </div>

            <div class="text-right">
              <span class="text-xs text-slate-400">Rango permitido:</span>
              <div class="font-mono text-xs font-semibold text-slate-200">
                {{ roundData.edition.scaleMin }} a {{ roundData.edition.scaleMax }} puntos
              </div>
            </div>
          </div>

          <!-- Criteria List -->
          <div class="space-y-6">
            <div
              v-for="c in roundData.criteria"
              :key="c.id"
              class="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 space-y-3"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-bold text-white text-base">{{ c.name }}</h3>
                  <span class="text-xs text-slate-400">Ponderación: {{ c.weight }}%</span>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400">Puntaje:</span>
                  <input
                    v-model.number="localScores[selectedParticipantId][c.id]"
                    type="number"
                    :min="roundData.edition.scaleMin"
                    :max="roundData.edition.scaleMax"
                    step="0.5"
                    :disabled="roundData.isSubmitted"
                    class="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-lg text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <!-- Quick Buttons / Slider -->
              <div v-if="!roundData.isSubmitted" class="pt-2 flex items-center gap-3">
                <input
                  v-model.number="localScores[selectedParticipantId][c.id]"
                  type="range"
                  :min="roundData.edition.scaleMin"
                  :max="roundData.edition.scaleMax"
                  step="0.5"
                  class="flex-1 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Action Bar at Bottom -->
        <div class="pt-8 mt-8 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="text-xs text-slate-400">
            <template v-if="!roundData.isSubmitted">
              <span v-if="!isAllComplete" class="text-amber-400 font-semibold flex items-center gap-1">
                <UIcon name="lucide:alert-circle" class="w-4 h-4" />
                Faltan {{ totalCount - completedCount }} participante(s) por calificar para habilitar el envío.
              </span>
              <span v-else class="text-emerald-400 font-semibold flex items-center gap-1">
                <UIcon name="lucide:check-circle" class="w-4 h-4" />
                ¡Todos los participantes han sido calificados! Listo para enviar.
              </span>
            </template>
          </div>

          <div v-if="!roundData.isSubmitted" class="flex items-center gap-3">
            <UButton
              variant="outline"
              color="neutral"
              icon="lucide:save"
              size="md"
              :loading="isSavingDraft"
              @click="saveDraft"
            >
              Guardar Borrador
            </UButton>

            <UButton
              color="primary"
              icon="lucide:send"
              size="md"
              :disabled="!isAllComplete"
              @click="isConfirmModalOpen = true"
            >
              Enviar Definitivo
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Confirmación Inmutabilidad -->
    <UModal v-model:open="isConfirmModalOpen" title="Confirmación de Envío Definitivo">
      <template #body>
        <div class="p-6 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <UIcon name="lucide:shield-alert" class="w-7 h-7" />
          </div>

          <div class="text-center">
            <h3 class="text-lg font-bold text-white">¿Deseas enviar tus calificaciones finales?</h3>
            <p class="text-xs text-amber-300 mt-2 font-semibold">
              ATENCIÓN: Regla de Inmutabilidad Estricta
            </p>
            <p class="text-xs text-slate-400 mt-1">
              Una vez confirmes este envío, tus calificaciones quedarán selladas y <strong>no podrás editarlas</strong> bajo ninguna circunstancia.
            </p>
          </div>

          <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <UButton variant="ghost" color="neutral" @click="isConfirmModalOpen = false">Revisar de nuevo</UButton>
            <UButton color="primary" :loading="isSubmittingFinal" @click="submitFinal">
              Sí, Enviar Definitivamente
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
