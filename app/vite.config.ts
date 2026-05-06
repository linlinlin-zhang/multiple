import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const lowResourceBuild = process.env.VITE_LOW_RESOURCE_BUILD === "1";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: lowResourceBuild ? false : "esbuild",
    cssMinify: lowResourceBuild ? false : "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: lowResourceBuild ? 2048 : 500,
    rollupOptions: {
      input: {
        history: path.resolve(__dirname, "index.html"),
        share: path.resolve(__dirname, "share.html"),
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
