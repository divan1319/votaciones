<script setup lang="ts">
definePageMeta({
  layout: 'judge',
  middleware: 'judge',
});

const route = useRoute();
const roundId = route.params.id as string;

const { data: roundData, status: roundStatus, refresh: refreshRound } = await useFetch(`/api/judge/rounds/${roundId}`);
const { data: savedScores, refresh: refreshScores } = await useFetch(`/api/judge/rounds/${roundId}/scores`);

useHead({
  title: () => roundData.value ? `Cabina: ${roundData.value.round.name}` : 'Cabina de Juez',
});

const localScores = reactive<Record<string, Record<string, number>>>({});
const selectedParticipantId = ref<string>('');

const isSavingDraft = ref(false);
const isSubmittingFinal = ref(false);
const isConfirmModalOpen = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

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

async function submitFinal() {
  if (!isAllComplete.value) {
    errorMsg.value = 'Debes calificar a todos los participantes antes de poder enviar.';
    isConfirmModalOpen.value = false;
    return;
  }

  isSubmittingFinal.value = true;
  errorMsg.value = '';

  try {
    await saveDraft();

    await $fetch(`/api/judge/rounds/${roundId}/submit`, {
      method: 'POST',
    });

    isConfirmModalOpen.value = false;
    successMsg.value = '¡Calificaciones enviadas y selladas de forma inmutable!';
    await refreshRound();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    isSubmittingFinal.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- SKELETON LOADING -->
    <div v-if="roundStatus === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-40 rounded-none" />
      <USkeleton class="h-28 w-full rounded-none" />
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4">
        <USkeleton class="lg:col-span-4 h-96 rounded-none" />
        <USkeleton class="lg:col-span-8 h-96 rounded-none" />
      </div>
    </div>

    <!-- MAIN BOOTH -->
    <div v-else-if="roundData" class="space-y-6">
      <!-- Carbon Breadcrumb -->
      <div class="flex items-center gap-2 text-xs font-mono text-[#8d8d8d]">
        <NuxtLink to="/judge" class="hover:underline text-[#c6c6c6] flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3.5 h-3.5" />
          <span>Mis Rondas</span>
        </NuxtLink>
        <span>/</span>
        <span class="text-white font-medium">{{ roundData.round.name }}</span>
      </div>

      <!-- Inmutability Alert if submitted -->
      <div v-if="roundData.isSubmitted" class="p-4 bg-[#0e6027]/20 border-l-4 border-[#24a148] text-xs text-[#f4f4f4] space-y-1 font-mono">
        <div class="flex items-center gap-2 font-bold text-[#42be65] uppercase tracking-wider">
          <UIcon name="lucide:check-circle" class="w-4 h-4" />
          <span>Calificaciones Selladas e Inmutables</span>
        </div>
        <p class="font-sans text-xs text-[#c6c6c6]">
          Votos emitidos y registrados el {{ new Date(roundData.submittedAt).toLocaleString() }}. En cumplimiento de la regla de inmutabilidad, tus calificaciones no pueden ser alteradas.
        </p>
      </div>

      <!-- Round Info Toolbar -->
      <div class="carbon-tile p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span class="text-[11px] uppercase font-mono tracking-wider font-semibold text-[#78a9ff]">
            {{ roundData.contest.name }} &bull; Edición {{ roundData.edition.name }}
          </span>
          <h1 class="text-2xl sm:text-3xl font-bold text-white mt-1">{{ roundData.round.name }}</h1>
          <p class="text-xs font-mono text-[#8d8d8d] mt-1 flex flex-wrap gap-3">
            <span>ESCALA: <strong class="text-[#78a9ff]">[{{ roundData.edition.scaleMin }} &ndash; {{ roundData.edition.scaleMax }} pts]</strong></span>
            <span>&bull;</span>
            <span>MÉTODO: <strong class="text-white uppercase">{{ roundData.edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong></span>
          </p>
        </div>

        <!-- Evaluation Progress Tracker -->
        <div class="bg-[#1c1c1c] p-3.5 border border-[#393939] w-full md:w-64 space-y-1.5">
          <div class="flex justify-between items-center text-xs font-mono">
            <span class="text-[#8d8d8d]">Progreso:</span>
            <span class="font-bold text-[#78a9ff]">{{ completedCount }} / {{ totalCount }} participantes</span>
          </div>
          <div class="w-full bg-[#262626] h-2">
            <div
              class="bg-[#0f62fe] h-2 transition-all duration-300"
              :style="{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }"
            />
          </div>
        </div>
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

      <!-- Mobile / Tablet Quick Participant Switcher -->
      <div class="block lg:hidden carbon-tile p-3">
        <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8d8d8d] block mb-2 px-1">
          Participantes (Toca para seleccionar):
        </span>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="p in roundData.participants"
            :key="p.id"
            @click="selectedParticipantId = p.id"
            class="px-3 py-1.5 text-xs font-mono font-medium flex items-center gap-2 whitespace-nowrap border transition cursor-pointer"
            :class="selectedParticipantId === p.id ? 'bg-[#0f62fe] text-white border-transparent' : 'bg-[#1c1c1c] text-[#c6c6c6] border-[#393939] hover:border-[#525252]'"
          >
            <span class="font-bold">#{{ p.code }}</span>
            <span>{{ p.name.split(' ')[0] }}</span>
            <span
              class="w-1.5 h-1.5 rounded-none"
              :class="isParticipantComplete(p.id) ? 'bg-[#42be65]' : 'bg-[#8d8d8d]'"
            />
          </button>
        </div>
      </div>

      <!-- Workspace 2-Column Split View -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Desktop Left: Candidate List -->
        <div class="hidden lg:block lg:col-span-4 space-y-2">
          <h3 class="text-xs font-mono font-bold uppercase tracking-wider text-[#8d8d8d] px-1">
            Nómina de Participantes ({{ roundData.participants?.length || 0 }})
          </h3>
          <div class="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
            <button
              v-for="p in roundData.participants"
              :key="p.id"
              @click="selectedParticipantId = p.id"
              class="w-full text-left p-3.5 border transition flex items-center justify-between gap-3 cursor-pointer"
              :class="selectedParticipantId === p.id ? 'bg-[#262626] border-[#0f62fe] border-l-4 shadow-sm' : 'bg-[#1c1c1c] border-[#333333] hover:border-[#525252]'"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 bg-[#161616] border border-[#525252] flex items-center justify-center font-mono font-bold text-xs text-[#78a9ff] flex-shrink-0">
                  {{ p.code }}
                </div>
                <div class="min-w-0">
                  <h4 class="font-medium text-white text-xs truncate">{{ p.name }}</h4>
                  <p class="text-[11px] text-[#8d8d8d] font-mono">Código: {{ p.code }}</p>
                </div>
              </div>

              <span
                class="carbon-tag flex-shrink-0"
                :class="isParticipantComplete(p.id) ? 'carbon-tag-green' : 'carbon-tag-gray'"
              >
                {{ isParticipantComplete(p.id) ? 'COMPLETO' : 'PENDIENTE' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Right: Scoring Form -->
        <div class="lg:col-span-8 carbon-tile p-6 sm:p-8 flex flex-col justify-between">
          <div v-if="selectedParticipant">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#393939] pb-4 mb-6 gap-2">
              <div>
                <span class="text-xs font-mono font-bold text-[#78a9ff]">
                  CANDIDATA OFICIAL #{{ selectedParticipant.code }}
                </span>
                <h2 class="text-xl sm:text-2xl font-bold text-white mt-0.5">
                  {{ selectedParticipant.name }}
                </h2>
              </div>

              <div class="text-left sm:text-right font-mono text-xs">
                <span class="text-[#8d8d8d]">Rango permitido:</span>
                <div class="font-bold text-[#78a9ff]">
                  {{ roundData.edition.scaleMin }} &ndash; {{ roundData.edition.scaleMax }} puntos
                </div>
              </div>
            </div>

            <!-- Criteria List with Precision Input and USlider -->
            <div class="space-y-5">
              <div
                v-for="c in roundData.criteria"
                :key="c.id"
                class="p-4 bg-[#1c1c1c] border border-[#393939] space-y-3"
              >
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <h3 class="font-bold text-white text-sm sm:text-base">{{ c.name }}</h3>
                    <span class="text-xs font-mono text-[#8d8d8d]">Ponderación: <strong class="text-[#c6c6c6]">{{ c.weight }}%</strong></span>
                  </div>

                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-xs font-mono text-[#8d8d8d] hidden sm:inline">Calificación:</span>
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

                <!-- Nuxt UI v4 USlider with Carbon Blue styling -->
                <div v-if="!roundData.isSubmitted" class="pt-1 px-1">
                  <USlider
                    v-model="localScores[selectedParticipantId][c.id]"
                    :min="Number(roundData.edition.scaleMin)"
                    :max="Number(roundData.edition.scaleMax)"
                    :step="0.5"
                    color="primary"
                  />
                  <div class="flex justify-between text-[10px] font-mono text-[#8d8d8d] mt-1">
                    <span>{{ roundData.edition.scaleMin }} pts</span>
                    <span>{{ (roundData.edition.scaleMin + roundData.edition.scaleMax) / 2 }} pts</span>
                    <span>{{ roundData.edition.scaleMax }} pts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="pt-6 mt-8 border-t border-[#393939] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-xs font-mono w-full sm:w-auto">
              <template v-if="!roundData.isSubmitted">
                <span v-if="!isAllComplete" class="text-[#f1c21b] font-medium flex items-center gap-1.5">
                  <UIcon name="lucide:alert-circle" class="w-4 h-4 flex-shrink-0" />
                  Faltan {{ totalCount - completedCount }} participante(s) para habilitar el envío definitivo.
                </span>
                <span v-else class="text-[#42be65] font-medium flex items-center gap-1.5">
                  <UIcon name="lucide:check-circle" class="w-4 h-4 flex-shrink-0" />
                  Todas las candidatas calificadas. Listo para enviar y sellar.
                </span>
              </template>
            </div>

            <div v-if="!roundData.isSubmitted" class="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                @click="saveDraft"
                :disabled="isSavingDraft"
                class="h-9 px-4 bg-[#262626] hover:bg-[#393939] border border-[#525252] text-[#c6c6c6] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <UIcon name="lucide:save" class="w-3.5 h-3.5 text-[#78a9ff]" />
                <span>Guardar Borrador</span>
              </button>

              <button
                type="button"
                @click="isConfirmModalOpen = true"
                :disabled="!isAllComplete"
                class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] active:bg-[#002d9c] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <UIcon name="lucide:send" class="w-3.5 h-3.5" />
                <span>Enviar Definitivo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Confirmación Inmutabilidad -->
      <UModal v-model:open="isConfirmModalOpen" title="Confirmación de Envío Definitivo">
        <template #body>
          <div class="p-6 bg-[#262626] space-y-4">
            <div class="w-12 h-12 bg-[#1c1c1c] border border-[#f1c21b] text-[#f1c21b] flex items-center justify-center mx-auto mb-2">
              <UIcon name="lucide:shield-alert" class="w-6 h-6" />
            </div>

            <div class="text-center">
              <h3 class="text-base font-bold text-white uppercase tracking-wider font-mono">
                ¿Deseas enviar tus calificaciones finales?
              </h3>
              <p class="text-xs text-[#f1c21b] mt-2 font-bold font-mono">
                REGLA DE INMUTABILIDAD ESTRICTA
              </p>
              <p class="text-xs text-[#8d8d8d] mt-1 max-w-sm mx-auto">
                Una vez confirmado el envío, tus votos quedarán sellados en la base de datos y no podrán modificarse.
              </p>
            </div>

            <div class="pt-5 border-t border-[#393939] flex justify-end gap-2">
              <button
                type="button"
                @click="isConfirmModalOpen = false"
                class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]"
              >
                Revisar de nuevo
              </button>
              <button
                type="button"
                @click="submitFinal"
                :disabled="isSubmittingFinal"
                class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <UIcon v-if="isSubmittingFinal" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <UIcon v-else name="lucide:check-circle" class="w-3.5 h-3.5" />
                <span>Confirmar y Sellar Votación</span>
              </button>
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>
