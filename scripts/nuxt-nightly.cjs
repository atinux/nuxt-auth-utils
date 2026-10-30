// Replaces Nuxt with the Nuxt 5 nightly (on Nitro 3), without touching the lockfile:
// pnpm install --config.pnpmfile=scripts/nuxt-nightly.cjs --config.lockfile=false
const nightlies = {
  'nuxt': 'npm:nuxt-nightly@5x',
  '@nuxt/kit': 'npm:@nuxt/kit-nightly@5x',
  '@nuxt/schema': 'npm:@nuxt/schema-nightly@5x',
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
