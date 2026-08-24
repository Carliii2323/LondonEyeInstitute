// generar-entrega.mjs — Volcado del código a un único .txt para entrega.
//
// Recorre el repo y concatena los archivos de código, cada uno precedido por
// un encabezado (Nombre del archivo / Ruta / Título). El título sale del
// comentario de cabecera del archivo (best-effort).
//
// Uso:  node generar-entrega.mjs
// Salida: Entrega-Codigo-Completo.txt (en la raíz del repo)
//
// Sin dependencias externas (solo Node fs/path).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.join(ROOT, 'Entrega-Codigo-Completo.txt')

// Raíces a recorrer, en orden. Se listan primero las de Backend y luego Frontend.
const INCLUDE_DIRS = ['Backend', 'Frontend/src']

// Archivos sueltos (fuera de las raíces de arriba) que igual se incluyen.
const INCLUDE_FILES = [
  'Frontend/index.html',
  'Frontend/package.json',
  'Frontend/vite.config.ts',
  'Frontend/tsconfig.json',
  'Frontend/tsconfig.app.json',
  'Frontend/tsconfig.node.json',
  'Frontend/tailwind.config.js',
  'Frontend/tailwind.config.ts',
  'Frontend/postcss.config.js',
  'generar-entrega.mjs',
]

// Extensiones de código que se incluyen.
const CODE_EXT = new Set([
  '.go', '.sql', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.html', '.json', '.yaml', '.yml',
])

// Basenames sin extensión que también se incluyen.
const CODE_BASENAMES = new Set(['Makefile', '.env.example'])

// Directorios que nunca se recorren.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.claude', 'dist', 'build', 'coverage', 'uploads',
  'Documentos', '.vscode', '.idea', 'tmp', 'bin',
])

// Subrutas (relativas al repo) que se excluyen puntualmente.
const SKIP_PATHS = new Set([
  'Backend/internal/db/sqlc', // código generado por sqlc (DO NOT EDIT)
])

// Archivos que se excluyen por nombre (lockfiles, secretos, generados).
function isExcludedFile(rel, base) {
  if (base === 'go.sum') return true
  if (base === 'package-lock.json' || base === 'pnpm-lock.yaml' || base === 'yarn.lock') return true
  if (base === '.mcp.json') return true
  if (base === '_ds_manifest.json') return true
  // .env y variantes (secretos), EXCEPTO .env.example
  if (base.startsWith('.env') && base !== '.env.example') return true
  if (rel === 'Entrega-Codigo-Completo.txt') return true
  return false
}

// ── recolección de archivos ───────────────────────────────────────────

/** @type {string[]} rutas relativas al repo */
const files = []

function walk(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const e of entries) {
    const full = path.join(dir, e.name)
    const rel = path.relative(ROOT, full).split(path.sep).join('/')
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      if (SKIP_PATHS.has(rel)) continue
      walk(full)
    } else if (e.isFile()) {
      if (isExcludedFile(rel, e.name)) continue
      const ext = path.extname(e.name)
      if (CODE_EXT.has(ext) || CODE_BASENAMES.has(e.name)) files.push(rel)
    }
  }
}

for (const d of INCLUDE_DIRS) {
  const abs = path.join(ROOT, d)
  if (fs.existsSync(abs)) walk(abs)
}
for (const f of INCLUDE_FILES) {
  const abs = path.join(ROOT, f)
  if (fs.existsSync(abs) && !files.includes(f)) files.push(f)
}

// ── extracción del título (comentario de cabecera) ─────────────────────

function commentPrefixesFor(rel) {
  const ext = path.extname(rel)
  const base = path.basename(rel)
  if (ext === '.sql') return ['--']
  if (['.go', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.css'].includes(ext)) return ['/*', '*/', '*', '//']
  if (['.yaml', '.yml'].includes(ext) || base === 'Makefile' || base === '.env.example') return ['#']
  return [] // json/html: sin título
}

function extractTitle(content, rel) {
  const prefixes = commentPrefixesFor(rel)
  if (prefixes.length === 0) return ''
  const lines = content.split(/\r?\n/).slice(0, 40)
  for (const raw of lines) {
    let line = raw.trim()
    if (!line) continue
    let isComment = false
    for (const p of prefixes) {
      if (line.startsWith(p)) { line = line.slice(p.length).trim(); isComment = true; break }
    }
    if (!isComment) continue
    // sacar corridas de bordes (===, ---, ***) y marcadores sueltos
    const stripped = line.replace(/[=*\-#\s]+$/g, '').replace(/^[=*\-#\s]+/g, '').trim()
    if (stripped.length < 3) continue
    // evitar tomar código como título
    if (/^(package|import|export|const|type|func|use\s|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/i.test(stripped)) continue
    return stripped
  }
  return ''
}

// ── armado del archivo de salida ───────────────────────────────────────

const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
const parts = []

parts.push('='.repeat(80))
parts.push('SGE LONDON EYE — VOLCADO DE CÓDIGO PARA ENTREGA')
parts.push(`Generado: ${now}`)
parts.push(`Archivos: ${files.length}`)
parts.push('Formato de cada bloque:  Archivo / Ruta / Título  +  contenido')
parts.push('Excluidos: node_modules, .git, dist, imágenes/binarios, lockfiles, .env,')
parts.push('           uploads/, Documentos/, y el código generado por sqlc.')
parts.push('='.repeat(80))
parts.push('')

let totalBytes = 0
for (const rel of files) {
  const abs = path.join(ROOT, rel)
  let content
  try {
    content = fs.readFileSync(abs, 'utf8')
  } catch {
    continue
  }
  totalBytes += Buffer.byteLength(content, 'utf8')
  const title = extractTitle(content, rel)

  parts.push('')
  parts.push('/'.repeat(80))
  parts.push(`Archivo: ${path.basename(rel)}`)
  parts.push(`Ruta:    ${rel}`)
  parts.push(`Título:  ${title || '(sin título)'}`)
  parts.push('/'.repeat(80))
  parts.push(content.replace(/\s+$/, ''))
  parts.push('')
}

// BOM UTF-8 + saltos CRLF: para que Windows (Bloc de notas / Excel / Word)
// muestre bien los acentos y símbolos. '﻿' es el BOM.
fs.writeFileSync(OUTPUT, '﻿' + parts.join('\r\n'), 'utf8')

console.log(`OK -> ${path.basename(OUTPUT)}`)
console.log(`   ${files.length} archivos, ${(totalBytes / 1024).toFixed(0)} KB de código`)
