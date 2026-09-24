<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';
import { authClient } from '~~/app/utils/auth-client';

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

    // Consultar el rol del usuario para redirección inteligente
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
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div class="text-center mb-6 relative">
        <div class="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-3 text-amber-400">
          <UIcon name="lucide:trophy" class="w-8 h-8" />
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Acceso al Sistema</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Plataforma de Calificación de Certámenes</p>
      </div>

      <!-- Alert Error -->
      <div v-if="errorMsg" class="mb-5">
        <UAlert
          color="error"
          variant="subtle"
          title="Error de Acceso"
          :description="errorMsg"
          icon="lucide:alert-circle"
          :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
          @close="errorMsg = ''"
        />
      </div>

      <!-- Nuxt UI v4 Form with Zod -->
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="handleLogin">
        <UFormField label="Correo Electrónico" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="usuario@ejemplo.com"
            icon="lucide:mail"
            class="w-full"
            size="lg"
          />
        </UFormField>

        <UFormField label="Contraseña" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            icon="lucide:lock"
            class="w-full"
            size="lg"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          size="lg"
          :loading="loading"
          icon="lucide:log-in"
          class="font-bold mt-2"
        >
          Ingresar al Panel
        </UButton>
      </UForm>

      <div class="mt-8 pt-5 border-t border-slate-800/80 text-center">
        <p class="text-xs text-slate-400 mb-2">Acceso rápido de prueba:</p>
        <UButton
          variant="outline"
          color="neutral"
          size="xs"
          icon="lucide:key"
          @click="fillAdminCredentials"
        >
          Usar Admin Demo (admin@concursos.com)
        </UButton>
      </div>
    </div>
  </div>
</template>
