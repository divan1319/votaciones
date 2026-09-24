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
    <!-- Admin Header -->
    <header class="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <NuxtLink to="/admin/contests" class="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <UIcon name="lucide:shield-check" class="w-6 h-6 text-emerald-400" />
            <span>Admin Votaciones</span>
          </NuxtLink>

          <nav class="hidden md:flex items-center gap-2">
            <NuxtLink to="/admin/contests">
              <UButton variant="ghost" color="neutral" size="sm" icon="lucide:trophy">
                Concursos y Ediciones
              </UButton>
            </NuxtLink>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm text-slate-300">
            <span class="font-medium">{{ session?.user?.name }}</span>
            <UBadge color="primary" variant="subtle" size="xs">Admin</UBadge>
          </div>

          <NuxtLink to="/judge" title="Probar cabina de juez">
            <UButton variant="ghost" color="neutral" size="sm" icon="lucide:user-check">
              Vista Juez
            </UButton>
          </NuxtLink>

          <UButton variant="ghost" color="error" size="sm" icon="lucide:log-out" @click="handleLogout">
            Salir
          </UButton>
        </div>
      </div>
    </header>

    <!-- Admin Body -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <footer class="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
      Panel de Control del Administrador &bull; Conexión segura PostgreSQL
    </footer>
  </div>
</template>
