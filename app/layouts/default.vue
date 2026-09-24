<script setup lang="ts">
import { authClient } from '~~/app/utils/auth-client';

const { data: session } = await useFetch('/api/me');
const route = useRoute();
const isMobileMenuOpen = ref(false);

async function handleLogout() {
  await authClient.signOut();
  isMobileMenuOpen.value = false;
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen bg-[#161616] text-[#f4f4f4] flex flex-col font-sans">
    <!-- Carbon UI Shell Header (48px / h-12) -->
    <header class="carbon-header sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        <!-- Brand -->
        <div class="flex items-center h-full gap-6">
          <NuxtLink to="/" class="flex items-center gap-2 text-sm">
            <div class="w-6 h-6 bg-[#0f62fe] flex items-center justify-center text-white font-bold text-xs rounded-none">
              V
            </div>
            <span class="font-bold text-white tracking-wide uppercase">Certámenes</span>
            <span class="text-[#8d8d8d] hidden sm:inline">| Sistema de Votación</span>
          </NuxtLink>

          <!-- Desktop Navigation with Active Indicators -->
          <nav v-if="session?.user" class="hidden md:flex items-center h-full">
            <NuxtLink
              v-if="session.user.role === 'admin'"
              to="/admin/contests"
              class="carbon-tab h-12 border-t-2 border-t-transparent"
              :class="route.path.startsWith('/admin') ? 'carbon-tab-active' : ''"
            >
              <UIcon name="lucide:layout-grid" class="w-4 h-4 text-[#78a9ff]" />
              <span>Panel de Control</span>
            </NuxtLink>

            <NuxtLink
              to="/judge"
              class="carbon-tab h-12 border-t-2 border-t-transparent"
              :class="route.path.startsWith('/judge') ? 'carbon-tab-active' : ''"
            >
              <UIcon name="lucide:vote" class="w-4 h-4 text-[#78a9ff]" />
              <span>Cabina de Juez</span>
            </NuxtLink>
          </nav>
        </div>

        <!-- Right Side: User Status & Actions -->
        <div class="hidden md:flex items-center gap-3">
          <template v-if="session?.user">
            <div class="flex items-center gap-2 px-3 py-1 bg-[#262626] border border-[#393939] text-xs">
              <span class="font-medium text-[#c6c6c6]">{{ session.user.name }}</span>
              <span
                class="carbon-tag"
                :class="session.user.role === 'admin' ? 'carbon-tag-blue' : 'carbon-tag-purple'"
              >
                {{ session.user.role === 'admin' ? 'ADMIN' : 'JUEZ' }}
              </span>
            </div>

            <button
              @click="handleLogout"
              class="h-8 px-3 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-transparent hover:border-[#525252] flex items-center gap-1.5 transition"
              title="Cerrar sesión"
            >
              <UIcon name="lucide:log-out" class="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </template>
          <template v-else>
            <NuxtLink to="/login">
              <button class="h-8 px-4 text-xs font-semibold bg-[#0f62fe] hover:bg-[#0353e9] text-white flex items-center gap-1.5 transition">
                <UIcon name="lucide:log-in" class="w-3.5 h-3.5" />
                <span>Acceder al Sistema</span>
              </button>
            </NuxtLink>
          </template>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <div class="flex md:hidden items-center">
          <button
            class="p-2 text-[#c6c6c6] hover:text-white hover:bg-[#262626]"
            aria-label="Menú"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          >
            <UIcon :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Navigation -->
      <div v-if="isMobileMenuOpen" class="md:hidden border-b border-[#393939] bg-[#161616] px-4 py-3 space-y-2">
        <template v-if="session?.user">
          <div class="flex items-center justify-between pb-2 border-b border-[#393939] text-xs text-[#c6c6c6]">
            <span>{{ session.user.name }} ({{ session.user.email }})</span>
            <span
              class="carbon-tag"
              :class="session.user.role === 'admin' ? 'carbon-tag-blue' : 'carbon-tag-purple'"
            >
              {{ session.user.role === 'admin' ? 'ADMIN' : 'JUEZ' }}
            </span>
          </div>

          <div class="space-y-1 pt-1">
            <NuxtLink
              v-if="session.user.role === 'admin'"
              to="/admin/contests"
              class="flex items-center gap-2 p-2 text-xs font-medium text-white hover:bg-[#262626]"
              @click="isMobileMenuOpen = false"
            >
              <UIcon name="lucide:layout-grid" class="w-4 h-4 text-[#78a9ff]" />
              <span>Panel de Control Admin</span>
            </NuxtLink>

            <NuxtLink
              to="/judge"
              class="flex items-center gap-2 p-2 text-xs font-medium text-white hover:bg-[#262626]"
              @click="isMobileMenuOpen = false"
            >
              <UIcon name="lucide:vote" class="w-4 h-4 text-[#78a9ff]" />
              <span>Cabina de Juez</span>
            </NuxtLink>

            <button
              @click="handleLogout"
              class="w-full text-left flex items-center gap-2 p-2 text-xs text-[#ff8389] hover:bg-[#262626]"
            >
              <UIcon name="lucide:log-out" class="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="block w-full" @click="isMobileMenuOpen = false">
            <button class="w-full py-2 bg-[#0f62fe] text-white text-xs font-semibold uppercase">
              Iniciar Sesión
            </button>
          </NuxtLink>
        </template>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Carbon Shell Footer -->
    <footer class="border-t border-[#393939] bg-[#161616] py-3 text-xs text-[#8d8d8d]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div class="flex items-center gap-2 font-mono text-[11px]">
          <span class="text-white font-bold">IBM Carbon</span>
          <span>&bull;</span>
          <span>Sistema de Votación Determinista</span>
        </div>
        <span class="font-mono text-[11px]">&copy; {{ new Date().getFullYear() }} Plataforma Certámenes v2.4</span>
      </div>
    </footer>
  </div>
</template>
