import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Lista de todos los archivos de la app para que el service worker los guarde y se pueda abrir sin cobertura
const assetList = () => ({
  name: 'mf-asset-list',
  generateBundle(_, bundle) {
    const files = Object.keys(bundle).filter((f) => f.startsWith('assets/'))
    this.emitFile({ type: 'asset', fileName: 'asset-list.json', source: JSON.stringify({ built: new Date().toISOString(), files }) })
  }
})

export default defineConfig({
  base: '/mercafamily/',
  plugins: [svelte(), assetList()],
  build: { target: 'es2022' }
})
