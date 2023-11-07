# Nuxt Auth Core

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Minimalist Authentication module for Nuxt.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-auth-core?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- Secured & sealed cookies sessions
- OAuth Providers

## Requirements

This module only works with SSR (server-side rendering) enabled as it uses server API routes. You cannot use this module with `nuxt generate`.

## Quick Setup

1. Add `nuxt-auth-core` dependency to your project

```bash
# Using pnpm
pnpm add -D nuxt-auth-core

# Using yarn
yarn add --dev nuxt-auth-core

# Using npm
npm install --save-dev nuxt-auth-core
```

2. Add `nuxt-auth-core` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: [
    'nuxt-auth-core'
  ]
})
```

3. Add a `NUXT_SESSION_PASSWORD` env variable with at least 32 characters in the `.env`.

```bash
# .env
NUXT_SESSION_PASSWORD=password-with-at-least-32-characters
```

Nuxt Auth Core can generate one for you when running Nuxt in development the first time when no `NUXT_SESSION_PASSWORD` is set.

4. That's it! You can now add authentication to your Nuxt app ✨

## Vue Composables

Nuxt Neo automatically add some plugins to fetch the current user session to let you access it from your Vue components.

### User Session

```vue
<script setup>
const { loggedIn, user, session, clear } = useUserSession()
</script>

<template>
  <div v-if="loggedIn">
    <h1>Welcome {{ user.login }}!</h1>
    <p>Logged in since {{ session.loggedInAt }}</p>
    <button @click="clear">Logout</button>
  </div>
  <div v-else>
    <h1>Not logged in</h1>
    <a href="/api/auth/github">Login with GitHub</a>
  </div>
</template>
```

## Server Utils

The following helpers are auto-imported in your `server/` directory.

### Session Management

```ts
// Set a user session, note that this data is encrypted in the cookie but can be decrypted with an API call
// Only store the data that allow you to recognize an user, but do not store sensitive data
await setUserSession(event, {
  user: {
    // ... user data
  },
  loggedInAt: new Date()
  // Any extra fields
})

// Get the current user session
const session = await getUserSession(event)

// Clear the current user session
await clearUserSession(event)

// Require a user session (send back 401 if no `user` key in session)
const session = await requireUserSession(event)
```

### OAuth Event Handlers

All helpers are exposed from the `oauth` global variable and can be used in your server routes or API routes.

The pattern is `oauth.<provider>EventHandler({ onSuccess, config?, onError? })`, example: `oauth.githubEventHandler`.

The helper returns an event handler that automatically redirects to the provider authorization page and then call `onSuccess` or `onError` depending on the result.

The `config` can be defined directly from the `runtimeConfig` in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    oauth: {
      <provider>: {
        clientId: '...',
        clientSecret: '...'
      }
    }
  }
})
```

It can also be set using environment variables:
- `NUXT_OAUTH_<PROVIDER>_CLIENT_ID`
- `NUXT_OAUTH_<PROVIDER>_CLIENT_SECRET`

Supported providers:
- GitHub
- Spotify

### Example

Example: `~/server/routes/auth/github.get.ts`

```ts
export default oauth.githubEventHandler({
  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        githubId: user.id
      }
    })
    return sendRedirect(event, '/')
  },
  // Optional, will return a json error and 401 status code by default
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
```

Make sure to set the callback URL in your OAuth app settings as `<your-domain>/auth/github`.


## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-auth-core/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-auth-core

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-auth-core.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/nuxt-auth-core

[license-src]: https://img.shields.io/npm/l/nuxt-auth-core.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/nuxt-auth-core

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
