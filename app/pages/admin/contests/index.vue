<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const { data: contestsList, refresh } = await useFetch('/api/admin/contests');

const isCreateModalOpen = ref(false);
const newName = ref('');
const newDescription = ref('');
const isSubmitting = ref(false);
const errorMsg = ref('');

async function createContest() {
  if (!newName.value) return;
  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    await $fetch('/api/admin/contests', {
      method: 'POST',
      body: {
        name: newName.value,
        description: newDescription.value || undefined,
      },
    });

    newName.value = '';
    newDescription.value = '';
    isCreateModalOpen.value = false;
    await refresh();
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Error al crear concurso';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-extrabold text-white tracking-tight">Concursos y Certámenes</h1>
        <p class="text-sm text-slate-400 mt-1">Administra los certámenes y sus respectivas ediciones anuales</p>
      </div>

      <UButton
        color="primary"
        icon="lucide:plus"
        size="md"
        @click="isCreateModalOpen = true"
      >
        Nuevo Concurso
      </UButton>
    </div>

    <!-- Empty state -->
    <div v-if="!contestsList || contestsList.length === 0" class="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
      <UIcon name="lucide:trophy" class="w-12 h-12 text-slate-600 mx-auto mb-3" />
      <h3 class="text-lg font-semibold text-slate-300">No hay concursos registrados</h3>
      <p class="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">Crea tu primer concurso para comenzar a registrar ediciones y rondas.</p>
      <UButton color="primary" icon="lucide:plus" size="sm" @click="isCreateModalOpen = true">
        Crear Concurso
      </UButton>
    </div>

    <!-- Contests Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="c in contestsList"
        :key="c.id"
        class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition"
      >
        <div>
          <div class="flex items-start justify-between gap-2 mb-3">
            <h2 class="text-xl font-bold text-white leading-snug">{{ c.name }}</h2>
            <UBadge color="primary" variant="subtle" size="sm">
              {{ c.editionsCount }} {{ c.editionsCount === 1 ? 'Edición' : 'Ediciones' }}
            </UBadge>
          </div>
          <p class="text-sm text-slate-400 line-clamp-2 mb-6">
            {{ c.description || 'Sin descripción detallada.' }}
          </p>
        </div>

        <div class="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            Creado: {{ new Date(c.createdAt).toLocaleDateString() }}
          </span>
          <NuxtLink :to="`/admin/contests/${c.id}`">
            <UButton variant="ghost" color="primary" size="sm" trailing-icon="lucide:chevron-right">
              Ver Ediciones
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Modal Crear Concurso -->
    <UModal v-model:open="isCreateModalOpen" title="Crear Nuevo Concurso">
      <template #body>
        <div class="p-6 space-y-4">
          <div v-if="errorMsg" class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            {{ errorMsg }}
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nombre del Concurso</label>
            <UInput v-model="newName" placeholder="Ej. Certamen Nacional de Belleza" size="md" class="w-full" required />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Descripción (Opcional)</label>
            <UTextarea v-model="newDescription" placeholder="Detalles u objetivos del concurso..." rows="3" class="w-full" />
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">Cancelar</UButton>
            <UButton color="primary" :loading="isSubmitting" @click="createContest">Crear Concurso</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
