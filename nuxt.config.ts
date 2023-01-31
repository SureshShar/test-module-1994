// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
    runtimeConfig: {
        public: {
          title: process.env.NUXT_PUBLIC_TITLE || "",
          apiKey: process.env.NUXT_PUBLIC_API_KEY || "",
          authDomain: process.env.NUXT_PUBLIC_AUTH_DOMAIN || "",
          databaseURL: process.env.NUXT_PUBLIC_DATABASE_URL || "",
          projectId: process.env.NUXT_PUBLIC_PROJECT_ID || "",
          storageBucket: process.env.NUXT_PUBLIC_STORAGE_BUCKET || "",
          messagingSenderId: process.env.NUXT_PUBLIC_MESSAGING_SENDER_ID || "",
          appId: process.env.NUXT_PUBLIC_APP_ID || "",
          measurementId: process.env.NUXT_PUBLIC_MEASUREMENT_ID || "",
          googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        },
      },
})
