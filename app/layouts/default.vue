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
    <!-- Navbar -->
    <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <!-- Brand -->
        <NuxtLink to="/" class="flex items-center gap-2.5 font-bold text-lg text-emerald-400 hover:text-emerald-300 transition">
          <div class="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <UIcon name="lucide:trophy" class="w-5 h-5" />
          </div>
          <span class="tracking-tight text-white font-extrabold">Votaciones <span class="text-emerald-400 font-semibold text-sm">Gala</span></span>
        </NuxtLink>

        <!-- Desktop Navigation & User Controls -->
        <div class="hidden md:flex items-center gap-4">
          <template v-if="session?.user">
            <div class="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
              <span class="font-medium text-xs">{{ session.user.name }}</span>
              <UBadge :color="session.user.role === 'admin' ? 'primary' : 'neutral'" variant="subtle" size="xs">
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
        <template v-if="session?.user">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <p class="text-sm font-semibold text-white">{{ session.user.name }}</p>
              <p class="text-xs text-slate-400">{{ session.user.email }}</p>
            </div>
            <UBadge :color="session.user.role === 'admin' ? 'primary' : 'neutral'" variant="subtle" size="xs">
              {{ session.user.role === 'admin' ? 'Admin' : 'Juez' }}
            </UBadge>
          </div>

          <div class="space-y-1.5 pt-1">
            <NuxtLink v-if="session.user.role === 'admin'" to="/admin/contests" @click="isMobileMenuOpen = false">
              <UButton variant="ghost" color="neutral" block class="justify-start" icon="lucide:settings">
                Panel de Administrador
              </UButton>
            </NuxtLink>
            <NuxtLink v-else to="/judge" @click="isMobileMenuOpen = false">
              <UButton variant="ghost" color="neutral" block class="justify-start" icon="lucide:vote">
                Mis Rondas de Calificación
              </UButton>
            </NuxtLink>

            <UButton variant="ghost" color="error" block class="justify-start" icon="lucide:log-out" @click="handleLogout">
              Cerrar Sesión
            </UButton>
          </div>
        </template>
        <template v-else>
          <NuxtLink to="/login" @click="isMobileMenuOpen = false">
            <UButton color="primary" block size="md" icon="lucide:log-in">
              Iniciar Sesión
            </UButton>
          </NuxtLink>
        </template>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-900 bg-slate-950/60 backdrop-blur py-6 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UIcon name="lucide:crown" class="w-4 h-4 text-amber-500" />
          <span>Sistema Oficial de Votaciones &bull; Certámenes y Concursos</span>
        </div>
        <p>&copy; {{ new Date().getFullYear() }} Plataforma de Calificación Determinista.</p>
      </div>
    </footer>
  </div>
</template>
