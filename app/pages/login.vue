<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';
import { authClient } from '~~/app/utils/auth-client';

useHead({
  title: 'Iniciar Sesión',
});

const schema = z.object({
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  email: '',
  password: '',
});

const errorMsg = ref('');
const loading = ref(false);

const route = useRoute();
const redirectPath = route.query.redirect as string | undefined;

async function handleLogin(event: FormSubmitEvent<Schema>) {
  errorMsg.value = '';
  loading.value = true;

  try {
    const res = await authClient.signIn.email({
      email: event.data.email,
      password: event.data.password,
    });

    if (res.error) {
      errorMsg.value = res.error.message || 'Credenciales incorrectas';
      loading.value = false;
      return;
    }

    const { data: me } = await useFetch('/api/me');
    const userRole = me.value?.user?.role;

    if (redirectPath) {
      await navigateTo(redirectPath);
    } else if (userRole === 'admin') {
      await navigateTo('/admin/contests');
    } else {
      await navigateTo('/judge');
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al iniciar sesión';
  } finally {
    loading.value = false;
  }
}

function fillAdminCredentials() {
  state.email = 'admin@concursos.com';
  state.password = 'Admin1234!';
}
</script>

<template>
  <div class="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4 sm:p-6 lg:p-12">
    <!-- IBM Carbon 2-Column Split Container -->
    <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 border border-[#393939] bg-[#262626] shadow-2xl">
      <!-- Left Panel: Platform Specifications & Identity -->
      <div class="md:col-span-5 bg-[#1c1c1c] border-b md:border-b-0 md:border-r border-[#393939] p-6 sm:p-8 flex flex-col justify-between relative">
        <div class="space-y-6">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-[#0f62fe] text-white flex items-center justify-center text-xs font-bold font-mono">
              C
            </div>
            <span class="text-xs font-mono font-bold tracking-widest uppercase text-[#c6c6c6]">
              Carbon System
            </span>
          </div>

          <div>
            <h2 class="text-2xl font-bold text-white tracking-tight leading-tight">
              Plataforma de Calificación y Votaciones
            </h2>
            <p class="text-xs text-[#8d8d8d] mt-2 font-mono">
              Certámenes &bull; Concursos Oficiales &bull; Evaluación Determinista
            </p>
          </div>

          <div class="pt-4 border-t border-[#333333] space-y-3.5 text-xs text-[#c6c6c6]">
            <div class="flex items-start gap-2.5">
              <UIcon name="lucide:shield-check" class="w-4 h-4 text-[#78a9ff] flex-shrink-0 mt-0.5" />
              <div>
                <strong class="text-white block font-medium">Inmutabilidad Estricta</strong>
                <span class="text-[11px] text-[#8d8d8d]">Votos sellados y protegidos contra cualquier edición posterior.</span>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <UIcon name="lucide:scale" class="w-4 h-4 text-[#78a9ff] flex-shrink-0 mt-0.5" />
              <div>
                <strong class="text-white block font-medium">Equidad Matemática</strong>
                <span class="text-[11px] text-[#8d8d8d]">Normalización 0-100 y cálculo tolerante a jueces faltantes.</span>
              </div>
            </div>

            <div class="flex items-start gap-2.5">
              <UIcon name="lucide:database" class="w-4 h-4 text-[#78a9ff] flex-shrink-0 mt-0.5" />
              <div>
                <strong class="text-white block font-medium">Auditoría PostgreSQL</strong>
                <span class="text-[11px] text-[#8d8d8d]">Precisión decimal exacta sin discrepancias de redondeo.</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-6 mt-6 border-t border-[#333333] flex items-center justify-between text-[11px] font-mono text-[#8d8d8d]">
          <span class="carbon-tag carbon-tag-blue">v2.4 ENTERPRISE</span>
          <span>ESTADO: SEGURO</span>
        </div>
      </div>

      <!-- Right Panel: Carbon Authentication Form -->
      <div class="md:col-span-7 bg-[#262626] p-6 sm:p-10 flex flex-col justify-between">
        <div>
          <div class="border-b border-[#393939] pb-4 mb-6">
            <h1 class="text-xl sm:text-2xl font-bold text-white tracking-tight">Acceso al Sistema</h1>
            <p class="text-xs text-[#c6c6c6] mt-1 font-mono">
              Introduce tus credenciales para acceder como Administrador o Juez Oficial
            </p>
          </div>

          <!-- Carbon Notification for Error -->
          <div v-if="errorMsg" class="mb-5 p-3.5 bg-[#750e13]/20 border-l-4 border-[#da1e28] text-xs text-[#ff8389] flex items-start gap-2.5">
            <UIcon name="lucide:alert-circle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong class="block font-semibold">Error de autenticación</strong>
              <span>{{ errorMsg }}</span>
            </div>
          </div>

          <!-- UForm with Zod -->
          <UForm :schema="schema" :state="state" class="space-y-4" @submit="handleLogin">
            <UFormField label="Correo Electrónico" name="email" required>
              <UInput
                v-model="state.email"
                type="email"
                placeholder="usuario@dominio.com"
                icon="lucide:mail"
                class="w-full"
                size="md"
              />
            </UFormField>

            <UFormField label="Contraseña" name="password" required>
              <UInput
                v-model="state.password"
                type="password"
                placeholder="••••••••"
                icon="lucide:lock"
                class="w-full"
                size="md"
              />
            </UFormField>

            <button
              type="submit"
              :disabled="loading"
              class="w-full h-11 bg-[#0f62fe] hover:bg-[#0353e9] active:bg-[#002d9c] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 mt-4 cursor-pointer"
            >
              <UIcon v-if="loading" name="lucide:loader-2" class="w-4 h-4 animate-spin" />
              <UIcon v-else name="lucide:arrow-right" class="w-4 h-4" />
              <span>Ingresar a la Plataforma</span>
            </button>
          </UForm>
        </div>

        <!-- Quick Access Chip for Demo -->
        <div class="mt-8 pt-4 border-t border-[#393939] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <span class="text-[#8d8d8d] font-mono text-[11px]">Acceso rápido para demostración:</span>
          <button
            type="button"
            @click="fillAdminCredentials"
            class="px-2.5 py-1 bg-[#161616] hover:bg-[#393939] border border-[#525252] text-[#c6c6c6] hover:text-white font-mono text-[11px] transition flex items-center gap-1.5"
          >
            <UIcon name="lucide:key" class="w-3 h-3 text-[#78a9ff]" />
            <span>Usar Admin (admin@concursos.com)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
