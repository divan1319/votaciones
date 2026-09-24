// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
  ],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'postgresql://dlopez:daniel.lopez@localhost:5432/votaciones',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || 'votaciones-super-secret-key-32-characters-min',
    public: {
      authBaseUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    }
  },

  compatibilityDate: '2026-06-30',
  telemetry: false,
  devtools: { enabled: false }
});
