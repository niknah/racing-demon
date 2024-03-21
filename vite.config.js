import { viteStaticCopy } from 'vite-plugin-static-copy'

export default {
  base: "./",
  build: {
    outDir: "docs",
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
