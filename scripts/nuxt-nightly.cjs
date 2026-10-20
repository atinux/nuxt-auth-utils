// Replaces Nuxt with the Nuxt 5 nightly (on a Nitro 3 nightly), without touching the lockfile:
// pnpm install --config.pnpmfile=scripts/nuxt-nightly.cjs --config.lockfile=false
const nightlies = {
  'nuxt': 'npm:nuxt-nightly@5x',
  '@nuxt/kit': 'npm:@nuxt/kit-nightly@5x',
  '@nuxt/schema': 'npm:@nuxt/schema-nightly@5x',
  // The Nitro beta that Nuxt depends on crashes the dev server when WebSockets are enabled,
  // and later Nitro nightlies don't serve the Nuxt pages, so pin the last nightly that works
  'nitro': 'npm:nitro-nightly@3.0.1-20261008-023340-cef53050',
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      for (const deps of [pkg.dependencies, pkg.devDependencies]) {
        for (const name in nightlies) {
          if (deps?.[name] && !deps[name].startsWith('npm:')) {
            deps[name] = nightlies[name]
          }
        }
      }
      return pkg
    },
  },
}
