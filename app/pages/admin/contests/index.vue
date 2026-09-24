<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
});

useHead({
  title: 'Concursos y Certámenes',
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
  <div class="space-y-6">
    <!-- Carbon Breadcrumb -->
    <div class="flex items-center gap-2 text-xs font-mono text-[#8d8d8d]">
      <NuxtLink to="/admin/contests" class="text-white hover:underline">Consola</NuxtLink>
      <span>/</span>
      <span>Concursos</span>
    </div>

    <!-- Carbon Page Header Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#393939] pb-6">
      <div>
        <div class="text-[11px] font-mono uppercase tracking-wider text-[#78a9ff] font-semibold mb-1">
          Gestión Central
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Concursos y Certámenes</h1>
        <p class="text-xs sm:text-sm text-[#c6c6c6] mt-1 font-mono">
          Estructura de certámenes maestros y sus respectivas ediciones anuales
        </p>
      </div>

      <button
        @click="openCreateModal"
        class="h-10 px-4 bg-[#0f62fe] hover:bg-[#0353e9] active:bg-[#002d9c] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition self-start sm:self-auto cursor-pointer"
      >
        <UIcon name="lucide:plus" class="w-4 h-4" />
        <span>Nuevo Concurso</span>
      </button>
    </div>

    <!-- SKELETONS WHILE PENDING -->
    <div v-if="status === 'pending'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="carbon-tile p-6 space-y-4">
        <div class="flex justify-between items-start">
          <USkeleton class="h-6 w-3/4 rounded-none" />
          <USkeleton class="h-5 w-16 rounded-none" />
        </div>
        <USkeleton class="h-4 w-full rounded-none" />
        <USkeleton class="h-4 w-2/3 rounded-none" />
        <div class="pt-4 border-t border-[#393939] flex justify-between items-center">
          <USkeleton class="h-3 w-20 rounded-none" />
          <USkeleton class="h-8 w-28 rounded-none" />
        </div>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else-if="!contestsList || contestsList.length === 0"
      class="carbon-tile p-12 text-center"
    >
      <div class="w-12 h-12 bg-[#1c1c1c] border border-[#393939] text-[#78a9ff] flex items-center justify-center mx-auto mb-3">
        <UIcon name="lucide:trophy" class="w-6 h-6" />
      </div>
      <h3 class="text-base font-bold text-white">No hay certámenes registrados</h3>
      <p class="text-xs text-[#8d8d8d] max-w-sm mx-auto mt-1 mb-6 font-mono">
        Registra un certamen maestro para comenzar a crear ediciones anuales y configurar fases eliminatorias.
      </p>
      <button
        @click="openCreateModal"
        class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
      >
        <UIcon name="lucide:plus" class="w-3.5 h-3.5" />
        <span>Crear Primer Concurso</span>
      </button>
    </div>

    <!-- CONTESTS GRID (Carbon Tiles) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="c in contestsList"
        :key="c.id"
        class="carbon-tile p-6 flex flex-col justify-between"
      >
        <div>
          <div class="flex items-start justify-between gap-3 mb-3">
            <h2 class="text-lg font-bold text-white leading-snug">
              {{ c.name }}
            </h2>
            <span class="carbon-tag carbon-tag-blue flex-shrink-0">
              {{ c.editionsCount }} {{ c.editionsCount === 1 ? 'EDICIÓN' : 'EDICIONES' }}
            </span>
          </div>
          <p class="text-xs text-[#c6c6c6] line-clamp-2 mb-6">
            {{ c.description || 'Sin descripción detallada registrada para este certamen.' }}
          </p>
        </div>

        <div class="pt-4 border-t border-[#393939] flex items-center justify-between text-xs">
          <span class="font-mono text-[11px] text-[#8d8d8d] flex items-center gap-1">
            <UIcon name="lucide:calendar" class="w-3.5 h-3.5" />
            {{ new Date(c.createdAt).toLocaleDateString() }}
          </span>

          <NuxtLink :to="`/admin/contests/${c.id}`">
            <button class="h-8 px-3 text-xs font-semibold bg-[#262626] hover:bg-[#393939] border border-[#525252] text-[#78a9ff] hover:text-white flex items-center gap-1.5 transition">
              <span>Gestionar Ediciones</span>
              <UIcon name="lucide:chevron-right" class="w-3.5 h-3.5" />
            </button>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- MODAL CREAR CONCURSO (Carbon Modal) -->
    <UModal v-model:open="isCreateModalOpen" title="Crear Nuevo Concurso">
      <template #body>
        <div class="p-6 bg-[#262626]">
          <div v-if="errorMsg" class="mb-4 p-3 bg-[#750e13]/20 border-l-4 border-[#da1e28] text-xs text-[#ff8389]">
            {{ errorMsg }}
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

            <div class="flex justify-end gap-2 pt-5 border-t border-[#393939]">
              <button
                type="button"
                @click="isCreateModalOpen = false"
                class="h-9 px-4 text-xs font-medium text-[#c6c6c6] hover:text-white hover:bg-[#393939] border border-[#525252]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="h-9 px-4 bg-[#0f62fe] hover:bg-[#0353e9] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
              >
                <UIcon v-if="isSubmitting" name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
                <UIcon v-else name="lucide:check" class="w-3.5 h-3.5" />
                <span>Crear Concurso</span>
              </button>
            </div>
          </UForm>
        </div>
      </template>
    </UModal>
  </div>
</template>
