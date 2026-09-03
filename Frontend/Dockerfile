# syntax=docker/dockerfile:1
# ============================================================
# Frontend React + Caddy (el "portero" del sistema).
#
# Etapa 1: compila el React a HTML/CSS/JS estatico.
# Etapa 2: mete ese resultado dentro de Caddy, que ademas hace de
#          reverse proxy hacia el backend Go y maneja el HTTPS.
# ============================================================

# ---------- Etapa 1: compilar el React ----------
FROM node:22-alpine AS build
WORKDIR /app

# npm ci se corre antes de copiar el codigo: mientras el package-lock
# no cambie, Docker reutiliza las dependencias ya bajadas.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# OJO: en Vite las variables se "hornean" en el momento del build,
# no se leen al arrancar. Por eso va como ARG y no como variable de
# entorno del contenedor.
#
# /api/v1 es una ruta RELATIVA a proposito: el navegador le pega al
# mismo dominio desde el que se descargo la pagina, y Caddy reenvia
# al backend. Asi la misma imagen sirve en tu MV y en el VPS, sin
# CORS y sin tener que recompilar al cambiar de dominio.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# ---------- Etapa 2: servir ----------
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
