#!/usr/bin/env bash
#
# Backup del ERP London Eye (corre EN EL VPS, por cron).
#
#   scripts/backup.sh db        -> solo la base      (diario)
#   scripts/backup.sh uploads   -> solo los archivos (semanal)
#   scripts/backup.sh           -> ambos             (manual)
#
# Por que un script y no tres lineas de crontab: con `pg_dump | gzip > file`,
# si pg_dump falla el gzip igual crea el archivo y el backup queda ROTO EN
# SILENCIO. Aca el dump se escribe a un temporal, se verifica, y recien
# entonces se mueve a su nombre final. Si algo falla, el backup de ayer sigue
# siendo el ultimo bueno y el script sale con codigo != 0 (cron lo reporta).
#
# Restauracion (probala una vez, un backup sin probar no es un backup):
#   gunzip -c /opt/backups/db-AAAA-MM-DD.sql.gz | \
#     docker compose exec -T db psql -U sge -d sge_restore_test
#
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/londoneye}"
DEST="${DEST:-/opt/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_USER="${DB_USER:-sge}"
DB_NAME="${DB_NAME:-sge}"
MODE="${1:-all}"

mkdir -p "$DEST"
LOG="$DEST/backup.log"

log()  { printf '%s  %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; printf '%s\n' "$*"; }
fail() { log "ERROR: $*"; exit 1; }

cd "$STACK_DIR" 2>/dev/null || fail "no existe $STACK_DIR"
STAMP="$(date +%F)"

backup_db() {
  local tmp="$DEST/.db-$STAMP.sql.gz.part" out="$DEST/db-$STAMP.sql.gz"

  # pipefail hace que un pg_dump fallido NO quede enmascarado por el exito del gzip.
  if ! docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" | gzip -9 > "$tmp"; then
    rm -f "$tmp"; fail "pg_dump fallo (base caida? credenciales?)"
  fi

  gzip -t "$tmp" 2>/dev/null || { rm -f "$tmp"; fail "el .gz quedo corrupto"; }

  # Un dump real arranca con el encabezado de pg_dump. Esto detecta el caso
  # clasico: el contenedor responde pero escupe un error en vez del dump.
  if ! gunzip -c "$tmp" | head -50 | grep -q 'PostgreSQL database dump'; then
    rm -f "$tmp"; fail "el archivo no parece un dump de Postgres"
  fi

  local size; size=$(wc -c < "$tmp")
  [ "$size" -gt 2048 ] || { rm -f "$tmp"; fail "dump sospechosamente chico ($size bytes)"; }

  mv -f "$tmp" "$out"   # recien aca pasa a ser "el backup del dia"
  log "base OK      -> $out ($size bytes)"
}

backup_uploads() {
  local src="$STACK_DIR/data/uploads"
  [ -d "$src" ] || { log "aviso: no existe $src, se omite"; return 0; }

  local tmp="$DEST/.uploads-$STAMP.tgz.part" out="$DEST/uploads-$STAMP.tgz"
  tar -czf "$tmp" -C "$STACK_DIR/data" uploads || { rm -f "$tmp"; fail "tar de uploads fallo"; }
  tar -tzf "$tmp" >/dev/null 2>&1 || { rm -f "$tmp"; fail "el .tgz quedo corrupto"; }

  mv -f "$tmp" "$out"
  log "uploads OK   -> $out ($(wc -c < "$out") bytes)"
}

case "$MODE" in
  db)      backup_db ;;
  uploads) backup_uploads ;;
  all)     backup_db; backup_uploads ;;
  *)       fail "modo invalido: $MODE (usar: db | uploads | all)" ;;
esac

# Retencion. Los .part son restos de corridas fallidas: se limpian al dia.
find "$DEST" -maxdepth 1 -name 'db-*.sql.gz'   -mtime +"$RETENTION_DAYS" -delete
find "$DEST" -maxdepth 1 -name 'uploads-*.tgz' -mtime +"$RETENTION_DAYS" -delete
find "$DEST" -maxdepth 1 -name '.*.part'       -mtime +1 -delete
