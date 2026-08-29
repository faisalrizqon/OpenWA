#!/bin/bash

# Backup script untuk MudahSewa (SQLite DB + uploads)
# Jalankan via cron: 0 2 * * * /path/to/scripts/backup-db.sh >> /var/log/mudahsewa-backup.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
DATA_DIR="$PROJECT_ROOT/data"
UPLOADS_DIR="$PROJECT_ROOT/public/uploads"
BACKUP_ROOT="${BACKUP_ROOT:-/mnt/backup/mudahsewa}"

DATE=$(date +%Y%m%d)
DAY_OF_MONTH=$(date +%d)
HOUR=$(date +%H)

mkdir -p "$BACKUP_ROOT"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..."

# Backup database
if [ -f "$DATA_DIR/mudahsewa.db" ]; then
    BACKUP_DB="$BACKUP_ROOT/db-${DATE}.db"
    cp "$DATA_DIR/mudahsewa.db" "$BACKUP_DB"
    echo "Database backed up to $BACKUP_DB"
else
    echo "WARNING: Database file not found at $DATA_DIR/mudahsewa.db" >&2
fi

# Backup uploads
if [ -d "$UPLOADS_DIR" ]; then
    BACKUP_UPLOADS="$BACKUP_ROOT/uploads-${DATE}.tar.gz"
    tar -czf "$BACKUP_UPLOADS" -C "$PROJECT_ROOT/public" uploads --exclude="uploads/*/*.tmp" 2>/dev/null || true
    echo "Uploads backed up to $BACKUP_UPLOADS"
else
    echo "WARNING: Uploads directory not found at $UPLOADS_DIR" >&2
fi

# Rotate backups: keep 7 daily, 4 weekly (Sunday), 12 monthly
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotating old backups..."
find "$BACKUP_ROOT" -name "db-*.db" -mtime +7 ! -name "db-$(date +%Y%m%d).db" -delete
find "$BACKUP_ROOT" -name "uploads-*.tar.gz" -mtime +30 -delete

# Weekly rotation (every Sunday)
if [ "$DAY_OF_MONTH" = "01" ] || [ "$DAY_OF_MONTH" = "07" ] || [ "$DAY_OF_MONTH" = "14" ] || [ "$DAY_OF_MONTH" = "21" ] || [ "$DAY_OF_MONTH" = "28" ]; then
    # Keep last of each week
    find "$BACKUP_ROOT" -name "db-*.db" -mtime +7 ! -name "db-$(date +%Y%m%d).db" ! -name "db-[0-9][0-9]-[0-9][0-9][0-9].db" -exec mv {} {}.weekly.bak \; 2>/dev/null || true
fi

# Log success
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully."
