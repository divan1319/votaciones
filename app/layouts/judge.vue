<script setup lang="ts">
import { authClient } from '~~/app/utils/auth-client';

const { data: session } = await useFetch('/api/me');

async function handleLogout() {
  await authClient.signOut();
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
    <!-- Judge Header -->
    <header class="border-b border-slate-800 bg-slate-900 sticky top-0 z-50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/judge" class="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <UIcon name="lucide:vote" class="w-6 h-6 text-amber-400" />
            <span>Cabina de Calificación</span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-sm font-semibold text-slate-200">{{ session?.user?.name }}</div>
            <div class="text-xs text-emerald-400">Juez Calificador</div>
          </div>

          <NuxtLink v-if="session?.user?.role === 'admin'" to="/admin/contests">
            <UButton variant="ghost" color="neutral" size="sm" icon="lucide:arrow-left">Panel Admin</UButton>
          </NuxtLink>

          <UButton variant="ghost" color="error" size="sm" icon="lucide:log-out" @click="handleLogout">
            Salir
          </UButton>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
      <slot />
    </main>

    <footer class="border-t border-slate-900 bg-slate-950 py-3 text-center text-xs text-slate-500">
      Las calificaciones enviadas son definitivas e inmutables.
    </footer>
  </div>
</template>
