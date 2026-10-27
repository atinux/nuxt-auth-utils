// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: true,
  },
  dirs: {
    src: [
      './playground',
    ],
  },
}).overrideRules({
  '@typescript-eslint/no-empty-object-type': 'off',
  'vue/multi-word-component-names': 'off',
})
