<script setup lang="ts">
definePageMeta({
  layout: 'judge',
  middleware: 'judge',
});

const { data: roundsList, status, refresh } = await useFetch('/api/judge/rounds');
</script>

<template>
  <div>
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <div class="space-y-2">
        <USkeleton class="h-8 w-64 rounded-xl" />
        <USkeleton class="h-4 w-96 rounded" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <USkeleton v-for="i in 2" :key="i" class="h-60 rounded-3xl" />
      </div>
    </div>

    <!-- MAIN LIST -->
    <div v-else class="space-y-6">
      <div>
        <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
          <UIcon name="lucide:vote" class="w-3.5 h-3.5 text-amber-400" />
          <span>Panel de Juez Oficial</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Mis Rondas de Calificación</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Selecciona la ronda activa para emitir tus calificaciones definitivas</p>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="!roundsList || roundsList.length === 0"
        class="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-sm"
      >
        <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
          <UIcon name="lucide:inbox" class="w-8 h-8" />
        </div>
        <h3 class="text-lg font-bold text-white">No tienes rondas asignadas por el momento</h3>
        <p class="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          El administrador te notificará en cuanto una ronda sea aperturada para evaluación en el certamen.
        </p>
        <UButton variant="outline" color="neutral" icon="lucide:refresh-cw" size="sm" @click="refresh">
          Verificar Nuevas Rondas
        </UButton>
      </div>

      <!-- ROUNDS GRID -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          v-for="r in roundsList"
          :key="r.roundId"
          class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-500/5 transition duration-200"
        >
          <div>
            <div class="flex items-start justify-between gap-3 mb-4">
              <div>
                <span class="text-xs uppercase tracking-wider font-semibold text-emerald-400 font-mono">
                  {{ r.contestName }} &bull; {{ r.editionName }}
                </span>
                <h2 class="text-xl sm:text-2xl font-black text-white mt-1">{{ r.roundName }}</h2>
              </div>

              <UBadge
                :color="r.isSubmitted ? 'neutral' : r.roundStatus === 'open' ? 'success' : 'warning'"
                variant="subtle"
                size="sm"
                class="flex-shrink-0"
              >
                {{ r.isSubmitted ? 'Enviada (Bloqueada)' : r.roundStatus === 'open' ? 'Abierta para Votar' : 'Pendiente' }}
              </UBadge>
            </div>

            <div class="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/60 text-xs text-slate-400 mb-6 space-y-1.5">
              <div class="flex justify-between">
                <span>Escala Permitida:</span>
                <span class="text-emerald-400 font-mono font-bold">[{{ r.scaleMin }} a {{ r.scaleMax }} pts]</span>
              </div>
              <div class="flex justify-between">
                <span>Etapa del Certamen:</span>
                <span class="text-slate-200 font-medium">Ronda {{ r.roundPosition }}</span>
              </div>
            </div>

            <div v-if="r.isSubmitted" class="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 mb-4">
              <UIcon name="lucide:check-circle" class="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Tus calificaciones fueron selladas de forma inmutable el {{ new Date(r.submittedAt!).toLocaleTimeString() }}.</span>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
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
  </div>
</template>
