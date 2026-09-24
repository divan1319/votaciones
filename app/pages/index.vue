<script setup lang="ts">
const { data: session } = await useFetch('/api/me');
</script>

<template>
  <div class="py-12 md:py-20 max-w-5xl mx-auto px-4 sm:px-6">
    <!-- Hero Header -->
    <div class="text-center mb-16">
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
        <UIcon name="lucide:sparkles" class="w-4 h-4 text-amber-400" />
        Sistema de Votación y Calificación en Tiempo Real
      </div>
      <h1 class="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
        Calificación Transparente para <br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
          Certámenes y Concursos
        </span>
      </h1>
      <p class="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
        Plataforma estructurada por ediciones y rondas con reglas matemáticas deterministas, equidad de jueces, inmutabilidad y cálculo de resultados en vivo.
      </p>

      <div class="mt-8 flex flex-wrap justify-center gap-4">
        <NuxtLink v-if="!session?.user" to="/login">
          <UButton color="primary" size="lg" icon="lucide:log-in">
            Acceder al Sistema
          </UButton>
        </NuxtLink>
        <template v-else>
          <NuxtLink v-if="session.user.role === 'admin'" to="/admin/contests">
            <UButton color="primary" size="lg" icon="lucide:shield-check">
              Ir al Panel de Administrador
            </UButton>
          </NuxtLink>
          <NuxtLink to="/judge">
            <UButton variant="outline" color="neutral" size="lg" icon="lucide:vote">
              Ir a la Cabina del Juez
            </UButton>
          </NuxtLink>
        </template>
      </div>
    </div>

    <!-- Features Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Card 1 -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
          <UIcon name="lucide:lock" class="w-6 h-6" />
        </div>
        <h3 class="text-lg font-bold text-white mb-2">Inmutabilidad Estricta</h3>
        <p class="text-sm text-slate-400">
          Una vez enviada la calificación del juez, el backend bloquea cualquier modificación posterior. La auditoría es inviolable.
        </p>
      </div>

      <!-- Card 2 -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
        <div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
          <UIcon name="lucide:scale" class="w-6 h-6" />
        </div>
        <h3 class="text-lg font-bold text-white mb-2">Equidad y Reglas Claras</h3>
        <p class="text-sm text-slate-400">
          Promedio o suma configurable. Ningún juez puede enviar sin calificar a todos los participantes, garantizando equidad matemática.
        </p>
      </div>

      <!-- Card 3 -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition">
        <div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
          <UIcon name="lucide:award" class="w-6 h-6" />
        </div>
        <h3 class="text-lg font-bold text-white mb-2">Premios Especiales</h3>
        <p class="text-sm text-slate-400">
          Premios independientes por criterios, métricas de redes sociales o discrecionales, con página pública de resultados oficiales.
        </p>
      </div>
    </div>
  </div>
</template>
