<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const roundId = route.params.id as string;

const { data: calc, status, refresh } = await useFetch(`/api/admin/rounds/${roundId}/live`);

// Toggle: Progreso de jueces vs Tabla de Posiciones
const viewMode = ref<'progress' | 'ranking'>('ranking');
const isResolving = ref(false);
const isClosing = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Auto-refresh cada 5 segundos si la ronda está abierta
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

// Resolver desempate manualmente
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

// Cerrar Ronda
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
  <div>
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <USkeleton class="h-4 w-48 rounded" />
      <USkeleton class="h-28 w-full rounded-3xl" />
      <div class="flex justify-between items-center">
        <USkeleton class="h-10 w-72 rounded-xl" />
        <USkeleton class="h-6 w-32 rounded" />
      </div>
      <USkeleton class="h-80 w-full rounded-3xl" />
    </div>

    <!-- MAIN MONITOR -->
    <div v-else-if="calc" class="space-y-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <NuxtLink :to="`/admin/editions/${calc.edition.id}`" class="hover:text-emerald-400 transition flex items-center gap-1">
          <UIcon name="lucide:arrow-left" class="w-3 h-3" />
          Volver a Edición {{ calc.edition.name }}
        </NuxtLink>
        <span>/</span>
        <span class="text-slate-200 font-medium">Monitor Ronda {{ calc.round.position }}: {{ calc.round.name }}</span>
      </div>

      <!-- Header Banner -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl backdrop-blur-md">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {{ calc.round.name }}
            </h1>
            <UBadge
              :color="calc.round.status === 'open' ? 'success' : calc.round.status === 'closed' ? 'neutral' : 'warning'"
              variant="subtle"
              size="md"
            >
              {{ calc.round.status === 'open' ? 'En Vivo (Abierta)' : calc.round.status === 'closed' ? 'Cerrada y Congelada' : 'Pendiente' }}
            </UBadge>
          </div>
          <p class="text-xs text-slate-400 mt-2 flex flex-wrap gap-2">
            <span>{{ calc.edition.name }}</span>
            <span>&bull;</span>
            <span>Método: <strong class="capitalize text-slate-300">{{ calc.edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong></span>
            <span>&bull;</span>
            <span>Avance: <strong class="text-slate-300">{{ calc.round.advanceMode === 'top_n' ? `Top ${calc.round.advanceValue}` : `Mínimo ${calc.round.advanceValue} pts` }}</strong></span>
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex flex-wrap items-center gap-3">
          <UButton
            variant="outline"
            color="neutral"
            icon="lucide:refresh-cw"
            size="sm"
            @click="refresh"
          >
            Actualizar
          </UButton>

          <UButton
            v-if="calc.round.status === 'open'"
            color="primary"
            icon="lucide:lock"
            size="md"
            :disabled="calc.hasCriticalTie"
            :loading="isClosing"
            @click="handleCloseRound"
          >
            Cerrar Ronda
          </UButton>
        </div>
      </div>

      <!-- Error / Success Alerts -->
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
          title="Operación Exitosa"
          :description="successMsg"
          icon="lucide:check-circle"
          :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
          @close="successMsg = ''"
        />
      </div>

      <!-- CRITICAL TIE ALERT (UAlert con icono de advertencia) -->
      <div v-if="calc.hasCriticalTie">
        <UAlert
          color="warning"
          variant="subtle"
          title="Empate Crítico Detectado"
          :description="`${calc.criticalTieMessage} El cierre de la ronda está bloqueado hasta que selecciones manualmente quién clasifica o gana usando los botones en la tabla.`"
          icon="lucide:alert-triangle"
        />
      </div>

      <!-- MISSING JUDGES WARNING -->
      <div v-if="calc.missingJudgesCount > 0 && calc.round.status === 'open'">
        <UAlert
          color="neutral"
          variant="subtle"
          :title="`Jueces pendientes de enviar (${calc.missingJudgesCount})`"
          :description="`Pendientes: ${calc.assignedJudges.filter((j: any) => !j.submitted).map((j: any) => j.name).join(', ')}. Puedes esperar a que envíen o cerrar la ronda calculando con lo registrado.`"
          icon="lucide:clock"
        />
      </div>

      <!-- TOGGLE VIEW MODE -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div class="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            @click="viewMode = 'ranking'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            :class="viewMode === 'ranking' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-white'"
          >
            <UIcon name="lucide:list-ordered" class="w-4 h-4" />
            Tabla de Posiciones {{ calc.round.status === 'open' ? '(Preliminar)' : '(Oficial)' }}
          </button>

          <button
            @click="viewMode = 'progress'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            :class="viewMode === 'progress' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm' : 'text-slate-400 hover:text-white'"
          >
            <UIcon name="lucide:users" class="w-4 h-4" />
            Progreso de Jueces ({{ calc.submittedJudgesCount }}/{{ calc.assignedJudges.length }})
          </button>
        </div>

        <div class="text-xs text-slate-400 font-mono">
          Total Participantes: <strong class="text-emerald-400">{{ calc.totalParticipants }}</strong>
        </div>
      </div>

      <!-- VISTA 1: PROGRESO DE JUECES -->
      <div v-if="viewMode === 'progress'" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div
            v-for="j in calc.assignedJudges"
            :key="j.id"
            class="bg-slate-900 border rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition"
            :class="j.submitted ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800'"
          >
            <div>
              <h4 class="font-semibold text-white text-sm">{{ j.name }}</h4>
              <p class="text-xs text-slate-400 font-mono">{{ j.email }}</p>
              <p v-if="j.submittedAt" class="text-[11px] text-emerald-400 mt-1 font-mono">
                Enviado: {{ new Date(j.submittedAt).toLocaleTimeString() }}
              </p>
            </div>
            <UBadge :color="j.submitted ? 'success' : 'neutral'" variant="subtle" size="sm">
              {{ j.submitted ? 'Enviado' : 'Pendiente' }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- VISTA 2: TABLA DE POSICIONES -->
      <div v-if="viewMode === 'ranking'" class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm min-w-[650px]">
            <thead class="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th class="px-6 py-4">Puesto</th>
                <th class="px-6 py-4">Participante</th>
                <th class="px-6 py-4">Puntaje Ronda</th>
                <th v-if="calc.edition.accumulateRounds" class="px-6 py-4">Puntaje Acumulado</th>
                <th class="px-6 py-4">Estado Avance</th>
                <th v-if="calc.round.status === 'open'" class="px-6 py-4 text-right">Resolución Manual (Empates)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr
                v-for="r in calc.results"
                :key="r.participantId"
                class="hover:bg-slate-800/30 transition"
                :class="r.tieFlag ? 'bg-amber-500/5' : ''"
              >
                <!-- Rank -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-lg" :class="r.rank === 1 ? 'text-amber-400' : 'text-slate-300'">
                      #{{ r.rank }}
                    </span>
                    <UBadge v-if="r.tieFlag" color="warning" size="xs" variant="subtle">
                      Empate
                    </UBadge>
                  </div>
                </td>

                <!-- Participant -->
                <td class="px-6 py-4">
                  <div class="font-semibold text-white">{{ r.name }}</div>
                  <div class="font-mono text-xs text-slate-400">Código: {{ r.code }}</div>
                </td>

                <!-- Round Score -->
                <td class="px-6 py-4 font-mono font-bold text-emerald-400 text-base">
                  {{ r.roundScore.toFixed(2) }}
                </td>

                <!-- Cumulative Score -->
                <td v-if="calc.edition.accumulateRounds" class="px-6 py-4 font-mono font-bold text-teal-300 text-base">
                  {{ r.cumulativeScore.toFixed(2) }}
                </td>

                <!-- Advanced Badge -->
                <td class="px-6 py-4">
                  <UBadge
                    :color="r.advanced ? 'success' : 'error'"
                    variant="subtle"
                    size="sm"
                    class="font-semibold"
                  >
                    {{ r.advanced ? 'Avanza' : 'Eliminada' }}
                    <span v-if="r.manualAdvance !== null && r.manualAdvance !== undefined" class="text-[10px] ml-1 opacity-80">
                      (Manual)
                    </span>
                  </UBadge>
                </td>

                <!-- Manual resolution buttons (solo si ronda abierta) -->
                <td v-if="calc.round.status === 'open'" class="px-6 py-4 text-right space-x-2">
                  <UButton
                    size="xs"
                    :color="r.advanced ? 'success' : 'neutral'"
                    :variant="r.manualAdvance === true ? 'solid' : 'outline'"
                    icon="lucide:check"
                    :disabled="isResolving"
                    @click="resolveTie(r.participantId, true)"
                  >
                    Avanza
                  </UButton>
                  <UButton
                    size="xs"
                    :color="!r.advanced ? 'error' : 'neutral'"
                    :variant="r.manualAdvance === false ? 'solid' : 'outline'"
                    icon="lucide:x"
                    :disabled="isResolving"
                    @click="resolveTie(r.participantId, false)"
                  >
                    No Avanza
                  </UButton>
                </td>
              </tr>

              <tr v-if="!calc.results || calc.results.length === 0">
                <td :colspan="calc.edition.accumulateRounds ? 6 : 5" class="px-6 py-12 text-center text-slate-500">
                  <UIcon name="lucide:inbox" class="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No hay calificaciones procesadas para mostrar por el momento.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
