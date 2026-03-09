import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/MassCalculatorSite/', // ★ GitHub 仓库名，区分大小写
})