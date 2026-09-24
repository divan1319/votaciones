<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const route = useRoute();
const roundId = route.params.id as string;

const { data: calc, refresh } = await useFetch(`/api/admin/rounds/${roundId}/live`);

// Toggle recomendado: Progreso de envío vs Ranking Preliminar
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
    alert(calc.value.criticalTieMessage || 'Debes resolver los empates críticos antes de cerrar la ronda.');
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
  <div v-if="calc" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2 text-xs text-slate-400">
      <NuxtLink :to="`/admin/editions/${calc.edition.id}`" class="hover:text-emerald-400 transition flex items-center gap-1">
        <UIcon name="lucide:arrow-left" class="w-3 h-3" />
        Volver a Edición {{ calc.edition.name }}
      </NuxtLink>
      <span>/</span>
      <span class="text-slate-200">Monitor Ronda {{ calc.round.position }}: {{ calc.round.name }}</span>
    </div>

    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-black text-white tracking-tight">
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
        <p class="text-xs text-slate-400 mt-2">
          {{ calc.edition.name }} &bull; Método: <strong class="capitalize text-slate-300">{{ calc.edition.scoringMethod === 'average' ? 'Promedio' : 'Suma' }}</strong> &bull;
          Avance: <strong class="text-slate-300">{{ calc.round.advanceMode === 'top_n' ? `Top ${calc.round.advanceValue}` : `Mínimo ${calc.round.advanceValue} pts` }}</strong>
        </p>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-3">
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
    <div v-if="errorMsg" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center justify-between">
      <span>{{ errorMsg }}</span>
      <UButton variant="ghost" color="rose" size="xs" icon="lucide:x" @click="errorMsg = ''" />
    </div>

    <div v-if="successMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center justify-between">
      <span>{{ successMsg }}</span>
      <UButton variant="ghost" color="emerald" size="xs" icon="lucide:x" @click="successMsg = ''" />
    </div>

    <!-- CRITICAL TIE ALERT (Ámbar) -->
    <div v-if="calc.hasCriticalTie" class="p-5 bg-amber-950/40 border border-amber-500/50 rounded-3xl text-amber-200">
      <div class="flex items-start gap-3">
        <UIcon name="lucide:alert-triangle" class="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 class="font-bold text-base text-amber-300">Empate Crítico Detectado</h3>
          <p class="text-sm mt-1 text-amber-200/90">{{ calc.criticalTieMessage }}</p>
          <p class="text-xs text-amber-300/70 mt-2">
            El cierre de la ronda está bloqueado hasta que selecciones manualmente quién clasifica o gana usando los botones en la tabla.
          </p>
        </div>
      </div>
    </div>

    <!-- MISSING JUDGES WARNING -->
    <div v-if="calc.missingJudgesCount > 0 && calc.round.status === 'open'" class="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs flex items-center gap-3">
      <UIcon name="lucide:clock" class="w-5 h-5 text-amber-400 flex-shrink-0" />
      <div>
        <strong>Jueces pendientes de enviar ({{ calc.missingJudgesCount }}):</strong>
        {{ calc.assignedJudges.filter((j: any) => !j.submitted).map((j: any) => j.name).join(', ') }}.
        <span class="text-slate-400 ml-1">Puedes esperar a que terminen o cerrar la ronda con lo enviado.</span>
      </div>
    </div>

    <!-- TOGGLE VIEW MODE -->
    <div class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div class="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        <button
          @click="viewMode = 'ranking'"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          :class="viewMode === 'ranking' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'"
        >
          <UIcon name="lucide:list-ordered" class="w-4 h-4" />
          Tabla de Posiciones {{ calc.round.status === 'open' ? '(Preliminar)' : '(Oficial)' }}
        </button>

        <button
          @click="viewMode = 'progress'"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          :class="viewMode === 'progress' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'"
        >
          <UIcon name="lucide:users" class="w-4 h-4" />
          Progreso de Jueces ({{ calc.submittedJudgesCount }}/{{ calc.assignedJudges.length }})
        </button>
      </div>

      <div class="text-xs text-slate-400">
        Total Participantes: <strong class="text-slate-200">{{ calc.totalParticipants }}</strong>
      </div>
    </div>

    <!-- VISTA 1: PROGRESO DE JUECES -->
    <div v-if="viewMode === 'progress'" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="j in calc.assignedJudges"
          :key="j.id"
          class="bg-slate-900 border rounded-2xl p-4 flex items-center justify-between"
          :class="j.submitted ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800'"
        >
          <div>
            <h4 class="font-semibold text-white text-sm">{{ j.name }}</h4>
            <p class="text-xs text-slate-400 font-mono">{{ j.email }}</p>
            <p v-if="j.submittedAt" class="text-xs text-emerald-400 mt-1">
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
    <div v-if="viewMode === 'ranking'" class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
      <table class="w-full text-left text-sm">
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
              <div class="font-medium text-white">{{ r.name }}</div>
              <div class="font-mono text-xs text-slate-400">Código: {{ r.code }}</div>
            </td>

            <!-- Round Score -->
            <td class="px-6 py-4 font-mono font-bold text-emerald-400">
              {{ r.roundScore.toFixed(2) }}
            </td>

            <!-- Cumulative Score -->
            <td v-if="calc.edition.accumulateRounds" class="px-6 py-4 font-mono font-bold text-teal-300">
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
            <td colspan="6" class="px-6 py-10 text-center text-slate-500">
              No hay calificaciones procesadas para mostrar.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
