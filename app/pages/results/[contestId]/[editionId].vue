<script setup lang="ts">
const route = useRoute();
const contestId = route.params.contestId as string;
const editionId = route.params.editionId as string;

const { data: results, error } = await useFetch(
  `/api/public/contests/${contestId}/editions/${editionId}/results`
);
</script>

<template>
  <div class="min-h-[85vh] py-12 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col justify-center">
    <!-- State: Not Published or Not Finished -->
    <div v-if="error || !results" class="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
      <div class="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4">
        <UIcon name="lucide:lock" class="w-8 h-8" />
      </div>
      <h1 class="text-2xl font-bold text-white">Resultados Oficiales No Disponibles</h1>
      <p class="text-sm text-slate-400 max-w-md mx-auto mt-2">
        {{ error?.data?.message || 'Los resultados de este certamen aún no han sido publicados de forma oficial por los organizadores.' }}
      </p>
      <NuxtLink to="/" class="mt-6 inline-block">
        <UButton variant="outline" color="neutral" icon="lucide:arrow-left" size="sm">
          Volver al Inicio
        </UButton>
      </NuxtLink>
    </div>

    <!-- Official Results Display -->
    <div v-else class="space-y-12">
      <!-- Title Header -->
      <div class="text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
          <UIcon name="lucide:sparkles" class="w-4 h-4" />
          Resultados Oficiales
        </div>
        <h1 class="text-4xl sm:text-5xl font-black text-white tracking-tight">
          {{ results.contest.name }}
        </h1>
        <p class="text-lg text-slate-400 mt-2">
          Edición {{ results.edition.name }} &bull; Concluido oficialmente
        </p>
      </div>

      <!-- PRIMER LUGAR / GANADORA DESTACADA -->
      <div v-if="results.winner" class="relative overflow-hidden bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-3xl p-8 sm:p-12 text-center shadow-2xl shadow-amber-500/10">
        <div class="inline-flex p-4 rounded-3xl bg-amber-500/20 text-amber-400 mb-6 shadow-inner">
          <UIcon name="lucide:crown" class="w-16 h-16" />
        </div>

        <span class="block text-xs uppercase tracking-widest font-extrabold text-amber-400 mb-1">
          GANADORA DEL CERTAMEN
        </span>

        <h2 class="text-4xl sm:text-6xl font-black text-white tracking-tight">
          {{ results.winner.name }}
        </h2>

        <div class="mt-4 inline-block font-mono text-sm px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-bold">
          Participante {{ results.winner.code }}
        </div>
      </div>

      <!-- FINALISTAS / CUADRO DE HONOR -->
      <div v-if="results.finalists && results.finalists.length > 0" class="space-y-4">
        <h3 class="text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          Cuadro de Honor y Finalistas
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="f in results.finalists"
            :key="f.rank"
            class="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center hover:border-slate-700 transition"
          >
            <div class="text-xs font-mono font-bold text-slate-400 mb-1">
              PUESTO #{{ f.rank }}
            </div>
            <h4 class="text-xl font-bold text-white">{{ f.name }}</h4>
            <span class="text-xs font-mono text-emerald-400 mt-1 block">Código: {{ f.code }}</span>
          </div>
        </div>
      </div>

      <!-- PREMIOS ESPECIALES -->
      <div v-if="results.specialAwards && results.specialAwards.length > 0" class="space-y-4">
        <h3 class="text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          Premios Especiales
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div
            v-for="aw in results.specialAwards"
            :key="aw.awardId"
            class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between"
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                <UIcon name="lucide:award" class="w-6 h-6" />
              </div>
              <div>
                <span class="text-[10px] uppercase font-bold text-slate-400">Premio Especial</span>
                <h4 class="text-lg font-bold text-white leading-tight">{{ aw.awardName }}</h4>
              </div>
            </div>

            <div class="pt-3 border-t border-slate-800/80">
              <span class="text-xs text-slate-400 block mb-1">Ganadora:</span>
              <div v-for="w in aw.winners" :key="w.code" class="text-sm font-bold text-amber-300">
                {{ w.name }} <span class="font-mono text-xs text-slate-400">({{ w.code }})</span>
              </div>
              <div v-if="!aw.winners || aw.winners.length === 0" class="text-xs text-slate-500 italic">
                Pendiente de asignación
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
