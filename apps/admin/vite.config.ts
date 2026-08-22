import { readFileSync } from "node:fs"
import { fileURLToPath, URL } from "node:url"
import { parseEnv } from "node:util"

import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url))

function getApiUrl(): string {
  try {
    const environment = parseEnv(readFileSync(`${workspaceRoot}/.env`, "utf8"))
    return process.env.VITE_API_URL ?? environment.VITE_API_URL ?? "http://localhost:3000"
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return process.env.VITE_API_URL ?? "http://localhost:3000"
    }
    throw error
  }
}

export default defineConfig({
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(getApiUrl()),
  },
  envDir: false,
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      target: "react",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
  },
})
