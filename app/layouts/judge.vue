<script setup lang="ts">
import { authClient } from '~~/app/utils/auth-client';

const { data: session } = await useFetch('/api/me');
const route = useRoute();

async function handleLogout() {
  await authClient.signOut();
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen bg-[#161616] text-[#f4f4f4] flex flex-col font-sans">
    <!-- Carbon UI Shell Judge Header (48px) -->
    <header class="carbon-header sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <div class="flex items-center h-full gap-6">
          <NuxtLink to="/judge" class="flex items-center gap-2 text-sm">
            <div class="w-6 h-6 bg-[#6929c4] flex items-center justify-center text-white font-bold text-xs rounded-none">
              J
            </div>
            <span class="font-bold text-white tracking-wide uppercase">Cabina Juez</span>
            <span class="text-[#8d8d8d] hidden sm:inline">| Evaluación Oficial</span>
          </NuxtLink>

          <nav class="hidden md:flex items-center h-full">
            <NuxtLink
              to="/judge"
              class="carbon-tab h-12 border-t-2 border-t-transparent"
              :class="route.path === '/judge' ? 'carbon-tab-active' : ''"
            >
              <UIcon name="lucide:vote" class="w-4 h-4 text-[#d4bbff]" />
              <span>Mis Rondas</span>
            </NuxtLink>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#262626] border border-[#393939] text-xs">
            <span class="font-medium text-[#c6c6c6]">{{ session?.user?.name }}</span>
            <span class="carbon-tag carbon-tag-purple">JUEZ OFICIAL</span>
          </div>

          <NuxtLink v-if="session?.user?.role === 'admin'" to="/admin/contests">
            <button class="h-8 px-3 text-xs text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#393939] flex items-center gap-1.5 transition">
              <UIcon name="lucide:arrow-left" class="w-3.5 h-3.5" />
              <span>Panel Admin</span>
            </button>
          </NuxtLink>

          <button
            @click="handleLogout"
            class="h-8 px-3 text-xs text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-transparent hover:border-[#525252] flex items-center gap-1.5 transition"
          >
            <UIcon name="lucide:log-out" class="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <slot />
    </main>

    <footer class="border-t border-[#393939] bg-[#161616] py-3 text-xs text-[#8d8d8d]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] font-mono">
        <span class="flex items-center gap-1.5 text-[#c6c6c6]">
          <UIcon name="lucide:shield-check" class="w-3.5 h-3.5 text-[#42be65]" />
          Cabina Segura &bull; Las calificaciones enviadas son definitivas e inmutables según el reglamento.
        </span>
        <span>Juez: {{ session?.user?.email }}</span>
      </div>
    </footer>
  </div>
</template>
