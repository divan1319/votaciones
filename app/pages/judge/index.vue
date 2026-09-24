<script setup lang="ts">
definePageMeta({
  layout: 'judge',
  middleware: 'judge',
});

const { data: roundsList, refresh } = await useFetch('/api/judge/rounds');
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-extrabold text-white tracking-tight">Mis Rondas de Calificación</h1>
      <p class="text-sm text-slate-400 mt-1">Selecciona la ronda activa para emitir tus calificaciones</p>
    </div>

    <div v-if="!roundsList || roundsList.length === 0" class="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl">
      <UIcon name="lucide:inbox" class="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-slate-300">No tienes rondas asignadas por el momento</h3>
      <p class="text-sm text-slate-500 max-w-sm mx-auto mt-1">
        El administrador te notificará en cuanto una ronda sea abierta para calificación.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="r in roundsList"
        :key="r.roundId"
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 transition"
      >
        <div>
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <span class="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                {{ r.contestName }} &bull; {{ r.editionName }}
              </span>
              <h2 class="text-2xl font-bold text-white mt-1">{{ r.roundName }}</h2>
            </div>

            <UBadge
              :color="r.isSubmitted ? 'neutral' : r.roundStatus === 'open' ? 'success' : 'warning'"
              variant="subtle"
              size="sm"
            >
              {{ r.isSubmitted ? 'Enviada (Bloqueada)' : r.roundStatus === 'open' ? 'Abierta para Votar' : 'Pendiente' }}
            </UBadge>
          </div>

          <p class="text-xs text-slate-400 mb-6">
            Escala permitida: <strong class="text-slate-200">[{{ r.scaleMin }} a {{ r.scaleMax }}]</strong> &bull;
            Posición: <strong class="text-slate-200">Ronda {{ r.roundPosition }}</strong>
          </p>

          <div v-if="r.isSubmitted" class="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs text-slate-300 flex items-center gap-2 mb-4">
            <UIcon name="lucide:check-circle" class="w-4 h-4 text-emerald-400" />
            <span>Calificaciones enviadas el {{ new Date(r.submittedAt!).toLocaleTimeString() }}.</span>
          </div>
        </div>

        <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            {{ r.roundStatus === 'open' && !r.isSubmitted ? 'Votación habilitada' : 'Solo lectura' }}
          </span>

          <NuxtLink :to="`/judge/rounds/${r.roundId}`">
            <UButton
              :color="r.isSubmitted ? 'neutral' : 'primary'"
              :variant="r.isSubmitted ? 'outline' : 'solid'"
              size="md"
              :trailing-icon="r.isSubmitted ? 'lucide:eye' : 'lucide:arrow-right'"
            >
              {{ r.isSubmitted ? 'Ver Mis Calificaciones' : 'Entrar a Calificar' }}
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
