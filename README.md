# Nuxt Auth Utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Add Authentication to Nuxt applications with secured & sealed cookies sessions.

- [Release Notes](/CHANGELOG.md)
- [Demo](https://github.com/atinux/nuxt-todos-edge)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/nuxt-auth-utils?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->

## Features

- [Hybrid Rendering](#hybrid-rendering) support (SSR / CSR / SWR / Prerendering)
- [20+ OAuth Providers](#supported-oauth-providers)
- [`useUserSession()` Vue composable](#vue-composable)
- [Tree-shakable server utils](#server-utils)
- [`<AuthState>` component](#authstate-component)
- [Extendable with hooks](#extend-session)

It has few dependencies (only from [UnJS](https://github.com/unjs)), run on multiple JS environments (Node, Deno, Workers) and is fully typed with TypeScript.

## Requirements

This module only works with a Nuxt server running as it uses server API routes (`nuxt build`).

This means that you cannot use this module with `nuxt generate`.

You can anyway use [Hybrid Rendering](#hybrid-rendering) to pre-render pages of your application or disable server-side rendering completely.

## Quick Setup

1. Add `nuxt-auth-utils` in your Nuxt project

```bash
npx nuxi@latest module add auth-utils
```

2. Add a `NUXT_SESSION_PASSWORD` env variable with at least 32 characters in the `.env`.

```bash
# .env
NUXT_SESSION_PASSWORD=password-with-at-least-32-characters
```

Nuxt Auth Utils generates one for you when running Nuxt in development the first time if no `NUXT_SESSION_PASSWORD` is set.

3. That's it! You can now add authentication to your Nuxt app ✨

## Vue Composable

Nuxt Auth Utils automatically adds some plugins to fetch the current user session to let you access it from your Vue components.

### User Session

```vue
<script setup>
const { loggedIn, user, session, fetch, clear } = useUserSession()
</script>

<template>
  <div v-if="loggedIn">
    <h1>Welcome {{ user.login }}!</h1>
    <p>Logged in since {{ session.loggedInAt }}</p>
    <button @click="clear">Logout</button>
  </div>
  <div v-else>
    <h1>Not logged in</h1>
    <a href="/auth/github">Login with GitHub</a>
  </div>
</template>
```

**TypeScript Signature:**

```ts
interface UserSessionComposable {
  /**
   * Computed indicating if the auth session is ready
   */
  ready: ComputedRef<boolean>
  /**
   * Computed indicating if the user is logged in.
   */
  loggedIn: ComputedRef<boolean>
  /**
   * The user object if logged in, null otherwise.
   */
  user: ComputedRef<User | null>
  /**
   * The session object.
   */
  session: Ref<UserSession>
  /**
   * Fetch the user session from the server.
   */
  fetch: () => Promise<void>
  /**
   * Clear the user session and remove the session cookie.
   */
  clear: () => Promise<void>
}
```

> [!IMPORTANT]
> Nuxt Auth Utils uses the `/api/_auth/session` route for session management. Ensure your API route middleware doesn't interfere with this path.

## Server Utils

The following helpers are auto-imported in your `server/` directory.

### Session Management

```ts
// Set a user session, note that this data is encrypted in the cookie but can be decrypted with an API call
// Only store the data that allow you to recognize a user, but do not store sensitive data
// Merges new data with existing data using unjs/defu library
await setUserSession(event, {
  // User data
  user: {
    login: 'atinux'
  },
  // Private data accessible on server/ routes
  secure: {
    apiToken: '1234567890'
  },
  // Any extra fields for the session data
  loggedInAt: new Date()
})

// Replace a user session. Same behaviour as setUserSession, except it does not merge data with existing data
await replaceUserSession(event, data)

// Get the current user session
const session = await getUserSession(event)

// Clear the current user session
await clearUserSession(event)

// Require a user session (send back 401 if no `user` key in session)
const session = await requireUserSession(event)
```

You can define the type for your user session by creating a type declaration file (for example, `auth.d.ts`) in your project to augment the `UserSession` type:

```ts
// auth.d.ts
declare module '#auth-utils' {
  interface User {
    // Add your own fields
  }

  interface UserSession {
    // Add your own fields
  }

  interface SecureSessionData {
    // Add your own fields
  }
}

export {}
```

> [!IMPORTANT]
> Since we encrypt and store session data in cookies, we're constrained by the 4096-byte cookie size limit. Store only essential information.

### OAuth Event Handlers

All handlers can be auto-imported and used in your server routes or API routes.

The pattern is `defineOAuth<Provider>EventHandler({ onSuccess, config?, onError? })`, example: `defineOAuthGitHubEventHandler`.

The helper returns an event handler that automatically redirects to the provider authorization page and then calls `onSuccess` or `onError` depending on the result.

The `config` can be defined directly from the `runtimeConfig` in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    oauth: {
      // provider in lowercase (github, google, etc.)
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

> Provider is in uppercase (GITHUB, GOOGLE, etc.)

#### Supported OAuth Providers

- Auth0
- AWS Cognito
- Battle.net
- Discord
- Dropbox
- Facebook
- GitHub
- GitLab
- Google
- Instagram
- Keycloak
- LinkedIn
- Microsoft
- PayPal
- Spotify
- Steam
- TikTok
- Twitch
- VK
- X (Twitter)
- XSUAA
- Yandex

You can add your favorite provider by creating a new file in [src/runtime/server/lib/oauth/](./src/runtime/server/lib/oauth/).

#### Example

Example: `~/server/routes/auth/github.get.ts`

```ts
export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true
  },
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

If the redirect URL mismatch in production, this means that the module cannot guess the right redirect URL. You can set the `NUXT_OAUTH_<PROVIDER>_REDIRECT_URL` env variable to overwrite the default one.

### Password Utils

Nuxt Auth Utils provides a `hashPassword` and `verifyPassword` function to hash and verify passwords by using [scrypt](https://en.wikipedia.org/wiki/Scrypt) as it is supported in many JS runtime.

```ts
const hashedPassword = await hashPassword('user_password')

if (await verifyPassword(hashedPassword, 'user_password')) {
  // Password is valid
}
```

You can configure the scrypt options in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],
  auth: {
    hash: {
      scrypt: {
        // See https://github.com/adonisjs/hash/blob/94637029cd526783ac0a763ec581306d98db2036/src/types.ts#L144
      }
    }
  }
})
```

### Webauthn (passkey)

WebAuthn (Web Authentication) is a web standard that enhances security by replacing passwords with passkeys using public key cryptography. Users can authenticate with biometric data (like fingerprints or facial recognition) or physical devices (like USB keys), reducing the risk of phishing and password breaches. This approach offers a more secure and user-friendly authentication method, supported by major browsers and platforms.

#### Example

In this example we will implement the very basic steps to register and authenticate a credential.

The full code can be found in the [playground](https://github.com/Atinux/nuxt-auth-utils/blob/main/playground/server/api/webauthn). The example uses a SQLite database with the following minimal tables:

```sql
CREATE TABLE users (
  user_name TEXT UNIQUE NOT NULL
);
CREATE TABLE credentials (
  user_name TEXT NOT NULL,
  credential_id TEXT NOT NULL,
  credential_public_key TEXT NOT NULL,
  counter INTEGER NOT NULL,
  backed_up INTEGER NOT NULL,
  transports TEXT NOT NULL
);
```

- For the `users` table it is important to have a unique identifier such as a username or email. When creating a new credential, this identifier is required and stored with the passkey on the user's device, password manager, or authenticator.
- The `credentials` table stores:
  - The credential `ID` (potentially as primary key)
  - The credential `public key`
  - A `counter`. Each time a credential is used, the counter is incremented. We can use this value to perform extra security checks. More about `counter` can be read [here](https://simplewebauthn.dev/docs/packages/server#3-post-registration-responsibilities). For this example, we won't be using the counter. But you should update the counter in your database with the new value.
  - A `backed up` flag. Normally, credentials are stored on the generating device. When you use a password manager or authenticator, the credential is "backed up" because it can be used on multiple devices. See [this section](https://arc.net/l/quote/ugaemxot) for more details.
  - The credential `transports`. It is an array of strings that indicate how the credential communicates with the client. It is used to show the correct UI for the user to utilize the credential. Again, see [this section](https://arc.net/l/quote/ycxtiorp) for more details.

The following code does not include the actual database queries, but shows the general steps to follow. The full example can be found in the playground: [registration](https://github.com/Atinux/nuxt-auth-utils/blob/main/playground/server/api/webauthn/register.post.ts), [authentication](https://github.com/Atinux/nuxt-auth-utils/blob/main/playground/server/api/webauthn/login.post.ts).

```ts
// server/api/webauthn/register.post.ts
export default defineCredentialRegistrationEventHandler({
  async onSuccess(event, { authenticator, userName }) {
    // The credential creation has been successful
    // We need to create a user if it does not exist

    // Get the user from the database
    const user = await useDatabase().sql`...`
    if (!user) {
      // Store new user in database
      await useDatabase().sql`...`
    }

    // we now need to store the credential in our database and link it to the user
    await useDatabase().sql`...`

    // Set the user session
    await setUserSession(event, {
      user: {
        webauthn: user.userName,
      },
      loggedInAt: Date.now(),
    })
  },
})
```

```ts
export default defineCredentialAuthenticationEventHandler({
  async getCredential(event, credentialId) {
    // Look for the credential in our database
    const credential = await useDatabase().sql`...`

    // If the credential is not found, there is no account to log in to
    if (!credential)
      throw createError({ statusCode: 400, message: 'Credential not found' })

    return credential
  },
  async onSuccess(event, { authenticator, authenticationInfo }) {
    // The credential authentication has been successful
    // We can look it up in our database and get the corresponding user
    const user = await useDatabase().sql`...`

    // Update the counter in the database (authenticationInfo.newCounter)
    await useDatabase().sql`...`

    // Set the user session
    await setUserSession(event, {
      user: {
        webauthn: user.userName,
      },
      loggedInAt: Date.now(),
    })
  },

  // Optionally, we can prefetch the credentials if the user gives their username during login
  async authenticationOptions(event) {
    const body = await readBody(event)
    // If no userName is provided, no credentials can be returned
    if (!body.userName || body.userName === '')
      return {}

    const credentials = await useDatabase().sql`...`

    // If no credentials are found, the authentication cannot be completed
    if (!credentials.length)
      throw createError({ statusCode: 400, message: 'User not found' })

    // If user is found, only allow credentials that are registered
    // The browser will automatically try to use the credential that it knows about
    // Skipping the step for the user to select a credential for a better user experience
    return {
      allowCredentials: credentials,
    }
    // example: allowCredentials: [{ id: '...', transports: ['internal', 'usb'] }]
  },
})
```

> [!IMPORTANT]
> By default, the webauthn event handlers will store the challenge in a short lived, encrypted session cookie. This is not recommended for applications that require strong security guarantees. On a secure connection (https) it is highly unlikely for this to cause problems. However, if the connection is not secure, there is a possibility of a man-in-the-middle attack. To prevent this, you should use a database or KV store to store the challenge instead. For this the `storeChallenge` and `getChallenge` functions are provided.
> ```ts
> export default defineCredentialAuthenticationEventHandler({
>   async storeChallenge(event, challenge, attemptId) {
>     // Store the challenge in a KV store or DB
>     await useStorage().setItem(`attempt:${attemptId}`, challenge)
>   },
>   async getChallenge(event, attemptId) {
>     const challenge = await useStorage().getItem(`attempt:${attemptId}`)
>
>     // Make sure to always remove the attempt because they are single use only!
>     await useStorage().removeItem(`attempt:${attemptId}`)
>
>     if (!challenge)
>       throw createError({ statusCode: 400, message: 'Challenge expired' })
>
>     return challenge
>   },
>   async onSuccess(event, { authenticator }) {
>     // ...
>   },
> })
> ```

On the frontend it is as simple as:
```vue
<script setup lang="ts">
const { register, authenticate } = useWebauthn({
  registrationEndpoint: '/api/webauthn/register',
  authenticationEndpoint: '/api/webauthn/login',
})

const userName = ref('')
async function submit() {
  await register(userName.value)
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="userName" />
    <button type="submit">Register</button>
  </form>
</template>
```

### Extend Session

We leverage hooks to let you extend the session data with your own data or log when the user clears the session.

```ts
// server/plugins/session.ts
export default defineNitroPlugin(() => {
  // Called when the session is fetched during SSR for the Vue composable (/api/_auth/session)
  // Or when we call useUserSession().fetch()
  sessionHooks.hook('fetch', async (session, event) => {
    // extend User Session by calling your database
    // or
    // throw createError({ ... }) if session is invalid for example
  })

  // Called when we call useUserSession().clear() or clearUserSession(event)
  sessionHooks.hook('clear', async (session, event) => {
    // Log that user logged out
  })
})
```

## Server-Side Rendering

You can make authenticated requests both from the client and the server. However, you must use `useRequestFetch()` to make authenticated requests during SSR if you are not using `useFetch()`

```vue
<script setup lang="ts">
// When using useAsyncData
const { data } = await useAsyncData('team', () => useRequestFetch()('/api/protected-endpoint'))

// useFetch will automatically use useRequestFetch during SSR
const { data } = await useFetch('/api/protected-endpoint')
</script>
```

> There's [an open issue](https://github.com/nuxt/nuxt/issues/24813) to include credentials in `$fetch` in Nuxt.

## Hybrid Rendering

When using [Nuxt `routeRules`](https://nuxt.com/docs/guide/concepts/rendering#hybrid-rendering) to prerender or cache your pages, Nuxt Auth Utils will not fetch the user session during prerendering but instead fetch it on the client-side (after hydration).

This is because the user session is stored in a secure cookie and cannot be accessed during prerendering.

**This means that you should not rely on the user session during prerendering.**

### `<AuthState>` component

You can use the `<AuthState>` component to safely display auth-related data in your components without worrying about the rendering mode.

One common use case if the Login button in the header:

```vue
<template>
  <header>
    <AuthState v-slot="{ loggedIn, clear }">
      <button v-if="loggedIn" @click="clear">Logout</button>
      <NuxtLink v-else to="/login">Login</NuxtLink>
    </AuthState>
  </header>
</template>
```

If the page is cached or prerendered, nothing will be rendered until the user session is fetched on the client-side.

You can use the `placeholder` slot to show a placeholder on server-side and while the user session is being fetched on client-side for the prerendered pages:

```vue
<template>
  <header>
    <AuthState>
      <template #default="{ loggedIn, clear }">
        <button v-if="loggedIn" @click="clear">Logout</button>
        <NuxtLink v-else to="/login">Login</NuxtLink>
      </template>
      <template #placeholder>
        <button disabled>Loading...</button>
      </template>
    </AuthState>
  </header>
</template>
```

If you are caching your routes with `routeRules`, please make sure to use [Nitro](https://github.com/unjs/nitro) >= `2.9.7` to support the client-side fetching of the user session.

## Configuration

We leverage `runtimeConfig.session` to give the defaults option to [h3 `useSession`](https://h3.unjs.io/examples/handle-session).

You can overwrite the options in your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],
  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24 * 7 // 1 week
    }
  }
})
```

Our defaults are:

```ts
{
  name: 'nuxt-session',
  password: process.env.NUXT_SESSION_PASSWORD || '',
  cookie: {
    sameSite: 'lax'
  }
}
```

You can also overwrite the session config by passing it as 3rd argument of the `setUserSession` and `replaceUserSession` functions:

```ts
await setUserSession(event, { ... } , {
  maxAge: 60 * 60 * 24 * 7 // 1 week
})
```

Checkout the [`SessionConfig`](https://github.com/unjs/h3/blob/c04c458810e34eb15c1647e1369e7d7ef19f567d/src/utils/session.ts#L20) for all options.

## More

- [nuxt-authorization](https://github.com/barbapapazes/nuxt-authorization): Authorization module for managing permissions inside a Nuxt app, compatible with `nuxt-auth-utils`

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
[npm-version-src]: https://img.shields.io/npm/v/nuxt-auth-utils/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/nuxt-auth-utils

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-auth-utils.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npm.chart.dev/nuxt-auth-utils

[license-src]: https://img.shields.io/npm/l/nuxt-auth-utils.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/nuxt-auth-utils

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
