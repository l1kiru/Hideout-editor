import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import type { Plugin, ResolvedConfig } from 'vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Root of the hideout-editor mono-repo (parent of the frontend directory).
const repoRoot = path.resolve(__dirname, '..')

function parseEnvPort(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw == null || raw === '')
    return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : fallback
}

const backendHost = process.env.HIDEOUT_EDITOR_BACKEND_HOST || '127.0.0.1'
const backendPort = parseEnvPort('HIDEOUT_EDITOR_BACKEND_PORT', 8000)
const frontendPort = parseEnvPort('HIDEOUT_EDITOR_FRONTEND_PORT', 5173)
const apiProxyTarget
  = process.env.VITE_API_PROXY_TARGET || `http://${backendHost}:${backendPort}`

const INPUT_IMAGES_SUBDIR = path.join('input', 'images')
const INPUT_HIDEOUT_SUBDIR = path.join('input', 'hideout')

function listInputImageFilenames(imagesDir: string): string[] {
  if (!fs.existsSync(imagesDir))
    return []
  try {
    return fs.readdirSync(imagesDir).filter((n) => {
      const full = path.join(imagesDir, n)
      if (!fs.statSync(full).isFile())
        return false
      return /\.(png|jpe?g|jfif|webp|gif|svg)$/i.test(n)
    }).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }
  catch {
    return []
  }
}

function listInputHideoutFilenames(hideoutDir: string): string[] {
  if (!fs.existsSync(hideoutDir))
    return []
  try {
    return fs.readdirSync(hideoutDir).filter((n) => {
      const full = path.join(hideoutDir, n)
      if (!fs.statSync(full).isFile())
        return false
      return /\.hideout$/i.test(n)
    }).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }
  catch {
    return []
  }
}

// JSON, maps, scenes and input/images: served from dev middleware and copied to dist on build.
function repoDataFoldersPlugin(): Plugin {
  let config: ResolvedConfig

  function isInside(canonicalRoot: string, resolvedPath: string) {
    const rel = path.relative(canonicalRoot, resolvedPath)
    return Boolean(rel && !rel.startsWith('..') && !path.isAbsolute(rel))
  }

  function trySendStatic(absFile: string, res: { statusCode?: number; setHeader: (n: string, v: string) => void; end: (body?: Buffer) => void }) {
    try {
      if (!fs.existsSync(absFile) || !fs.statSync(absFile).isFile())
        return false
      const buf = fs.readFileSync(absFile)
      const ext = path.extname(absFile).toLowerCase()
      const ct
        = ext === '.json' ? 'application/json'
          : ext === '.svg' ? 'image/svg+xml'
          : ext === '.png' ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg' || ext === '.jfif' ? 'image/jpeg'
          : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
          : ext === '.txt' ? 'text/plain; charset=utf-8'
          : ext === '.hideout' ? 'application/octet-stream'
          : 'application/octet-stream'
      res.setHeader('Content-Type', ct)
      res.end(buf)
      return true
    }
    catch {
      return false
    }
  }

  function mount(repoSubdir: string, urlPrefix: string) {
    const canonicalRoot = path.join(repoRoot, repoSubdir)
    return (
      req: { method?: string | undefined; url?: string | undefined },
      res: { statusCode?: number; setHeader: (n: string, v: string) => void; end: (b?: Buffer) => void },
      next: () => void,
    ) => {
      const method = req.method ?? 'GET'
      if (method !== 'GET' && method !== 'HEAD')
        return next()

      let pathname: string
      try {
        pathname = new URL(req.url ?? '/', 'http://vite.local').pathname
      }
      catch {
        return next()
      }

      if (!pathname.startsWith(urlPrefix))
        return next()

      const relEncoded = pathname.slice(urlPrefix.length).replace(/^\/+/, '')
      const relDecoded = decodeURIComponent(relEncoded || '')
      const abs = path.resolve(canonicalRoot, relDecoded)

      if (!isInside(canonicalRoot, abs)) {
        res.statusCode = 400
        res.end()
        return
      }

      if (trySendStatic(abs, res))
        return

      res.statusCode = 404
      res.end()
    }
  }

  return {
    name: 'repo-hideout-map-scenes',
    configResolved(conf) {
      config = conf
    },
    configureServer(server) {
      const inputImagesRoot = path.join(repoRoot, INPUT_IMAGES_SUBDIR)
      const inputHideoutRoot = path.join(repoRoot, INPUT_HIDEOUT_SUBDIR)
      server.middlewares.use((
        req: { method?: string | undefined; url?: string | undefined },
        res: { statusCode?: number; setHeader: (n: string, v: string) => void; end: (b?: string | Buffer) => void },
        next: () => void,
      ) => {
        let pathname: string
        try {
          pathname = new URL(req.url ?? '/', 'http://vite.local').pathname
        }
        catch {
          return next()
        }
        if ((req.method ?? 'GET') !== 'GET')
          return next()
        if (pathname === '/input_images_index.json') {
          try {
            if (!fs.existsSync(inputImagesRoot))
              fs.mkdirSync(inputImagesRoot, { recursive: true })
            const names = listInputImageFilenames(inputImagesRoot)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(names))
          }
          catch {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end('[]')
          }
          return
        }
        if (pathname === '/input_hideout_index.json') {
          try {
            const names = listInputHideoutFilenames(inputHideoutRoot)
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(names))
          }
          catch {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end('[]')
          }
          return
        }
        return next()
      })
      server.middlewares.use(mount('hideout_map', '/hideout_map'))
      server.middlewares.use(mount('hideout_scenes', '/hideout_scenes'))
      server.middlewares.use(mount(INPUT_IMAGES_SUBDIR, '/input/images'))
      server.middlewares.use(mount(INPUT_HIDEOUT_SUBDIR, '/input/hideout'))
      server.middlewares.use(mount('config', '/config'))
    },
    closeBundle() {
      const outDir = path.resolve(config.root ?? __dirname, config.build.outDir)
      const mapSrc = path.join(repoRoot, 'hideout_map')
      const scenesSrc = path.join(repoRoot, 'hideout_scenes')
      const inputImgSrc = path.join(repoRoot, INPUT_IMAGES_SUBDIR)
      const inputHideoutSrc = path.join(repoRoot, INPUT_HIDEOUT_SUBDIR)
      const configSrc = path.join(repoRoot, 'config')
      if (fs.existsSync(mapSrc))
        fs.cpSync(mapSrc, path.join(outDir, 'hideout_map'), { recursive: true })
      if (fs.existsSync(scenesSrc))
        fs.cpSync(scenesSrc, path.join(outDir, 'hideout_scenes'), { recursive: true })
      if (fs.existsSync(inputImgSrc))
        fs.cpSync(inputImgSrc, path.join(outDir, INPUT_IMAGES_SUBDIR), { recursive: true })
      if (fs.existsSync(inputHideoutSrc))
        fs.cpSync(inputHideoutSrc, path.join(outDir, INPUT_HIDEOUT_SUBDIR), { recursive: true })
      if (fs.existsSync(configSrc))
        fs.cpSync(configSrc, path.join(outDir, 'config'), { recursive: true })
      const imagesIndexPayload = JSON.stringify(listInputImageFilenames(inputImgSrc))
      fs.writeFileSync(path.join(outDir, 'input_images_index.json'), imagesIndexPayload, 'utf-8')
      const hideoutIndexPayload = JSON.stringify(listInputHideoutFilenames(inputHideoutSrc))
      fs.writeFileSync(path.join(outDir, 'input_hideout_index.json'), hideoutIndexPayload, 'utf-8')
    },
  }
}

export default defineConfig({
  plugins: [react(), repoDataFoldersPlugin()],
  server: {
    port: frontendPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules'))
            return undefined
          if (
            id.includes('node_modules/react/')
            || id.includes('node_modules/react-dom/')
            || id.includes('node_modules/react-router')
            || id.includes('node_modules/scheduler/')
          ) {
            return 'react-vendor'
          }
          if (
            id.includes('node_modules/i18next')
            || id.includes('node_modules/react-i18next')
          ) {
            return 'i18n-vendor'
          }
          return undefined
        },
      },
    },
  },
})
