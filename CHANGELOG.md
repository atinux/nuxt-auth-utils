# Changelog


## v0.3.9

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.8...v0.3.9)

### 🩹 Fixes

- UserSession secure type augmentation ([#181](https://github.com/Atinux/nuxt-auth-utils/pull/181))

### 🏡 Chore

- Update deps ([4a0e1e9](https://github.com/Atinux/nuxt-auth-utils/commit/4a0e1e9))

### ❤️ Contributors

- Sébastien Chopin ([@atinux](http://github.com/atinux))
- Israel Ortuño <ai.ortuno@gmail.com>

## v0.3.8

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.7...v0.3.8)

### 🚀 Enhancements

- Add Gitlab provider ([fec746f](https://github.com/Atinux/nuxt-auth-utils/commit/fec746f))
- Add instagram provider ([3bd553c](https://github.com/Atinux/nuxt-auth-utils/commit/3bd553c))
- Add vk provider ([6581f12](https://github.com/Atinux/nuxt-auth-utils/commit/6581f12))
- Add support for private data & config argument ([#171](https://github.com/Atinux/nuxt-auth-utils/pull/171))

### 🩹 Fixes

- Ensure plugin declaration files are emitted ([#170](https://github.com/Atinux/nuxt-auth-utils/pull/170))

### 📖 Documentation

- Add note about cookie size ([a725436](https://github.com/Atinux/nuxt-auth-utils/commit/a725436))
- Add note to readme about session API route ([ddf38c1](https://github.com/Atinux/nuxt-auth-utils/commit/ddf38c1))

### 🏡 Chore

- Add emailRequired for testing Gitlab ([408b580](https://github.com/Atinux/nuxt-auth-utils/commit/408b580))
- Up ([bd37690](https://github.com/Atinux/nuxt-auth-utils/commit/bd37690))

### ❤️ Contributors

- Sébastien Chopin ([@atinux](http://github.com/atinux))
- Daniel Roe ([@danielroe](http://github.com/danielroe))
- Alex Blumgart <dev.blumgart@yandex.ru>
- Sandro Circi ([@sandros94](http://github.com/sandros94))
- Rudo Kemper ([@rudokemper](http://github.com/rudokemper))

## v0.3.7

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.6...v0.3.7)

### 🩹 Fixes

- Paypal tokens request requires encoded `redirect_uri` ([8bf3b0b](https://github.com/Atinux/nuxt-auth-utils/commit/8bf3b0b))

### 🏡 Chore

- Update deps ([50aba8d](https://github.com/Atinux/nuxt-auth-utils/commit/50aba8d))

### ❤️ Contributors

- Sébastien Chopin ([@atinux](http://github.com/atinux))
- Yizack Rangel ([@Yizack](http://github.com/Yizack))

## v0.3.6

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.5...v0.3.6)

### 🚀 Enhancements

- Add tiktok provider ([c1b1f44](https://github.com/Atinux/nuxt-auth-utils/commit/c1b1f44))

### 💅 Refactors

- Request token ([925f688](https://github.com/Atinux/nuxt-auth-utils/commit/925f688))

### 📖 Documentation

- Fix typo ([8d3af7e](https://github.com/Atinux/nuxt-auth-utils/commit/8d3af7e))

### 🏡 Chore

- Update deps ([c4189b2](https://github.com/Atinux/nuxt-auth-utils/commit/c4189b2))

### ❤️ Contributors

- Sébastien Chopin ([@atinux](http://github.com/atinux))
- Ahmed Rangel ([@ahmedrangel](http://github.com/ahmedrangel))
- Estéban <e.soubiran25@gmail.com>
- Ivailo Panamski <ipanamski@gmail.com>

## v0.3.5

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.4...v0.3.5)

### 🚀 Enhancements

- Cognito oauth support custom domain ([4ad11a4](https://github.com/Atinux/nuxt-auth-utils/commit/4ad11a4))

### 🩹 Fixes

- Fetch session directly when ssr disabled ([#151](https://github.com/Atinux/nuxt-auth-utils/pull/151))

### 💅 Refactors

- Handle missing configuration error ([5675aaf](https://github.com/Atinux/nuxt-auth-utils/commit/5675aaf))
- Handle access token error response ([a1b3fbb](https://github.com/Atinux/nuxt-auth-utils/commit/a1b3fbb))

### 🏡 Chore

- Update .vscode ([6285ca2](https://github.com/Atinux/nuxt-auth-utils/commit/6285ca2))
- Update @nuxt/module-builder ([ceaa47b](https://github.com/Atinux/nuxt-auth-utils/commit/ceaa47b))
- Upadte X handler ([7e81c27](https://github.com/Atinux/nuxt-auth-utils/commit/7e81c27))
- Fix X ([7269c61](https://github.com/Atinux/nuxt-auth-utils/commit/7269c61))
- Lint fix ([cf75ab1](https://github.com/Atinux/nuxt-auth-utils/commit/cf75ab1))
- Update deps ([35eff05](https://github.com/Atinux/nuxt-auth-utils/commit/35eff05))

### ❤️ Contributors

- Sébastien Chopin ([@atinux](http://github.com/atinux))
- Estéban <e.soubiran25@gmail.com>
- Zack Spear ([@zackspear](http://github.com/zackspear))
- Alexander ([@hywax](http://github.com/hywax))

## v0.3.4

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.3...v0.3.4)

### 🚀 Enhancements

- Support redirectURL config for all providers ([cdca787](https://github.com/Atinux/nuxt-auth-utils/commit/cdca787))

### ❤️ Contributors

- Kevin Olson ([@acidjazz](http://github.com/acidjazz))

## v0.3.3

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.2...v0.3.3)

### 🚀 Enhancements

- Support `NUXT_OAUTH_MICROSOFT_REDIRECT_URL` ([9979f0d](https://github.com/Atinux/nuxt-auth-utils/commit/9979f0d))
- Add support nitro prefix env ([58ebf85](https://github.com/Atinux/nuxt-auth-utils/commit/58ebf85))

### 📖 Documentation

- Update nitro version ([848cebe](https://github.com/Atinux/nuxt-auth-utils/commit/848cebe))

### 🏡 Chore

- Typo in comment ([b96a017](https://github.com/Atinux/nuxt-auth-utils/commit/b96a017))
- Update deps ([d8ab3f4](https://github.com/Atinux/nuxt-auth-utils/commit/d8ab3f4))
- Lint fix ([a8928a3](https://github.com/Atinux/nuxt-auth-utils/commit/a8928a3))

### ❤️ Contributors

- Sébastien Chopin ([@atinux](http://github.com/atinux))
- Alexander <a.hywax@gmail.com>
- TcarterBAMF ([@tcarterBAMF](http://github.com/tcarterBAMF))

## v0.3.2

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.1...v0.3.2)

### 🩹 Fixes

- Add missing session in AuthState ([3e39727](https://github.com/Atinux/nuxt-auth-utils/commit/3e39727))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.3.1

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.3.0...v0.3.1)

### 🩹 Fixes

- Always return 200 for session endpoint ([#130](https://github.com/Atinux/nuxt-auth-utils/pull/130))

### 📖 Documentation

- Fix event handler name in example ([a4cfa89](https://github.com/Atinux/nuxt-auth-utils/commit/a4cfa89))

### 🏡 Chore

- Update deps ([0132ea0](https://github.com/Atinux/nuxt-auth-utils/commit/0132ea0))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Estéban ([@Barbapapazes](http://github.com/Barbapapazes))

## v0.3.0

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.2.1...v0.3.0)

### 🔥 Performance

- ⚠️  One export per provider for tree-shaking ([4f98b53](https://github.com/Atinux/nuxt-auth-utils/commit/4f98b53))

### 📖 Documentation

- Add TS signature ([04a5d88](https://github.com/Atinux/nuxt-auth-utils/commit/04a5d88))
- Add note about dependencies ([67b5542](https://github.com/Atinux/nuxt-auth-utils/commit/67b5542))

#### ⚠️ Breaking Changes

- ⚠️  One export per provider for tree-shaking ([4f98b53](https://github.com/Atinux/nuxt-auth-utils/commit/4f98b53))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Estéban ([@Barbapapazes](http://github.com/Barbapapazes))

## v0.2.1

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.2.0...v0.2.1)

### 🚀 Enhancements

- X/Twitter email requirement enhancement ([65d6324](https://github.com/Atinux/nuxt-auth-utils/commit/65d6324))
- Add yandex oauth ([22bd974](https://github.com/Atinux/nuxt-auth-utils/commit/22bd974))

### 🎨 Styles

- Add lint script ([af884ff](https://github.com/Atinux/nuxt-auth-utils/commit/af884ff))

### ❤️ Contributors

- Alex <dev.blumgart@yandex.ru>
- Estéban ([@Barbapapazes](http://github.com/Barbapapazes))
- Fayaz Ahmed ([@fayazara](http://github.com/fayazara))

## v0.2.0

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.25...v0.2.0)

### 🚀 Enhancements

- ⚠️  Support hybrid rendering ([#104](https://github.com/Atinux/nuxt-auth-utils/pull/104))
- Add steam as supported oauth provider ([c8b02d0](https://github.com/Atinux/nuxt-auth-utils/commit/c8b02d0))
- Add paypal as supported oauth provider ([57ea01e](https://github.com/Atinux/nuxt-auth-utils/commit/57ea01e))
- Add x(formerly twitter) as supported oauth provider ([a0be1f2](https://github.com/Atinux/nuxt-auth-utils/commit/a0be1f2))
- Add xsuaa provider ([9afb9eb](https://github.com/Atinux/nuxt-auth-utils/commit/9afb9eb))

### 💅 Refactors

- Replace ofetch with $fetch ([a7df1b5](https://github.com/Atinux/nuxt-auth-utils/commit/a7df1b5))

### 📖 Documentation

- Fix typos ([149448a](https://github.com/Atinux/nuxt-auth-utils/commit/149448a))
- Include SSR instructions in the README, fixes #97 ([#99](https://github.com/Atinux/nuxt-auth-utils/pull/99), [#97](https://github.com/Atinux/nuxt-auth-utils/issues/97))
- Update readme ([7a4dcfb](https://github.com/Atinux/nuxt-auth-utils/commit/7a4dcfb))
- Add X in readme ([b452d60](https://github.com/Atinux/nuxt-auth-utils/commit/b452d60))

### 🏡 Chore

- Add packageManager ([c323edc](https://github.com/Atinux/nuxt-auth-utils/commit/c323edc))
- Add link to nuxt-authorization ([1b06908](https://github.com/Atinux/nuxt-auth-utils/commit/1b06908))
- Update deps ([2fb5cff](https://github.com/Atinux/nuxt-auth-utils/commit/2fb5cff))
- **release:** V0.1.0 ([6ea5685](https://github.com/Atinux/nuxt-auth-utils/commit/6ea5685))

#### ⚠️ Breaking Changes

- ⚠️  Support hybrid rendering ([#104](https://github.com/Atinux/nuxt-auth-utils/pull/104))

### ❤️ Contributors

- Jan Fröhlich ([@zanfee](http://github.com/zanfee))
- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Stonegate 
- Yizack Rangel ([@Yizack](http://github.com/Yizack))
- Ahmed Rangel ([@ahmedrangel](http://github.com/ahmedrangel))
- Yue JIN ([@kingyue737](http://github.com/kingyue737))
- Paulo Queiroz ([@raggesilver](http://github.com/raggesilver))
- Timi Omoyeni ([@Timibadass](http://github.com/Timibadass))

## v0.1.0

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.25...v0.1.0)

### 🚀 Enhancements

- ⚠️  Support hybrid rendering ([#104](https://github.com/Atinux/nuxt-auth-utils/pull/104))

### 📖 Documentation

- Fix typos ([149448a](https://github.com/Atinux/nuxt-auth-utils/commit/149448a))
- Include SSR instructions in the README, fixes #97 ([#99](https://github.com/Atinux/nuxt-auth-utils/pull/99), [#97](https://github.com/Atinux/nuxt-auth-utils/issues/97))

### 🏡 Chore

- Add packageManager ([c323edc](https://github.com/Atinux/nuxt-auth-utils/commit/c323edc))
- Add link to nuxt-authorization ([1b06908](https://github.com/Atinux/nuxt-auth-utils/commit/1b06908))
- Update deps ([2fb5cff](https://github.com/Atinux/nuxt-auth-utils/commit/2fb5cff))

#### ⚠️ Breaking Changes

- ⚠️  Support hybrid rendering ([#104](https://github.com/Atinux/nuxt-auth-utils/pull/104))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Paulo Queiroz ([@raggesilver](http://github.com/raggesilver))
- Timi Omoyeni ([@Timibadass](http://github.com/Timibadass))

## v0.0.25

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.24...v0.0.25)

### 🚀 Enhancements

- Add fields support to facebook provider ([8e53936](https://github.com/Atinux/nuxt-auth-utils/commit/8e53936))

### 🏡 Chore

- Update to latest `@nuxt/module-builder` ([c9e4ff7](https://github.com/Atinux/nuxt-auth-utils/commit/c9e4ff7))

### ❤️ Contributors

- Ozan Cakir ([@ozancakir](http://github.com/ozancakir))
- Daniel Roe ([@danielroe](http://github.com/danielroe))

## v0.0.24

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.23...v0.0.24)

### 🚀 Enhancements

- Add facebook OAuth provider ([777d8b2](https://github.com/Atinux/nuxt-auth-utils/commit/777d8b2))

### 🏡 Chore

- Update deps ([3e42be4](https://github.com/Atinux/nuxt-auth-utils/commit/3e42be4))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Adam Hudák ([@adam-hudak](http://github.com/adam-hudak))

## v0.0.23

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.22...v0.0.23)

### 🚀 Enhancements

- Add opts to requireUserSession for error message and status code customization ([015e847](https://github.com/Atinux/nuxt-auth-utils/commit/015e847))

### 🩹 Fixes

- Avoid duplicate trigger of session fetch hook due to request retry ([5fac9a1](https://github.com/Atinux/nuxt-auth-utils/commit/5fac9a1))

### 📖 Documentation

- Removed reference to /api in readme ([#77](https://github.com/Atinux/nuxt-auth-utils/pull/77))

### 🏡 Chore

- Migrate to eslint v9 ([964b67b](https://github.com/Atinux/nuxt-auth-utils/commit/964b67b))
- Update deps ([a77a334](https://github.com/Atinux/nuxt-auth-utils/commit/a77a334))
- Add vscode settings for eslint ([4f1afc9](https://github.com/Atinux/nuxt-auth-utils/commit/4f1afc9))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Deth <gabriel@rosa.dev.br>
- Conrawl Rogers <diizzayy@gmail.com>
- Daniel Roe ([@danielroe](http://github.com/danielroe))
- Max ([@onmax](http://github.com/onmax))

## v0.0.22

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.21...v0.0.22)

### 🚀 Enhancements

- Add `redirectUrl` to OAuthMicrosoftConfig for HTTP vs HTTPS Handling ([50ba6fe](https://github.com/Atinux/nuxt-auth-utils/commit/50ba6fe))

### 🩹 Fixes

- **types:** Narrowed session type passed to fetch session hook ([77c82e7](https://github.com/Atinux/nuxt-auth-utils/commit/77c82e7))

### 📖 Documentation

- Use new nuxi module add command in installation ([d64b9d3](https://github.com/Atinux/nuxt-auth-utils/commit/d64b9d3))
- Improve readme ([00c8287](https://github.com/Atinux/nuxt-auth-utils/commit/00c8287))

### ❤️ Contributors

- Gerben Mulder <github.undergo381@passmail.net>
- André Agro Ferreira ([@andreagroferreira](http://github.com/andreagroferreira))
- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Daniel Roe ([@danielroe](http://github.com/danielroe))

## v0.0.21

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.20...v0.0.21)

### 🏡 Chore

- Update deps ([c8b8eb9](https://github.com/Atinux/nuxt-auth-utils/commit/c8b8eb9))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.20

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.19...v0.0.20)

### 🩹 Fixes

- Leverage NUXT_SESSION_PASSWORD provided at runtime ([4932959](https://github.com/Atinux/nuxt-auth-utils/commit/4932959))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.19

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.18...v0.0.19)

### 🚀 Enhancements

- Generate NUXT_SESSION_PASSWORD and throw if not set in production ([de890ed](https://github.com/Atinux/nuxt-auth-utils/commit/de890ed))

### 🩹 Fixes

- Leverage runtimeConfig to check password ([7c23543](https://github.com/Atinux/nuxt-auth-utils/commit/7c23543))

### 🏡 Chore

- Fix types ([34dfb7b](https://github.com/Atinux/nuxt-auth-utils/commit/34dfb7b))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.18

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.16...v0.0.18)

### 🚀 Enhancements

- Add authorizationParams in oauth config ([#56](https://github.com/Atinux/nuxt-auth-utils/pull/56))

### 🩹 Fixes

- UserSession user type augmentation ([#54](https://github.com/Atinux/nuxt-auth-utils/pull/54))
- User session types ([#55](https://github.com/Atinux/nuxt-auth-utils/pull/55))

### 📖 Documentation

- Update badge colors ([ff868a6](https://github.com/Atinux/nuxt-auth-utils/commit/ff868a6))

### 🏡 Chore

- Update deps ([fdaa88c](https://github.com/Atinux/nuxt-auth-utils/commit/fdaa88c))
- Add api test route ([9aed7fe](https://github.com/Atinux/nuxt-auth-utils/commit/9aed7fe))
- Update deps in playground ([95c657f](https://github.com/Atinux/nuxt-auth-utils/commit/95c657f))
- **release:** V0.0.17 ([a814b58](https://github.com/Atinux/nuxt-auth-utils/commit/a814b58))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Gerben Mulder ([@Gerbuuun](http://github.com/Gerbuuun))

## v0.0.17

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.16...v0.0.17)

### 🩹 Fixes

- UserSession user type augmentation ([#54](https://github.com/Atinux/nuxt-auth-utils/pull/54))

### 🏡 Chore

- Update deps ([fdaa88c](https://github.com/Atinux/nuxt-auth-utils/commit/fdaa88c))
- Add api test route ([9aed7fe](https://github.com/Atinux/nuxt-auth-utils/commit/9aed7fe))
- Update deps in playground ([95c657f](https://github.com/Atinux/nuxt-auth-utils/commit/95c657f))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Gerben Mulder ([@Gerbuuun](http://github.com/Gerbuuun))

## v0.0.16

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.15...v0.0.16)

### 🚀 Enhancements

- Add replaceUserSession() ([#44](https://github.com/Atinux/nuxt-auth-utils/pull/44))

### 🩹 Fixes

- **google:** Remove `redirectUrl` type ([#52](https://github.com/Atinux/nuxt-auth-utils/pull/52))

### 🏡 Chore

- Better server types ([#51](https://github.com/Atinux/nuxt-auth-utils/pull/51))
- Update deps ([b930118](https://github.com/Atinux/nuxt-auth-utils/commit/b930118))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Maximilian Götz-Mikus ([@maximilianmikus](http://github.com/maximilianmikus))
- Harlan Wilton ([@harlan-zw](http://github.com/harlan-zw))

## v0.0.15

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.14...v0.0.15)

### 🚀 Enhancements

- Add auth0 connection parameter to config ([#39](https://github.com/Atinux/nuxt-auth-utils/pull/39))
- Added aws cognito provider ([#36](https://github.com/Atinux/nuxt-auth-utils/pull/36))

### 🩹 Fixes

- Replace encoded space characters with regular spaces ([#40](https://github.com/Atinux/nuxt-auth-utils/pull/40))

### 🏡 Chore

- Up deps ([a7bd06b](https://github.com/Atinux/nuxt-auth-utils/commit/a7bd06b))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Dvir Hazout <dvir@dazz.io>
- Silvio Eckl <silvio@whitespace.no>
- Ahmed Rangel ([@ahmedrangel](http://github.com/ahmedrangel))

## v0.0.14

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.13...v0.0.14)

### 🚀 Enhancements

- Added keycloak as oauth provider ([#23](https://github.com/Atinux/nuxt-auth-utils/pull/23))

### 🏡 Chore

- Test bundler module resolution ([#32](https://github.com/Atinux/nuxt-auth-utils/pull/32))
- Update deps ([9d6b258](https://github.com/Atinux/nuxt-auth-utils/commit/9d6b258))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Yue JIN 
- Daniel Roe <daniel@roe.dev>

## v0.0.13

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.12...v0.0.13)

### 🏡 Chore

- Rename session from verify to fetch ([10694e9](https://github.com/Atinux/nuxt-auth-utils/commit/10694e9))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.12

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.11...v0.0.12)

### 🩹 Fixes

- Correct arguments for hooks ([6e0193e](https://github.com/Atinux/nuxt-auth-utils/commit/6e0193e))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.11

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.10...v0.0.11)

### 🚀 Enhancements

- Add sessionHooks to extend user sessions ([c470319](https://github.com/Atinux/nuxt-auth-utils/commit/c470319))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.10

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.9...v0.0.10)

### 🚀 Enhancements

- Added linkedIn auth provider ([#13](https://github.com/Atinux/nuxt-auth-utils/pull/13))

### 🩹 Fixes

- Add audience to auth0 runtime config types ([#27](https://github.com/Atinux/nuxt-auth-utils/pull/27))

### 📖 Documentation

- Add LinkedIn in providers ([c9b9925](https://github.com/Atinux/nuxt-auth-utils/commit/c9b9925))

### 🏡 Chore

- Update deps ([bb3a510](https://github.com/Atinux/nuxt-auth-utils/commit/bb3a510))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- José Manuel Madriaza Caravia 
- H+ <serdar@justserdar.dev>

## v0.0.9

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.8...v0.0.9)

### 🚀 Enhancements

- Add max_age param for auth0 ([#26](https://github.com/Atinux/nuxt-auth-utils/pull/26))
- Added Microsoft as oauth provider ([#8](https://github.com/Atinux/nuxt-auth-utils/pull/8))

### ❤️ Contributors

- Jakub Frelik <j.frelik.it@outlook.com>
- Uģis ([@BerzinsU](http://github.com/BerzinsU))

## v0.0.8

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.7...v0.0.8)

### 🩹 Fixes

- Avoid infinite loop with latest Nuxt ([93b949d](https://github.com/Atinux/nuxt-auth-utils/commit/93b949d))

### 🏡 Chore

- **playground:** Better with right title ([97a3ad3](https://github.com/Atinux/nuxt-auth-utils/commit/97a3ad3))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.7

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.6...v0.0.7)

### 🩹 Fixes

- **oauth:** Add generic OAuthConfig type ([#18](https://github.com/Atinux/nuxt-auth-utils/pull/18))

### 📖 Documentation

- Use consistent reference to module ([13daa78](https://github.com/Atinux/nuxt-auth-utils/commit/13daa78))

### 🏡 Chore

- Add SameSite=lax ([1b296e2](https://github.com/Atinux/nuxt-auth-utils/commit/1b296e2))

### ❤️ Contributors

- Sigve Hansen ([@sifferhans](http://github.com/sifferhans))
- Daniel Roe <daniel@roe.dev>
- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.6

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.5...v0.0.6)

### 🚀 Enhancements

- Added discord auth provider ([#7](https://github.com/Atinux/nuxt-auth-utils/pull/7))
- Added oauth battle.net ([#11](https://github.com/Atinux/nuxt-auth-utils/pull/11))
- Refactor login buttons to use dropdown ([#14](https://github.com/Atinux/nuxt-auth-utils/pull/14))

### 🏡 Chore

- Update deps ([05f4a9c](https://github.com/Atinux/nuxt-auth-utils/commit/05f4a9c))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Arash 
- Samuel LEFEVRE 
- H+ <serdar@darweb.nl>

## v0.0.5

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.4...v0.0.5)

### 🚀 Enhancements

- Added google as oauth provider ([#3](https://github.com/Atinux/nuxt-auth-utils/pull/3))
- Added twitch as supported oauth provider ([#5](https://github.com/Atinux/nuxt-auth-utils/pull/5))
- Added auth0 as oauth provider ([#6](https://github.com/Atinux/nuxt-auth-utils/pull/6))

### 💅 Refactors

- Use `useSession` generic rather than assertion ([#4](https://github.com/Atinux/nuxt-auth-utils/pull/4))

### 📖 Documentation

- Add demo ([cbc8b7a](https://github.com/Atinux/nuxt-auth-utils/commit/cbc8b7a))

### 🏡 Chore

- **release:** V0.0.4 ([2bc6f9a](https://github.com/Atinux/nuxt-auth-utils/commit/2bc6f9a))

### ❤️ Contributors

- Antoine Lassier <toinousp@gmail.com>
- Gerben Mulder ([@Gerbuuun](http://github.com/Gerbuuun))
- Ahmed Rangel ([@ahmedrangel](http://github.com/ahmedrangel))
- Akshara Hegde <akshara.dt@gmail.com>
- Sébastien Chopin ([@Atinux](http://github.com/Atinux))
- Daniel Roe ([@danielroe](http://github.com/danielroe))

## v0.0.4

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.3...v0.0.4)

### 🩹 Fixes

- Use import presets ([f16ebc9](https://github.com/Atinux/nuxt-auth-utils/commit/f16ebc9))

### 🏡 Chore

- **release:** V0.0.3 ([9d1342c](https://github.com/Atinux/nuxt-auth-utils/commit/9d1342c))
- Add comment ([1923dcc](https://github.com/Atinux/nuxt-auth-utils/commit/1923dcc))

### ❤️ Contributors

- Daniel Roe ([@danielroe](http://github.com/danielroe))
- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.3

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.2...v0.0.3)

### 🚀 Enhancements

- Allow users to define custom session factory + types ([#2](https://github.com/Atinux/nuxt-auth-utils/pull/2))

### 🩹 Fixes

- Don't log warning about password when preparing types ([804057b](https://github.com/Atinux/nuxt-auth-utils/commit/804057b))
- Import useRuntimeConfig ([bdbb4b8](https://github.com/Atinux/nuxt-auth-utils/commit/bdbb4b8))

### 🏡 Chore

- Remove `.nuxtrc` ([3f96e97](https://github.com/Atinux/nuxt-auth-utils/commit/3f96e97))
- Add type testing script ([e9ffa5e](https://github.com/Atinux/nuxt-auth-utils/commit/e9ffa5e))
- Move playground into workspace ([bd8108c](https://github.com/Atinux/nuxt-auth-utils/commit/bd8108c))
- Add playground type test ([74f452c](https://github.com/Atinux/nuxt-auth-utils/commit/74f452c))

### 🤖 CI

- Run lint + test actions in ci ([f50c1b5](https://github.com/Atinux/nuxt-auth-utils/commit/f50c1b5))

### ❤️ Contributors

- Daniel Roe ([@danielroe](http://github.com/danielroe))
- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

## v0.0.2

[compare changes](https://github.com/Atinux/nuxt-auth-utils/compare/v0.0.1...v0.0.2)

## v0.0.1


### 🩹 Fixes

- Workaround for addServerImportsDir not working ([5a189df](https://github.com/Atinux/nuxt-auth-utils/commit/5a189df))

### 📖 Documentation

- Update readme ([06f1504](https://github.com/Atinux/nuxt-auth-utils/commit/06f1504))

### 🏡 Chore

- Init ([19caed2](https://github.com/Atinux/nuxt-auth-utils/commit/19caed2))
- Add runtime config ([9013484](https://github.com/Atinux/nuxt-auth-utils/commit/9013484))
- V0 ([18ea43a](https://github.com/Atinux/nuxt-auth-utils/commit/18ea43a))
- Init ([9b75953](https://github.com/Atinux/nuxt-auth-utils/commit/9b75953))

### ❤️ Contributors

- Sébastien Chopin ([@Atinux](http://github.com/Atinux))

