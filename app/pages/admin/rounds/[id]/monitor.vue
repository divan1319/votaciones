<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const roundId = route.params.id as string;

const { data: calc, status, refresh } = await useFetch(`/api/admin/rounds/${roundId}/live`);

useHead({
  title: () => calc.value ? `Monitor Ronda ${calc.value.round.position}: ${calc.value.round.name}` : 'Monitor en Vivo',
});

const viewMode = ref<'progress' | 'ranking'>('ranking');
const isResolving = ref(false);
const isClosing = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

let interval: any = null;
onMounted(() => {
  interval = setInterval(() => {
    if (calc.value?.round?.status === 'open') {
      refresh();
    }
  }, 5000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

async function resolveTie(participantId: string, manualAdvance: boolean) {
  isResolving.value = true;
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/rounds/${roundId}/resolve-tie`, {
      method: 'POST',
      body: {
        participantId,
        manualAdvance,
      },
    });
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    isResolving.value = false;
  }
}

async function handleCloseRound() {
  if (calc.value?.hasCriticalTie) {
    errorMsg.value = calc.value.criticalTieMessage || 'Debes resolver los empates críticos antes de cerrar la ronda.';
    return;
  }

  let confirmMsg = '¿Estás seguro de cerrar definitivamente esta ronda? Se congelarán los puntajes y se generarán los clasificados para la siguiente etapa.';
  if (calc.value?.missingJudgesCount && calc.value.missingJudgesCount > 0) {
    confirmMsg = `ADVERTENCIA: Hay ${calc.value.missingJudgesCount} juez(ces) que NO enviaron sus calificaciones. La ronda se cerrará calculando únicamente con lo enviado y se registrará la ausencia. ¿Deseas continuar?`;
  }

  if (!confirm(confirmMsg)) return;

  isClosing.value = true;
  errorMsg.value = '';
  try {
    await $fetch(`/api/admin/rounds/${roundId}/close`, { method: 'POST' });
    successMsg.value = 'Ronda cerrada con éxito. Resultados congelados.';
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message;
  } finally {
    isClosing.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-48 rounded-none" />
      <USkeleton class="h-28 w-full rounded-none" />
      <div class="flex justify-between items-center">
        <USkeleton class="h-10 w-72 rounded-none" />
        <USkeleton class="h-6 w-32 rounded-none" />
      </div>
      <USkeleton class="h-80 w-full rounded-none" />
    </div>

    <!-- MAIN MONITOR -->
    <div v-else-if="calc" class="space-y-6">
      <!-- Carbon Breadcrumb -->
      <div class="flex items-center gap-2 text-xs font-mono text-[#8d8d8d]">
        <NuxtLink :to="`/admin/editions/${calc.edition.id}`" class="hover:underline text-[#c6c6c6] flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3.5 h-3.5" />
          <span>Edición {{ calc.edition.name }}</span>
        </NuxtLink>
        <span>/</span>
        <span class="text-white font-medium">Monitor Ronda {{ calc.round.position }}: {{ calc.round.name }}</span>
      </div>

      <!-- Header Toolbar -->
      <div class="carbon-tile p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {{ calc.round.name }}
            </h1>
            <span
              class="carbon-tag"
              :class="calc.round.status === 'open' ? 'carbon-tag-green' : calc.round.status === 'closed' ? 'carbon-tag-gray' : 'carbon-tag-warm'"
            >
              {{ calc.round.status === 'open' ? 'EN VIVO (ABIERTA)' : calc.round.status === 'closed' ? 'CERRADA Y SELLADA' : 'PENDIENTE' }}
            </span>
          </div>
          <p class="text-xs font-mono text-[#8d8d8d] mt-2 flex flex-wrap gap-3">
            <span>EDICIÓN: <strong class="text-white">{{ calc.edition.name }}</strong></span>
            <span>&bull;</span>
            <span>MÉTODO: <strong class="text-white uppercase">{{ calc.edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong></span>
            <span>&bull;</span>
            <span>AVANCE: <strong class="text-[#78a9ff]">{{ calc.round.advanceMode === 'top_n' ? `Top ${calc.round.advanceValue}` : `Mínimo ${calc.round.advanceValue} pts` }}</strong></span>
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            @click="refresh"
            class="h-9 px-3 bg-[#262626] hover:bg-[#393939] border border-[#525252] text-[#c6c6c6] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <UIcon name="lucide:refresh-cw" class="w-3.5 h-3.5 text-[#78a9ff]" />
            <span>Actualizar</span>
          </button>

          <button
            v-if="calc.round.status === 'open'"
            :disabled="calc.hasCriticalTie || isClosing"
            @click="handleCloseRound"
            class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
          >
            <UIcon name="lucide:lock" class="w-3.5 h-3.5" />
            <span>Cerrar Ronda</span>
          </button>
        </div>
      </div>

      <!-- Notifications -->
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

      <!-- CRITICAL TIE NOTIFICATION (Carbon Style) -->
      <div v-if="calc.hasCriticalTie" class="p-4 bg-[#f1c21b]/10 border-l-4 border-[#f1c21b] text-xs text-[#f1c21b] space-y-1">
        <div class="flex items-center gap-2 font-bold font-mono uppercase tracking-wider">
          <UIcon name="lucide:alert-triangle" class="w-4 h-4 flex-shrink-0" />
          <span>Empate Crítico Detectado</span>
        </div>
        <p class="font-sans text-white text-xs">
          {{ calc.criticalTieMessage }}
        </p>
        <p class="text-[11px] text-[#f1c21b] font-mono">
          El cierre de la ronda está bloqueado hasta seleccionar manualmente los clasificados con los botones de la tabla.
        </p>
      </div>

      <!-- MISSING JUDGES WARNING -->
      <div v-if="calc.missingJudgesCount > 0 && calc.round.status === 'open'" class="p-3.5 bg-[#262626] border-l-4 border-[#78a9ff] text-xs text-[#c6c6c6] flex items-center gap-2 font-mono">
        <UIcon name="lucide:clock" class="w-4 h-4 text-[#78a9ff] flex-shrink-0" />
        <span>
          Jueces pendientes ({{ calc.missingJudgesCount }}):
          <strong class="text-white">{{ calc.assignedJudges.filter((j: any) => !j.submitted).map((j: any) => j.name).join(', ') }}</strong>.
          Puedes esperar a que envíen o cerrar calculando con lo registrado.
        </span>
      </div>

      <!-- TOGGLE VIEW MODE (Carbon Flat Tabs) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#393939] pb-px">
        <div class="flex">
          <button
            @click="viewMode = 'ranking'"
            class="carbon-tab"
            :class="viewMode === 'ranking' ? 'carbon-tab-active' : ''"
          >
            <UIcon name="lucide:list-ordered" class="w-4 h-4" />
            <span>Tabla de Posiciones {{ calc.round.status === 'open' ? '(Preliminar)' : '(Oficial)' }}</span>
          </button>

          <button
            @click="viewMode = 'progress'"
            class="carbon-tab"
            :class="viewMode === 'progress' ? 'carbon-tab-active' : ''"
          >
            <UIcon name="lucide:users" class="w-4 h-4" />
            <span>Progreso de Jueces ({{ calc.submittedJudgesCount }}/{{ calc.assignedJudges.length }})</span>
          </button>
        </div>

        <div class="text-xs font-mono text-[#8d8d8d] px-2 py-1">
          Total Participantes: <strong class="text-white">{{ calc.totalParticipants }}</strong>
        </div>
      </div>

      <!-- VISTA 1: PROGRESO DE JUECES -->
      <div v-if="viewMode === 'progress'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div
          v-for="j in calc.assignedJudges"
          :key="j.id"
          class="carbon-tile p-4 flex items-center justify-between"
          :class="j.submitted ? 'border-l-4 border-l-[#24a148]' : 'border-l-4 border-l-[#525252]'"
        >
          <div>
            <h4 class="font-semibold text-white text-xs">{{ j.name }}</h4>
            <p class="text-[11px] text-[#8d8d8d] font-mono">{{ j.email }}</p>
            <p v-if="j.submittedAt" class="text-[10px] text-[#42be65] mt-1 font-mono">
              Enviado: {{ new Date(j.submittedAt).toLocaleTimeString() }}
            </p>
          </div>
          <span
            class="carbon-tag"
            :class="j.submitted ? 'carbon-tag-green' : 'carbon-tag-gray'"
          >
            {{ j.submitted ? 'ENVIADO' : 'PENDIENTE' }}
          </span>
        </div>
      </div>

      <!-- VISTA 2: TABLA DE POSICIONES (Carbon Table) -->
      <div v-if="viewMode === 'ranking'" class="carbon-tile overflow-x-auto">
        <table class="w-full text-left text-xs min-w-[650px]">
          <thead class="carbon-table-header">
            <tr>
              <th class="px-5 py-3">Puesto</th>
              <th class="px-5 py-3">Participante</th>
              <th class="px-5 py-3">Puntaje Ronda</th>
              <th v-if="calc.edition.accumulateRounds" class="px-5 py-3">Puntaje Acumulado</th>
              <th class="px-5 py-3">Estado Avance</th>
              <th v-if="calc.round.status === 'open'" class="px-5 py-3 text-right">Resolución Manual (Empates)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#333333]">
            <tr
              v-for="r in calc.results"
              :key="r.participantId"
              class="hover:bg-[#2e2e2e] transition"
              :class="r.tieFlag ? 'bg-[#f1c21b]/5 border-l-2 border-l-[#f1c21b]' : ''"
            >
              <!-- Rank -->
              <td class="px-5 py-3 font-mono font-bold text-sm">
                <span :class="r.rank === 1 ? 'text-[#f1c21b]' : 'text-white'">
                  #{{ r.rank }}
                </span>
                <span v-if="r.tieFlag" class="carbon-tag carbon-tag-warm ml-2 text-[10px]">
                  EMPATE
                </span>
              </td>

              <!-- Participant -->
              <td class="px-5 py-3">
                <div class="font-medium text-white">{{ r.name }}</div>
                <div class="font-mono text-[11px] text-[#8d8d8d]">Código: {{ r.code }}</div>
              </td>

              <!-- Round Score -->
              <td class="px-5 py-3 font-mono font-bold text-sm text-[#78a9ff]">
                {{ Number(r.roundScore).toFixed(2) }}
              </td>

              <!-- Cumulative Score -->
              <td v-if="calc.edition.accumulateRounds" class="px-5 py-3 font-mono font-bold text-sm text-white">
                {{ Number(r.cumulativeScore).toFixed(2) }}
              </td>

              <!-- Advanced Badge -->
              <td class="px-5 py-3">
                <span
                  class="carbon-tag"
                  :class="r.advanced ? 'carbon-tag-green' : 'carbon-tag-red'"
                >
                  {{ r.advanced ? 'AVANZA' : 'ELIMINADA' }}
                  <span v-if="r.manualAdvance !== null && r.manualAdvance !== undefined" class="text-[9px] ml-1">
                    (MANUAL)
                  </span>
                </span>
              </td>

              <!-- Manual resolution buttons -->
              <td v-if="calc.round.status === 'open'" class="px-5 py-3 text-right space-x-2">
                <button
                  :disabled="isResolving"
                  @click="resolveTie(r.participantId, true)"
                  class="h-7 px-2.5 text-xs font-semibold transition border cursor-pointer"
                  :class="r.manualAdvance === true ? 'bg-[#0e6027] text-white border-transparent' : 'bg-[#262626] hover:bg-[#393939] text-[#42be65] border-[#525252]'"
                >
                  Avanza
                </button>
                <button
                  :disabled="isResolving"
                  @click="resolveTie(r.participantId, false)"
                  class="h-7 px-2.5 text-xs font-semibold transition border cursor-pointer"
                  :class="r.manualAdvance === false ? 'bg-[#750e13] text-white border-transparent' : 'bg-[#262626] hover:bg-[#393939] text-[#ff8389] border-[#525252]'"
                >
                  No Avanza
                </button>
              </td>
            </tr>

            <tr v-if="!calc.results || calc.results.length === 0">
              <td :colspan="calc.edition.accumulateRounds ? 6 : 5" class="px-5 py-8 text-center text-[#8d8d8d] font-mono">
                No hay calificaciones procesadas para mostrar.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
