<script setup lang="ts">
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} · Votaciones Carbon` : 'Sistema de Votación para Certámenes';
  },
  meta: [
    { name: 'description', content: 'Sistema de Calificación y Votación para Concursos y Certámenes basado en IBM Carbon Design System.' },
    { name: 'theme-color', content: '#161616' }
  ]
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
