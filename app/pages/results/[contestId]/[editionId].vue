<script setup lang="ts">
const route = useRoute();
const contestId = route.params.contestId as string;
const editionId = route.params.editionId as string;

const { data: results, status, error } = await useFetch(
  `/api/public/contests/${contestId}/editions/${editionId}/results`
);

useHead({
  title: () => results.value ? `Resultados: ${results.value.contest.name} ${results.value.edition.name}` : 'Resultados Oficiales',
});
</script>

<template>
  <div class="py-8 sm:py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-8">
    <!-- SKELETON LOADING -->
    <div v-if="status === 'pending'" class="space-y-8">
      <div class="space-y-3">
        <USkeleton class="h-6 w-48 rounded-none" />
        <USkeleton class="h-10 w-96 rounded-none" />
      </div>
      <USkeleton class="h-64 w-full rounded-none" />
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <USkeleton v-for="i in 4" :key="i" class="h-28 rounded-none" />
      </div>
    </div>

    <!-- State: Not Published or Error -->
    <div v-else-if="error || !results" class="carbon-tile p-12 text-center">
      <div class="w-12 h-12 bg-[#1c1c1c] border border-[#525252] text-[#f1c21b] flex items-center justify-center mx-auto mb-3">
        <UIcon name="lucide:lock" class="w-6 h-6" />
      </div>
      <h1 class="text-xl font-bold text-white uppercase font-mono">Resultados No Publicados</h1>
      <p class="text-xs text-[#8d8d8d] max-w-md mx-auto mt-2 font-mono">
        {{ error?.data?.message || 'Los resultados de este certamen aún no han sido proclamados de forma oficial por los organizadores.' }}
      </p>
      <NuxtLink to="/" class="mt-6 inline-block">
        <button class="h-8 px-4 bg-[#262626] hover:bg-[#393939] border border-[#525252] text-xs font-semibold text-[#c6c6c6] hover:text-white flex items-center gap-1.5 transition">
          <UIcon name="lucide:arrow-left" class="w-3.5 h-3.5" />
          <span>Volver al Inicio</span>
        </button>
      </NuxtLink>
    </div>

    <!-- Official Results Bulletin (IBM Carbon Style) -->
    <div v-else class="space-y-8">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-xs font-mono text-[#8d8d8d]">
        <NuxtLink to="/" class="hover:underline text-[#c6c6c6]">Inicio</NuxtLink>
        <span>/</span>
        <span>Resultados Oficiales</span>
        <span>/</span>
        <span class="text-white">{{ results.contest.name }} {{ results.edition.name }}</span>
      </div>

      <!-- Homologation Header Strip -->
      <div class="p-3 bg-[#1c1c1c] border border-[#393939] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div class="flex items-center gap-2 text-[#f1c21b]">
          <UIcon name="lucide:sparkles" class="w-4 h-4 text-[#f1c21b]" />
          <span class="font-bold tracking-wider">BOLETÍN OFICIAL HOMOLOGADO</span>
        </div>
        <div class="flex items-center gap-3 text-[#8d8d8d]">
          <span>CERTAMEN CONCLUIDO</span>
          <span>&bull;</span>
          <span>SELLADO INMUTABLE</span>
        </div>
      </div>

      <!-- Title Header -->
      <div class="border-b border-[#393939] pb-6">
        <div class="text-[11px] font-mono uppercase tracking-wider text-[#78a9ff] font-semibold mb-1">
          Proclamación de Ganadoras
        </div>
        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight">
          {{ results.contest.name }}
        </h1>
        <p class="text-sm sm:text-base text-[#c6c6c6] mt-1 font-mono">
          Edición Oficial {{ results.edition.name }} &bull; Cuadro de Honor Definitivo
        </p>
      </div>

      <!-- PRIMER LUGAR / GANADORA DESTACADA -->
      <div v-if="results.winner" class="carbon-tile p-8 sm:p-10 border-l-4 border-l-[#f1c21b] flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-2 text-center md:text-left">
          <div class="flex items-center justify-center md:justify-start gap-2">
            <span class="carbon-tag carbon-tag-warm font-bold">1ER LUGAR &bull; CORONA OFICIAL</span>
            <span class="font-mono text-xs text-[#8d8d8d]">CÓDIGO #{{ results.winner.code }}</span>
          </div>
          <h2 class="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {{ results.winner.name }}
          </h2>
          <p class="text-xs font-mono text-[#c6c6c6]">
            Proclamada Ganadora del Certamen tras la fase final
          </p>
        </div>

        <div class="w-20 h-20 bg-[#1c1c1c] border border-[#f1c21b]/40 text-[#f1c21b] flex items-center justify-center flex-shrink-0">
          <UIcon name="lucide:crown" class="w-10 h-10" />
        </div>
      </div>

      <!-- FINALISTAS / CUADRO DE HONOR -->
      <div v-if="results.finalists && results.finalists.length > 0" class="space-y-3">
        <h3 class="text-xs font-mono uppercase tracking-widest text-[#8d8d8d] font-bold">
          Cuadro de Honor y Finalistas
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="f in results.finalists"
            :key="f.rank"
            class="carbon-tile p-4 space-y-1"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-[#f1c21b]">PUESTO #{{ f.rank }}</span>
              <span class="font-mono text-[11px] text-[#8d8d8d]">#{{ f.code }}</span>
            </div>
            <h4 class="text-base font-bold text-white truncate">{{ f.name }}</h4>
            <span class="text-[11px] font-mono text-[#78a9ff] block">Finalista Oficial</span>
          </div>
        </div>
      </div>

      <!-- PREMIOS ESPECIALES -->
      <div v-if="results.specialAwards && results.specialAwards.length > 0" class="space-y-3">
        <h3 class="text-xs font-mono uppercase tracking-widest text-[#8d8d8d] font-bold">
          Premios Especiales y Menciones Honoríficas
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div
            v-for="aw in results.specialAwards"
            :key="aw.awardId"
            class="carbon-tile p-5 flex flex-col justify-between space-y-3"
          >
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="carbon-tag carbon-tag-purple">PREMIO ESPECIAL</span>
                <UIcon name="lucide:award" class="w-4 h-4 text-[#d4bbff]" />
              </div>
              <h4 class="text-base font-bold text-white">{{ aw.awardName }}</h4>
            </div>

            <div class="pt-3 border-t border-[#333333] text-xs font-mono">
              <span class="text-[#8d8d8d] block text-[11px]">Galardonada:</span>
              <div v-for="w in aw.winners" :key="w.code" class="text-sm font-bold text-[#f1c21b]">
                {{ w.name }} <span class="text-[#8d8d8d] font-normal text-xs">(#{{ w.code }})</span>
              </div>
              <div v-if="!aw.winners || aw.winners.length === 0" class="text-xs text-[#8d8d8d] italic">
                Pendiente de asignación
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
