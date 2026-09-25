<script setup lang="ts">
definePageMeta({
  layout: 'judge',
  middleware: 'judge',
});

useHead({
  title: 'Mis Rondas de Calificación',
});

const { data: roundsList, status, refresh } = await useFetch('/api/judge/rounds');
</script>

<template>
  <div class="space-y-6">
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-6">
      <div class="space-y-2">
        <USkeleton class="h-8 w-64 rounded-none" />
        <USkeleton class="h-4 w-96 rounded-none" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <USkeleton v-for="i in 2" :key="i" class="h-60 rounded-none" />
      </div>
    </div>

    <!-- MAIN LIST -->
    <div v-else class="space-y-6">
      <!-- Carbon Header Toolbar -->
      <div class="border-b border-[#393939] pb-6">
        <div class="text-[11px] font-mono uppercase tracking-wider text-[#d4bbff] font-semibold mb-1">
          Asignaciones de Jurado
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Mis Rondas de Calificación</h1>
        <p class="text-xs sm:text-sm text-[#c6c6c6] mt-1 font-mono">
          Selecciona una fase eliminatoria activa para emitir tus calificaciones oficiales
        </p>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="!roundsList || roundsList.length === 0"
        class="carbon-tile p-12 text-center"
      >
        <div class="w-12 h-12 bg-[#1c1c1c] border border-[#393939] text-[#78a9ff] flex items-center justify-center mx-auto mb-3">
          <UIcon name="lucide:inbox" class="w-6 h-6" />
        </div>
        <h3 class="text-base font-bold text-white">No tienes rondas asignadas por el momento</h3>
        <p class="text-xs text-[#8d8d8d] max-w-sm mx-auto mt-1 mb-6 font-mono">
          El administrador activará la sesión en cuanto una fase comience en el escenario.
        </p>
        <button
          @click="refresh"
          class="h-9 px-4 bg-[#262626] hover:bg-[#393939] border border-[#525252] text-[#c6c6c6] hover:text-white text-xs font-semibold inline-flex items-center gap-2"
        >
          <UIcon name="lucide:refresh-cw" class="w-3.5 h-3.5 text-[#78a9ff]" />
          <span>Comprobar Nuevas Asignaciones</span>
        </button>
      </div>

      <!-- ROUNDS GRID (Carbon Tiles) -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="r in roundsList"
          :key="r.roundId"
          class="carbon-tile p-6 flex flex-col justify-between"
        >
          <div>
            <div class="flex items-start justify-between gap-3 mb-4 border-b border-[#393939] pb-3">
              <div>
                <span class="text-[11px] uppercase font-mono tracking-wider font-semibold text-[#78a9ff]">
                  {{ r.contestName }} &bull; Edición {{ r.editionName }}
                </span>
                <h2 class="text-xl font-bold text-white mt-1">{{ r.roundName }}</h2>
              </div>

              <span
                class="carbon-tag"
                :class="r.isSubmitted ? 'carbon-tag-gray' : r.roundStatus === 'open' ? 'carbon-tag-green' : 'carbon-tag-warm'"
              >
                {{ r.isSubmitted ? 'SELLADA (INMUTABLE)' : r.roundStatus === 'open' ? 'HABILITADA' : 'PENDIENTE DE APERTURA' }}
              </span>
            </div>

            <div class="space-y-1.5 text-xs font-mono text-[#8d8d8d] mb-6">
              <div class="flex justify-between py-1 border-b border-[#333333]">
                <span>Escala Permitida:</span>
                <span class="text-[#78a9ff] font-bold">[{{ r.scaleMin }} &ndash; {{ r.scaleMax }} pts]</span>
              </div>
              <div class="flex justify-between py-1 border-b border-[#333333]">
                <span>Fase del Certamen:</span>
                <span class="text-white">Ronda {{ r.roundPosition }}</span>
              </div>
            </div>

            <div v-if="r.isSubmitted" class="p-3 bg-[#1c1c1c] border-l-4 border-l-[#24a148] text-xs text-[#c6c6c6] font-mono flex items-center gap-2 mb-4">
              <UIcon name="lucide:check-circle" class="w-4 h-4 text-[#42be65] flex-shrink-0" />
              <span>Calificaciones selladas el {{ new Date(r.submittedAt!).toLocaleTimeString() }}.</span>
            </div>
          </div>

          <div class="pt-4 border-t border-[#393939] flex items-center justify-between text-xs">
            <span class="font-mono text-[11px] text-[#8d8d8d]">
              {{ r.isSubmitted ? 'CALIFICACIONES SELLADAS' : r.roundStatus === 'open' ? 'VOTACIÓN ACTIVA' : 'EN ESPERA DE APERTURA' }}
            </span>

            <NuxtLink :to="`/judge/rounds/${r.roundId}`">
              <button
                class="h-9 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer"
                :class="r.isSubmitted || r.roundStatus !== 'open' ? 'bg-[#262626] hover:bg-[#393939] text-[#c6c6c6] border border-[#525252]' : 'bg-[#0f62fe] hover:bg-[#0353e9] text-white'"
              >
                <span>{{ r.isSubmitted ? 'Ver Mis Calificaciones' : r.roundStatus === 'open' ? 'Entrar a Calificar' : 'Ver Cabina (Pendiente)' }}</span>
                <UIcon :name="r.isSubmitted ? 'lucide:eye' : 'lucide:arrow-right'" class="w-3.5 h-3.5" />
              </button>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
