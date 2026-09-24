<script setup lang="ts">
import { authClient } from '~~/app/utils/auth-client';

const email = ref('');
const password = ref('');
const errorMsg = ref('');
const loading = ref(false);

const route = useRoute();
const redirectPath = route.query.redirect as string | undefined;

async function handleLogin() {
  errorMsg.value = '';
  loading.value = true;

  try {
    const res = await authClient.signIn.email({
      email: email.value,
      password: password.value,
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
  email.value = 'admin@concursos.com';
  password.value = 'Admin1234!';
}
</script>

<template>
  <div class="min-h-[85vh] flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      <div class="text-center mb-8">
        <div class="inline-flex p-3 bg-emerald-500/10 rounded-2xl mb-3 text-emerald-400">
          <UIcon name="lucide:trophy" class="w-10 h-10 text-amber-400" />
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Acceso al Sistema</h1>
        <p class="text-sm text-slate-400 mt-1">Ingresa como Administrador o Juez calificador</p>
      </div>

      <div v-if="errorMsg" class="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-400 text-sm">
        <UIcon name="lucide:alert-circle" class="w-5 h-5 flex-shrink-0" />
        <span>{{ errorMsg }}</span>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Correo Electrónico</label>
          <UInput
            v-model="email"
            type="email"
            placeholder="usuario@ejemplo.com"
            icon="lucide:mail"
            required
            class="w-full"
            size="lg"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Contraseña</label>
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            icon="lucide:lock"
            required
            class="w-full"
            size="lg"
          />
        </div>

        <UButton
          type="submit"
          color="primary"
          block
          size="lg"
          :loading="loading"
          icon="lucide:log-in"
          class="font-semibold"
        >
          Iniciar Sesión
        </UButton>
      </form>

      <div class="mt-8 pt-6 border-t border-slate-800 text-center">
        <p class="text-xs text-slate-400 mb-2">Acceso rápido para demostración:</p>
        <UButton
          variant="outline"
          color="neutral"
          size="xs"
          icon="lucide:key"
          @click="fillAdminCredentials"
        >
          Usar Admin (admin@concursos.com)
        </UButton>
      </div>
    </div>
  </div>
</template>
