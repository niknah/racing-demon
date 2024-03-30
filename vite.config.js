import { viteStaticCopy } from 'vite-plugin-static-copy'

export default {
  base: "./",
  build: {
    outDir: "docs",
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'cardsJS/dist',
          dest: 'cardsJS'
        },
        {
          src: '_config.yml',
          dest: '.'
        }
      ]
    })
  ]
}
