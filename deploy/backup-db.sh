#!/bin/bash
# ============================================================
# MudahSewa SQLite Backup Script (WAL-safe)
# Uses sqlite3 .backup for consistent snapshots of a live WAL DB.
# Retention: 30 days. Location: /www/backup/mudahsewa/db
# ============================================================
set -euo pipefail

BACKUP_DIR="/www/backup/mudahsewa/db"
DATE=$(date +%Y%m%d_%H%M%S)
SOURCE="/www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db"
DEST="${BACKUP_DIR}/mudahsewa_${DATE}.db"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

# Consistent online backup (safe while app is running with WAL)
sqlite3 "${SOURCE}" ".backup '${DEST}'"

# Compress
gzip "${DEST}"

# Integrity check on the backup
if gzip -t "${DEST}.gz" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: ${DEST}.gz ($(du -h "${DEST}.gz" | cut -f1))" >> "${LOG_FILE}"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL: ${DEST}.gz corrupted" >> "${LOG_FILE}"
    exit 1
fi

# Remove backups older than 30 days
find "${BACKUP_DIR}" -name "mudahsewa_*.db.gz" -mtime +30 -delete

# Also backup openwa.sqlite + gopay session state
OPENWA_DB="/www/wwwroot/openwa-server/data/openwa.sqlite"
if [ -f "${OPENWA_DB}" ]; then
    sqlite3 "${OPENWA_DB}" ".backup '${BACKUP_DIR}/openwa_${DATE}.db'" && gzip "${BACKUP_DIR}/openwa_${DATE}.db"
    find "${BACKUP_DIR}" -name "openwa_*.db.gz" -mtime +30 -delete
fi

GOPAY_SESI="/www/wwwroot/gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json"
if [ -f "${GOPAY_SESI}" ]; then
    cp "${GOPAY_SESI}" "${BACKUP_DIR}/gopay-sesi_${DATE}.json"
    find "${BACKUP_DIR}" -name "gopay-sesi_*.json" -mtime +30 -delete
fi

echo "Backup completed: ${DEST}.gz"
