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
    <!-- Navbar -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg text-emerald-400 hover:text-emerald-300 transition">
            <UIcon name="lucide:trophy" class="w-6 h-6 text-amber-400" />
            <span>Sistema de Votación</span>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-4">
          <template v-if="session?.user">
            <div class="flex items-center gap-2 text-sm text-slate-300">
              <span class="font-medium">{{ session.user.name }}</span>
              <UBadge :color="session.user.role === 'admin' ? 'primary' : 'neutral'" variant="subtle" size="sm">
                {{ session.user.role === 'admin' ? 'Administrador' : 'Juez' }}
              </UBadge>
            </div>

            <NuxtLink v-if="session.user.role === 'admin'" to="/admin/contests">
              <UButton variant="ghost" color="neutral" size="sm" icon="lucide:settings">Panel Admin</UButton>
            </NuxtLink>
            <NuxtLink v-else to="/judge">
              <UButton variant="ghost" color="neutral" size="sm" icon="lucide:vote">Mis Rondas</UButton>
            </NuxtLink>

            <UButton variant="ghost" color="error" size="sm" icon="lucide:log-out" @click="handleLogout">
              Salir
            </UButton>
          </template>
          <template v-else>
            <NuxtLink to="/login">
              <UButton color="primary" size="sm" icon="lucide:log-in">Iniciar Sesión</UButton>
            </NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
      <p>Sistema de Votación para Concursos y Certámenes &copy; 2026. Todos los derechos reservados.</p>
    </footer>
  </div>
</template>
