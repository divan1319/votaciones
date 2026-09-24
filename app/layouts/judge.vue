<script setup lang="ts">
import { authClient } from '~~/app/utils/auth-client';

const { data: session } = await useFetch('/api/me');

async function handleLogout() {
  await authClient.signOut();
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen text-slate-100 flex flex-col font-sans">
    <!-- Judge Header -->
    <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/judge" class="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UIcon name="lucide:vote" class="w-5 h-5" />
            </div>
            <span class="tracking-tight text-white font-extrabold">Cabina <span class="text-emerald-400 font-semibold text-sm">Juez</span></span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-3 sm:gap-4">
          <div class="hidden sm:block text-right">
            <div class="text-xs font-semibold text-slate-200">{{ session?.user?.name }}</div>
            <div class="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Juez Oficial</div>
          </div>

          <NuxtLink v-if="session?.user?.role === 'admin'" to="/admin/contests">
            <UButton variant="ghost" color="neutral" size="sm" icon="lucide:arrow-left" class="text-xs">
              <span class="hidden sm:inline">Panel Admin</span>
            </UButton>
          </NuxtLink>

          <UButton variant="ghost" color="error" size="sm" icon="lucide:log-out" @click="handleLogout">
            <span class="hidden sm:inline">Salir</span>
          </UButton>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <slot />
    </main>

    <footer class="border-t border-slate-900 bg-slate-950/60 backdrop-blur py-3 text-center text-xs text-slate-500">
      <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px]">
        <span class="text-slate-400 flex items-center justify-center gap-1">
          <UIcon name="lucide:shield-check" class="w-3.5 h-3.5 text-emerald-500" />
          Cabina Segura &bull; Las calificaciones enviadas son definitivas e inmutables.
        </span>
        <span class="text-slate-600">Sesión activa: {{ session?.user?.email }}</span>
      </div>
    </footer>
  </div>
</template>
