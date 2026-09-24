<script setup lang="ts">
definePageMeta({
  layout: 'judge',
  middleware: 'judge',
});

const route = useRoute();
const roundId = route.params.id as string;

const { data: roundData, status: roundStatus, refresh: refreshRound } = await useFetch(`/api/judge/rounds/${roundId}`);
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
          localScores[p.id][c.id] = Number(savedScores.value[p.id][c.id]);
        } else if (localScores[p.id][c.id] === undefined) {
          localScores[p.id][c.id] = Number(roundData.value.edition.scaleMin);
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

const selectedParticipant = computed(() => {
  return roundData.value?.participants?.find((p: any) => p.id === selectedParticipantId.value);
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
    // 1. Guardar borrador actual
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
  <div>
    <!-- SKELETON LOADING -->
    <div v-if="roundStatus === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-40 rounded" />
      <USkeleton class="h-28 w-full rounded-3xl" />
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        <USkeleton class="lg:col-span-4 h-96 rounded-3xl" />
        <USkeleton class="lg:col-span-8 h-96 rounded-3xl" />
      </div>
    </div>

    <!-- MAIN BOOTH -->
    <div v-else-if="roundData" class="space-y-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <NuxtLink to="/judge" class="hover:text-emerald-400 transition flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3 h-3" />
          Mis Rondas
        </NuxtLink>
        <span>/</span>
        <span class="text-slate-200 font-medium">{{ roundData.round.name }}</span>
      </div>

      <!-- Inmutability Alert if already submitted -->
      <div v-if="roundData.isSubmitted">
        <UAlert
          color="success"
          variant="subtle"
          title="Calificaciones Enviadas y Bloqueadas"
          :description="`Has emitido tus votos para esta ronda el ${new Date(roundData.submittedAt).toLocaleString()}. En estricto cumplimiento de la regla de inmutabilidad, tus calificaciones no pueden ser alteradas.`"
          icon="lucide:check-circle"
        />
      </div>

      <!-- Round Info Banner -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl backdrop-blur-md">
        <div>
          <span class="text-xs uppercase tracking-wider font-semibold text-emerald-400 font-mono">
            {{ roundData.contest.name }} &bull; Edición {{ roundData.edition.name }}
          </span>
          <h1 class="text-2xl sm:text-3xl font-black text-white mt-1">{{ roundData.round.name }}</h1>
          <p class="text-xs text-slate-400 mt-1 flex flex-wrap gap-2">
            <span>Escala: <strong class="text-emerald-400 font-mono font-bold">[{{ roundData.edition.scaleMin }} a {{ roundData.edition.scaleMax }} pts]</strong></span>
            <span>&bull;</span>
            <span>Método: <strong class="capitalize text-slate-200">{{ roundData.edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong></span>
          </p>
        </div>

        <!-- Progress Widget with UProgress -->
        <div class="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 w-full md:w-72">
          <div class="flex justify-between items-center text-xs mb-1.5">
            <span class="text-slate-400">Progreso Evaluación:</span>
            <span class="font-mono font-bold text-emerald-400">
              {{ completedCount }} / {{ totalCount }}
            </span>
          </div>
          <UProgress
            :model-value="completedCount"
            :max="totalCount || 1"
            color="primary"
            size="md"
          />
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="errorMsg">
        <UAlert
          color="error"
          variant="subtle"
          title="Atención"
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

      <!-- Mobile / Tablet Quick Participant Selector Carousel -->
      <div class="block lg:hidden bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
          Participantes (Toca para calificar):
        </span>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="p in roundData.participants"
            :key="p.id"
            @click="selectedParticipantId = p.id"
            class="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap border transition"
            :class="selectedParticipantId === p.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'"
          >
            <span class="font-mono font-bold text-emerald-400">#{{ p.code }}</span>
            <span>{{ p.name.split(' ')[0] }}</span>
            <span
              class="w-2 h-2 rounded-full"
              :class="isParticipantComplete(p.id) ? 'bg-emerald-400' : 'bg-slate-600'"
            />
          </button>
        </div>
      </div>

      <!-- Voting Workspace -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Desktop Left Column: Participant Selector -->
        <div class="hidden lg:block lg:col-span-4 space-y-3">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Lista de Participantes ({{ roundData.participants?.length || 0 }})
          </h3>
          <div class="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            <button
              v-for="p in roundData.participants"
              :key="p.id"
              @click="selectedParticipantId = p.id"
              class="w-full text-left p-4 rounded-2xl border transition flex items-center justify-between gap-3"
              :class="selectedParticipantId === p.id ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-emerald-400 flex-shrink-0">
                  {{ p.code }}
                </div>
                <div class="min-w-0">
                  <h4 class="font-bold text-white text-sm truncate">{{ p.name }}</h4>
                  <p class="text-xs text-slate-400 font-mono">Código: {{ p.code }}</p>
                </div>
              </div>

              <UBadge
                :color="isParticipantComplete(p.id) ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
                class="flex-shrink-0"
              >
                {{ isParticipantComplete(p.id) ? 'Completo' : 'Pendiente' }}
              </UBadge>
            </button>
          </div>
        </div>

        <!-- Right Column: Scoring Form for Selected Participant -->
        <div class="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div v-if="selectedParticipant">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-2">
              <div>
                <span class="text-xs font-mono font-bold text-emerald-400">
                  PARTICIPANTE CÓDIGO #{{ selectedParticipant.code }}
                </span>
                <h2 class="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  {{ selectedParticipant.name }}
                </h2>
              </div>

              <div class="text-left sm:text-right">
                <span class="text-xs text-slate-400">Rango permitido:</span>
                <div class="font-mono text-xs font-bold text-emerald-300">
                  {{ roundData.edition.scaleMin }} a {{ roundData.edition.scaleMax }} puntos
                </div>
              </div>
            </div>

            <!-- Criteria List with USlider and UInput -->
            <div class="space-y-6">
              <div
                v-for="c in roundData.criteria"
                :key="c.id"
                class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4"
              >
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <h3 class="font-bold text-white text-base sm:text-lg">{{ c.name }}</h3>
                    <span class="text-xs text-slate-400">Ponderación: <strong class="text-slate-300">{{ c.weight }}%</strong></span>
                  </div>

                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-xs text-slate-400 hidden sm:inline">Puntaje:</span>
                    <div class="w-24">
                      <UInput
                        v-model.number="localScores[selectedParticipantId][c.id]"
                        type="number"
                        :min="roundData.edition.scaleMin"
                        :max="roundData.edition.scaleMax"
                        step="0.5"
                        :disabled="roundData.isSubmitted"
                        size="md"
                        class="text-center font-mono font-bold text-base"
                      />
                    </div>
                  </div>
                </div>

                <!-- Nuxt UI v4 USlider -->
                <div v-if="!roundData.isSubmitted" class="pt-1 px-1">
                  <USlider
                    v-model="localScores[selectedParticipantId][c.id]"
                    :min="Number(roundData.edition.scaleMin)"
                    :max="Number(roundData.edition.scaleMax)"
                    :step="0.5"
                    color="primary"
                  />
                  <div class="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>{{ roundData.edition.scaleMin }}</span>
                    <span>{{ (roundData.edition.scaleMin + roundData.edition.scaleMax) / 2 }}</span>
                    <span>{{ roundData.edition.scaleMax }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Bar at Bottom -->
          <div class="pt-8 mt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-xs w-full sm:w-auto">
              <template v-if="!roundData.isSubmitted">
                <span v-if="!isAllComplete" class="text-amber-400 font-semibold flex items-center gap-1.5">
                  <UIcon name="lucide:alert-circle" class="w-4 h-4 flex-shrink-0" />
                  Faltan {{ totalCount - completedCount }} participante(s) por calificar para habilitar el envío definitivo.
                </span>
                <span v-else class="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <UIcon name="lucide:check-circle" class="w-4 h-4 flex-shrink-0" />
                  ¡Todos los participantes han sido calificados! Puedes realizar el envío definitivo.
                </span>
              </template>
            </div>

            <div v-if="!roundData.isSubmitted" class="flex items-center gap-3 w-full sm:w-auto justify-end">
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
            <div class="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
              <UIcon name="lucide:shield-alert" class="w-8 h-8" />
            </div>

            <div class="text-center">
              <h3 class="text-lg font-black text-white">¿Deseas enviar tus calificaciones finales?</h3>
              <p class="text-xs text-amber-400 mt-2 font-bold uppercase tracking-wider">
                Regla de Inmutabilidad Estricta
              </p>
              <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Una vez confirmes este envío, tus calificaciones quedarán selladas en la base de datos y <strong>no podrás editarlas</strong> bajo ninguna circunstancia.
              </p>
            </div>

            <div class="pt-5 border-t border-slate-800 flex justify-end gap-3">
              <UButton variant="ghost" color="neutral" @click="isConfirmModalOpen = false">
                Revisar de nuevo
              </UButton>
              <UButton color="primary" :loading="isSubmittingFinal" icon="lucide:check-circle" @click="submitFinal">
                Sí, Enviar Definitivamente
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
