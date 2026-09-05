#!/bin/bash
# ============================================================
# MudahSewa SQLite Backup with Offsite Sync (Cloud Storage)
# Uses sqlite3 .backup for consistent snapshots of a live WAL DB.
# Retention: 30 days. Location: /www/backup/mudahsewa/db + Cloud
# ============================================================
set -euo pipefail

BACKUP_DIR="/www/backup/mudahsewa/db"
DATE=$(date +%Y%m%d_%H%M%S)
SOURCE="/www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db"
GOPAY_SESI="/www/wwwroot/gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json"
APP_ROOT="/www/wwwroot/dagdigdugdigicam.store"

# Create backup dir if missing
mkdir -p "${BACKUP_DIR}"

# Consistent online backup (safe while app is running with WAL)
sqlite3 "${SOURCE}" ".backup '${BACKUP_DIR}/mudahsewa_${DATE}.db'" || {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Database backup failed" >&2
    exit 1
}

# Compress
gzip "${BACKUP_DIR}/mudahsewa_${DATE}.db"

# Integrity check on the backup
if gzip -t "${BACKUP_DIR}/mudahsewa_${DATE}.db.gz" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: ${DATE} backup created ($(du -h "${BACKUP_DIR}/mudahsewa_${DATE}.db.gz" | cut -f1))"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL: ${DATE} backup corrupted" >&2
    exit 1
fi

# Also backup openwa.sqlite + gopay session state
OPENWA_DB="/www/wwwroot/openwa-server/data/openwa.sqlite"
if [ -f "${OPENWA_DB}" ]; then
    sqlite3 "${OPENWA_DB}" ".backup '${BACKUP_DIR}/openwa_${DATE}.db'" && gzip "${BACKUP_DIR}/openwa_${DATE}.db"
fi

if [ -f "${GOPAY_SESI}" ]; then
    cp "${GOPAY_SESI}" "${BACKUP_DIR}/gopay-sesi_${DATE}.json"
fi

# Back up storage folder (KTP, proofs, return photos)
STORAGE_DIR="${APP_ROOT}/storage"
if [ -d "${STORAGE_DIR}" ]; then
    tar -czf "${BACKUP_DIR}/storage_${DATE}.tar.gz" -C "${APP_ROOT}" storage
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Storage backed up: storage_${DATE}.tar.gz"
fi

# ROTATE OLD BACKUPS (keep 30 days)
find "${BACKUP_DIR}" -name "mudahsewa_*.db.gz" -mtime +30 -delete
find "${BACKUP_DIR}" -name "openwa_*.db.gz" -mtime +30 -delete
find "${BACKUP_DIR}" -name "storage_*.tar.gz" -mtime +30 -delete
find "${BACKUP_DIR}" -name "gopay-sesi_*.json" -mtime +30 -delete

# OFFSITE SYNC: Upload to Google Drive via rclone (configure once per server)
# Environment: RCLONE_CONFIG=gdrive type=drive client_id=... client_secret=... region=...
if command -v rclone &> /dev/null && [ -n "${RCLONE_CONFIG:-}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Syncing to cloud storage..."
    BUCKET_NAME="mudahsewa-backups"
    
    # Upload all backups from today
    rclone copy "${BACKUP_DIR}" "${RCLONE_CONFIG}:${BUCKET_NAME}/${DATE}" --progress --transfers=4 --checkers=8
    
    # Prune old cloud backups (>30 days)
    rclone delete "${RCLONE_CONFIG}:${BUCKET_NAME}/" --min-age 720h --exclude "*.bak" --include "/${DATE}/*" --dry-run
    
    if [ $? -eq 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Cloud sync completed successfully"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Cloud sync failed — check rclone config" >&2
        # Don't fail whole backup process
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  Skipping cloud sync (rclone not configured)"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local backup completed: ${BACKUP_DIR}"
