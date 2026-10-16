// Replaces Nuxt with the Nuxt 5 nightly (on the Nitro 3 nightly), without touching the lockfile:
// pnpm install --config.pnpmfile=scripts/nuxt-nightly.cjs --config.lockfile=false
const nightlies = {
  'nuxt': 'npm:nuxt-nightly@5x',
  '@nuxt/kit': 'npm:@nuxt/kit-nightly@5x',
  '@nuxt/schema': 'npm:@nuxt/schema-nightly@5x',
  'nitro': 'npm:nitro-nightly@latest',
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
