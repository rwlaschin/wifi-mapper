// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibility: {
    vue: '3',
  },
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  build: {
    transpile: ['mongodb']
  },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/test-utils',
    '@nuxt/ui'
  ],

  icon: {
    mode: 'css',
    cssLayer: 'base',
    serverBundle: {
      collections: ['heroicons'] 
    }
  },

  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' }
      ]
    }
  },
})