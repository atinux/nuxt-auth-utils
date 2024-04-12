import { defineNuxtPlugin } from '#app'
import { useUserSession } from '#imports'

export default defineNuxtPlugin({
  name: 'session-fetch-plugin',
  enforce: 'pre',
  async setup() {
    await useUserSession().fetch()
  },
})
