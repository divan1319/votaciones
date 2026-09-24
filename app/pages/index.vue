<script setup lang="ts">
useHead({
  title: 'Consola Central',
});

const { data: session } = await useFetch('/api/me');
</script>

<template>
  <div class="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
    <!-- Top System Status Strip -->
    <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#1c1c1c] border border-[#393939] text-xs font-mono">
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1.5 text-[#42be65]">
          <span class="w-2 h-2 rounded-none bg-[#24a148] animate-pulse"></span>
          <span>SISTEMA OPERATIVO</span>
        </span>
        <span class="text-[#525252]">|</span>
        <span class="text-[#c6c6c6]">BASE DE DATOS: POSTGRESQL ACTIVA</span>
        <span class="text-[#525252] hidden sm:inline">|</span>
        <span class="text-[#c6c6c6] hidden sm:inline">INMUTABILIDAD: STRICT LOCK</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="carbon-tag carbon-tag-blue">ENTERPRISE EDITION</span>
        <span class="carbon-tag carbon-tag-gray">v2.4</span>
      </div>
    </div>

    <!-- Main Hero Console Header -->
    <div class="border-b border-[#393939] pb-8 pt-2">
      <div class="max-w-3xl space-y-4">
        <div class="text-xs font-mono uppercase tracking-widest text-[#78a9ff] font-semibold">
          Plataforma de Evaluación y Votación Oficial
        </div>
        <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Control Centralizado de Certámenes y Concursos
        </h1>
        <p class="text-sm sm:text-base text-[#c6c6c6] leading-relaxed">
          Estructura integral organizada por certámenes, ediciones anuales y rondas eliminatorias con cálculo matemático determinista, tolerancia a ausencias de jueces y auditoría inalterable.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <template v-if="!session?.user">
          <NuxtLink to="/login">
            <button class="h-10 px-5 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition">
              <UIcon name="lucide:log-in" class="w-4 h-4" />
              <span>Acceder al Sistema</span>
            </button>
          </NuxtLink>
        </template>
        <template v-else>
          <NuxtLink v-if="session.user.role === 'admin'" to="/admin/contests">
            <button class="h-10 px-5 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition">
              <UIcon name="lucide:layout-grid" class="w-4 h-4" />
              <span>Panel de Control de Administrador</span>
            </button>
          </NuxtLink>
          <NuxtLink to="/judge">
            <button class="h-10 px-5 bg-[#262626] hover:bg-[#393939] border border-[#525252] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition">
              <UIcon name="lucide:vote" class="w-4 h-4 text-[#78a9ff]" />
              <span>Entrar a la Cabina del Juez</span>
            </button>
          </NuxtLink>
        </template>
      </div>
    </div>

    <!-- Carbon 4-Tile Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Tile 1 -->
      <div class="carbon-tile p-5 flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <UIcon name="lucide:layers" class="w-5 h-5 text-[#78a9ff]" />
            <span class="carbon-tag carbon-tag-gray">ARQUITECTURA</span>
          </div>
          <h3 class="text-base font-bold text-white">Jerarquía Concurso &bull; Edición &bull; Ronda</h3>
          <p class="text-xs text-[#8d8d8d] leading-relaxed">
            Las rondas siempre existen. Si una edición no contempla fases múltiples, se genera automáticamente una ronda "Final".
          </p>
        </div>
        <div class="pt-3 border-t border-[#333333] text-[11px] font-mono text-[#c6c6c6]">
          Escalas de 1 a 10 o configurables
        </div>
      </div>

      <!-- Tile 2 -->
      <div class="carbon-tile p-5 flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <UIcon name="lucide:scale" class="w-5 h-5 text-[#42be65]" />
            <span class="carbon-tag carbon-tag-green">EQUIDAD</span>
          </div>
          <h3 class="text-base font-bold text-white">Normalización 0–100 y Equidad</h3>
          <p class="text-xs text-[#8d8d8d] leading-relaxed">
            Ningún juez puede enviar votación sin calificar a todas las participantes, previniendo asimetrías de ponderación.
          </p>
        </div>
        <div class="pt-3 border-t border-[#333333] text-[11px] font-mono text-[#c6c6c6]">
          Tolerancia a jueces ausentes
        </div>
      </div>

      <!-- Tile 3 -->
      <div class="carbon-tile p-5 flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <UIcon name="lucide:shield-alert" class="w-5 h-5 text-[#f1c21b]" />
            <span class="carbon-tag carbon-tag-warm">ARBITRAJE</span>
          </div>
          <h3 class="text-base font-bold text-white">Detección de Empates Críticos</h3>
          <p class="text-xs text-[#8d8d8d] leading-relaxed">
            Si hay empate en el puesto de corte (Top N) o en el 1er lugar de la Final, el cierre se bloquea hasta resolución manual.
          </p>
        </div>
        <div class="pt-3 border-t border-[#333333] text-[11px] font-mono text-[#c6c6c6]">
          Resolución registrada en auditoría
        </div>
      </div>

      <!-- Tile 4 -->
      <div class="carbon-tile p-5 flex flex-col justify-between space-y-4">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <UIcon name="lucide:award" class="w-5 h-5 text-[#d4bbff]" />
            <span class="carbon-tag carbon-tag-purple">PREMIOS</span>
          </div>
          <h3 class="text-base font-bold text-white">Premios Especiales & Boletín</h3>
          <p class="text-xs text-[#8d8d8d] leading-relaxed">
            Premios independientes por criterios acumulados, métricas cuantitativas (voto de redes) o discrecionales con página pública.
          </p>
        </div>
        <div class="pt-3 border-t border-[#333333] text-[11px] font-mono text-[#c6c6c6]">
          Página oficial homologada
        </div>
      </div>
    </div>
  </div>
</template>
