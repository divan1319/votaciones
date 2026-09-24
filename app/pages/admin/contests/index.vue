<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

const { data: contestsList, status, refresh } = await useFetch('/api/admin/contests');

const isCreateModalOpen = ref(false);
const isSubmitting = ref(false);
const errorMsg = ref('');

const contestSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
});

type ContestSchema = z.output<typeof contestSchema>;

const formState = reactive<ContestSchema>({
  name: '',
  description: '',
});

function openCreateModal() {
  formState.name = '';
  formState.description = '';
  errorMsg.value = '';
  isCreateModalOpen.value = true;
}

async function handleCreateContest(event: FormSubmitEvent<ContestSchema>) {
  isSubmitting.value = true;
  errorMsg.value = '';

  try {
    await $fetch('/api/admin/contests', {
      method: 'POST',
      body: {
        name: event.data.name,
        description: event.data.description || undefined,
      },
    });

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
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
          <UIcon name="lucide:trophy" class="w-3.5 h-3.5 text-amber-400" />
          <span>Gestión Central de Certámenes</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Concursos y Certámenes</h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">Configura certámenes maestros y sus respectivas ediciones anuales</p>
      </div>

      <UButton
        color="primary"
        icon="lucide:plus"
        size="md"
        @click="openCreateModal"
      >
        Nuevo Concurso
      </UButton>
    </div>

    <!-- SKELETONS WHILE PENDING -->
    <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div class="flex justify-between items-start">
          <USkeleton class="h-6 w-3/4 rounded-lg" />
          <USkeleton class="h-5 w-16 rounded-full" />
        </div>
        <USkeleton class="h-4 w-full rounded-md" />
        <USkeleton class="h-4 w-2/3 rounded-md" />
        <div class="pt-4 border-t border-slate-800 flex justify-between items-center">
          <USkeleton class="h-3 w-20 rounded" />
          <USkeleton class="h-8 w-28 rounded-lg" />
        </div>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else-if="!contestsList || contestsList.length === 0"
      class="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-sm"
    >
      <div class="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
        <UIcon name="lucide:trophy" class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-bold text-white">No hay certámenes registrados</h3>
      <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
        Crea tu primer certamen o concurso para comenzar a registrar ediciones anuales, participantes y rondas.
      </p>
      <UButton color="primary" icon="lucide:plus" size="md" @click="openCreateModal">
        Crear Primer Concurso
      </UButton>
    </div>

    <!-- CONTESTS GRID -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="c in contestsList"
        :key="c.id"
        class="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700 hover:shadow-xl hover:shadow-emerald-500/5 transition duration-200 group"
      >
        <div>
          <div class="flex items-start justify-between gap-3 mb-3">
            <h2 class="text-xl font-extrabold text-white leading-snug group-hover:text-emerald-300 transition">
              {{ c.name }}
            </h2>
            <UBadge color="primary" variant="subtle" size="sm" class="flex-shrink-0">
              {{ c.editionsCount }} {{ c.editionsCount === 1 ? 'Edición' : 'Ediciones' }}
            </UBadge>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-6">
            {{ c.description || 'Sin descripción detallada registrada para este certamen.' }}
          </p>
        </div>

        <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <span class="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
            <UIcon name="lucide:calendar" class="w-3.5 h-3.5" />
            {{ new Date(c.createdAt).toLocaleDateString() }}
          </span>
          <NuxtLink :to="`/admin/contests/${c.id}`">
            <UButton variant="ghost" color="primary" size="sm" trailing-icon="lucide:chevron-right">
              Ver Ediciones
            </UButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- MODAL CREAR CONCURSO CON UFORM Y ZOD -->
    <UModal v-model:open="isCreateModalOpen" title="Crear Nuevo Concurso">
      <template #body>
        <div class="p-6">
          <div v-if="errorMsg" class="mb-5">
            <UAlert
              color="error"
              variant="subtle"
              title="Error al registrar"
              :description="errorMsg"
              icon="lucide:alert-circle"
              :close="{ size: 'xs', color: 'neutral', variant: 'ghost' }"
              @close="errorMsg = ''"
            />
          </div>

          <UForm :schema="contestSchema" :state="formState" class="space-y-4" @submit="handleCreateContest">
            <UFormField label="Nombre del Concurso / Certamen" name="name" description="Ej. Certamen Nacional de Belleza" required>
              <UInput
                v-model="formState.name"
                placeholder="Nombre oficial del concurso"
                size="md"
                class="w-full"
                icon="lucide:award"
              />
            </UFormField>

            <UFormField label="Descripción u Objetivos" name="description" description="Información adicional sobre el concurso (opcional)">
              <UTextarea
                v-model="formState.description"
                placeholder="Detalles sobre las etapas, participantes o premiación..."
                rows="3"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-3 pt-5 border-t border-slate-800">
              <UButton variant="ghost" color="neutral" @click="isCreateModalOpen = false">
                Cancelar
              </UButton>
              <UButton type="submit" color="primary" :loading="isSubmitting" icon="lucide:check">
                Crear Concurso
              </UButton>
            </div>
          </UForm>
        </div>
      </template>
    </UModal>
  </div>
</template>
