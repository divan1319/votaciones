<script setup lang="ts">
import { authClient } from '~~/app/utils/auth-client';

const { data: session } = await useFetch('/api/me');
const isMobileMenuOpen = ref(false);

async function handleLogout() {
  await authClient.signOut();
  isMobileMenuOpen.value = false;
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen text-slate-100 flex flex-col font-sans">
    <!-- Admin Header -->
    <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <NuxtLink to="/admin/contests" class="flex items-center gap-2 font-bold text-lg text-emerald-400">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UIcon name="lucide:shield-check" class="w-5 h-5" />
            </div>
            <span class="tracking-tight text-white font-extrabold">Panel <span class="text-emerald-400 font-semibold text-sm">Admin</span></span>
          </NuxtLink>

          <!-- Desktop Nav -->
          <nav class="hidden md:flex items-center gap-1">
            <NuxtLink to="/admin/contests">
              <UButton variant="ghost" color="neutral" size="sm" icon="lucide:trophy">
                Concursos y Ediciones
              </UButton>
            </NuxtLink>
          </nav>
        </div>

        <!-- Desktop Actions -->
        <div class="hidden md:flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
            <UIcon name="lucide:user" class="w-3.5 h-3.5 text-slate-400" />
            <span class="font-medium text-xs">{{ session?.user?.name }}</span>
            <UBadge color="primary" variant="subtle" size="xs">Admin</UBadge>
          </div>

          <NuxtLink to="/judge" title="Simular cabina de juez">
            <UButton variant="ghost" color="neutral" size="sm" icon="lucide:user-check">
              Vista Juez
            </UButton>
          </NuxtLink>

          <UButton variant="ghost" color="error" size="sm" icon="lucide:log-out" @click="handleLogout">
            Salir
          </UButton>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <div class="flex md:hidden items-center gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            :icon="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'"
            aria-label="Abrir Menú"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          />
        </div>
      </div>

      <!-- Mobile Dropdown Navigation -->
      <div v-if="isMobileMenuOpen" class="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-xl px-4 py-4 space-y-3">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <p class="text-sm font-semibold text-white">{{ session?.user?.name }}</p>
            <p class="text-xs text-slate-400">{{ session?.user?.email }}</p>
          </div>
          <UBadge color="primary" variant="subtle" size="xs">Administrador</UBadge>
        </div>

        <div class="space-y-1.5 pt-1">
          <NuxtLink to="/admin/contests" @click="isMobileMenuOpen = false">
            <UButton variant="ghost" color="neutral" block class="justify-start" icon="lucide:trophy">
              Concursos y Ediciones
            </UButton>
          </NuxtLink>
          <NuxtLink to="/judge" @click="isMobileMenuOpen = false">
            <UButton variant="ghost" color="neutral" block class="justify-start" icon="lucide:user-check">
              Simular Vista Juez
            </UButton>
          </NuxtLink>
          <UButton variant="ghost" color="error" block class="justify-start" icon="lucide:log-out" @click="handleLogout">
            Cerrar Sesión
          </UButton>
        </div>
      </div>
    </header>

    <!-- Admin Body -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <slot />
    </main>

    <footer class="border-t border-slate-900 bg-slate-950/60 backdrop-blur py-4 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Panel de Control del Administrador &bull; Base de Datos PostgreSQL</span>
        <span class="text-slate-600">Sistema Concursos v1.0</span>
      </div>
    </footer>
  </div>
</template>
